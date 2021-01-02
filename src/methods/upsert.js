const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, marshallKey, validateData } = require('../helpers/data');
const { stringifyUpsertStatement } = require('../helpers/upsert');

const DEFAULT_OPTS = {
  hooks: true,
};

module.exports = async function upsertDocument(upsert, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.updateItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(upsert), new TypeError('Expected update argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { ...DEFAULT_OPTS, ...opts };

  const { hash, range } = keySchema;
  const { [hash]: hashProp, [range]: rangeProp } = properties;
  assert(hashProp.hasOwnProperty('default') || upsert.hasOwnProperty(hash),
    new Error(`Missing ${hash} hash property from argument`));
  assert(!range || rangeProp.hasOwnProperty('default') || upsert.hasOwnProperty(range),
    new Error(`Missing ${range} range property from argument`));

  const specifiedUpsertKeys = Object.keys(upsert);

  await assertRequiredCreateProps.call(this, properties, upsert);
  await appendCreateDefaultProps.call(this, properties, upsert);

  try {
    await hooks.emit('beforeValidateUpsert', this, opts.hooks === true, upsert, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, upsert, opts);
    await validateData.call(this, properties, upsert).catch(async err => {
      await hooks.emit('validateUpsertFailed', this, opts.hooks === true, upsert, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, upsert, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateUpsert', this, opts.hooks === true, upsert, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, upsert, opts);
  } catch (err) {
    err.name = 'ValidationError';
    err.message = `[${tableName}] ${err.message}`;
    throw err;
  }

  await hooks.emit('beforeUpsert', this, opts.hooks === true, upsert, opts);
  await formatWriteData.call(this, properties, upsert, { fieldHook: 'onUpsert' });
  await hooks.emit('beforeUpsertWrite', this, opts.hooks === true, upsert, opts);

  const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = upsert;
  const where = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

  const { expression, names, values } = stringifyUpsertStatement.call(this, upsertValues, specifiedUpsertKeys) || {};
  assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
  assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
  assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

  const params = {
    TableName: tableName,
    Key: await marshallKey(properties, where),
    UpdateExpression: expression,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: marshall(values),
    ReturnValues: 'ALL_NEW', // Return all the attributes
  };

  log.debug({ updateItem: params });
  const result = await client.updateItem(params).promise();
  log.debug({ updateItem: result });

  const item = result && isPlainObject(result.Attributes) ? unmarshall(result.Attributes) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(where),
  });

  await hooks.emit('afterUpsertWrite', this, opts.hooks === true, item, opts);
  await formatReadData.call(this, properties, item);
  await hooks.emit('afterUpsert', this, opts.hooks === true, item, opts);
  return item;
};
