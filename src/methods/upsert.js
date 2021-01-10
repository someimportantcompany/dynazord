const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { buildUpsertExpression } = require('../helpers/expressions');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

module.exports = async function upsertDocument(item, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.updateItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(item), new TypeError('Expected upsert argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  const specifiedUpsertKeys = Object.keys(item);

  await assertRequiredCreateProps.call(this, properties, item);
  await appendCreateDefaultProps.call(this, properties, item);

  await hooks.emit('beforeValidateUpsert', this, opts.hooks === true, item, opts);
  await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
  await validateData.call(this, properties, item).catch(async err => {
    await hooks.emit('validateUpsertFailed', this, opts.hooks === true, item, err, opts);
    await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
    throw err;
  });
  await hooks.emit('afterValidateUpsert', this, opts.hooks === true, item, opts);
  await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);

  const { hash, range } = keySchema;
  const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = item;
  const key = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

  await hooks.emit('beforeUpsert', this, opts.hooks === true, upsertValues, opts);
  await formatWriteData.call(this, properties, upsertValues, { fieldHook: 'onUpsert' });
  await hooks.emit('beforeUpsertWrite', this, opts.hooks === true, upsertValues, opts);

  await formatWriteData.call(this, properties, key);

  const { expression, names, values } = buildUpsertExpression.call(this, upsertValues, specifiedUpsertKeys) || {};
  assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
  assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
  assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

  const params = {
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: expression,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: marshall(values),
    ReturnValues: 'ALL_NEW',
  };

  log.debug({ updateItem: params });
  const result = await client.updateItem(params).promise();
  log.debug({ updateItem: result });

  item = result && isPlainObject(result.Attributes) ? unmarshall(result.Attributes) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(key),
  });

  await hooks.emit('afterUpsertWrite', this, opts.hooks === true, item, opts);
  await formatReadData.call(this, properties, item);
  await hooks.emit('afterUpsert', this, opts.hooks === true, item, opts);
  return item;
};
