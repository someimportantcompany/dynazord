const { assert, isPlainObject, marshall } = require('../utils');
const { formatWriteData, formatKeySchemaKey } = require('../helpers/data');

module.exports = async function deleteDocument(key, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.deleteItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  const { hash, range } = keySchema;
  key = formatKeySchemaKey.call(this, properties, keySchema, key);
  assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
  assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

  await hooks.emit('beforeDelete', this, opts.hooks === true, key, opts);

  await formatWriteData(properties, key);

  const params = {
    TableName: tableName,
    Key: marshall(key),
    ReturnValues: 'NONE',
  };

  log.debug({ deleteItem: params });
  const result = await client.deleteItem(params).promise();
  log.debug({ deleteItem: result });

  await hooks.emit('afterDelete', this, opts.hooks === true, key, opts);

  return Boolean(result);
};
