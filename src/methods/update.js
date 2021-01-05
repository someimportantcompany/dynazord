const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { assertRequiredUpdateProps, stringifyUpdateStatement } = require('../helpers/update');
const { formatReadData, formatWriteData, marshallKey, validateData } = require('../helpers/data');

module.exports = async function updateDocument(update, where, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.updateItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(update), new TypeError('Expected update to be a plain object'));
  assert(isPlainObject(where), new TypeError('Expected where to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  const { hash, range } = keySchema;
  assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where`));
  assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where`));

  await assertRequiredUpdateProps.call(this, properties, update);

  await hooks.emit('beforeValidateUpdate', this, opts.hooks === true, update, opts);
  await hooks.emit('beforeValidate', this, opts.hooks === true, update, opts);
  await validateData.call(this, properties, update).catch(async err => {
    await hooks.emit('validateUpdateFailed', this, opts.hooks === true, update, err, opts);
    await hooks.emit('validateFailed', this, opts.hooks === true, update, err, opts);
    throw err;
  });
  await hooks.emit('afterValidateUpdate', this, opts.hooks === true, update, opts);
  await hooks.emit('afterValidate', this, opts.hooks === true, update, opts);

  await hooks.emit('beforeUpdate', this, opts.hooks === true, update, opts);
  await formatWriteData.call(this, properties, update, { fieldHook: 'onUpdate' });
  await hooks.emit('beforeUpdateWrite', this, opts.hooks === true, update, opts);

  const { expression, names, values } = stringifyUpdateStatement.call(this, update) || {};
  assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
  assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
  assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

  const params = {
    TableName: tableName,
    Key: await marshallKey(properties, where),
    ConditionExpression: hash && range
      ? 'attribute_exists(#_hash_key) AND attribute_exists(#_range_key)'
      : 'attribute_exists(#_hash_key)',
    UpdateExpression: expression,
    ExpressionAttributeNames: {
      ...(hash && range
        ? { '#_hash_key': hash, '#_range_key': range }
        : { '#_hash_key': hash }),
      ...names,
    },
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

  await hooks.emit('afterUpdateWrite', this, opts.hooks === true, item, opts);
  await formatReadData.call(this, properties, item);
  await hooks.emit('afterUpdate', this, opts.hooks === true, item, opts);

  return item;
};
