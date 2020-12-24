const { assert, isPlainObject, marshall } = require('../utils');

module.exports = async function deleteDocument(where) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.deleteItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(where), new TypeError('Expected where to be a plain object'));

  const { hash, range } = keySchema;
  assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where`));
  assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where`));

  const params = {
    TableName: tableName,
    Key: marshall(where),
    ReturnValues: 'NONE',
  };

  log.debug({ deleteItem: params });
  const result = await client.deleteItem(params).promise();
  log.debug({ deleteItem: result });

  return Boolean(result);
};
