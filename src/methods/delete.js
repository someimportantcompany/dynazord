const { assert, isPlainObject } = require('../utils');
const { marshallKey } = require('../helpers/data');

const DEFAULT_OPTS = {
  hooks: true,
};

module.exports = async function deleteDocument(key, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.deleteItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { ...DEFAULT_OPTS, ...opts };

  const { hash, range } = keySchema;
  assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
  assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

  await hooks.emit('beforeDelete', opts.hooks === true, key, opts);

  const params = {
    TableName: tableName,
    Key: await marshallKey(properties, key),
    ReturnValues: 'NONE',
  };

  log.debug({ deleteItem: params });
  const result = await client.deleteItem(params).promise();
  log.debug({ deleteItem: result });

  await hooks.emit('afterDelete', opts.hooks === true, key, opts);

  return Boolean(result);
};
