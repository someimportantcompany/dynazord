const { assert, isPlainObject, unmarshall } = require('../utils');
const { formatReadData, marshallKey } = require('../helpers/data');

module.exports = async function getDocument(where, opts) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.getItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(where), new TypeError('Expected argument to be a plain object'));
  assert(!opts || isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  const {
    attributesToGet = undefined,
    consistentRead = undefined,
  } = opts || {};
  assert(attributesToGet === undefined || (Array.isArray(attributesToGet) && attributesToGet.length),
    new TypeError('Expected attributesToGet to be an array'));
  assert(consistentRead === undefined || typeof consistentRead === 'boolean',
    new TypeError('Expected consistentRead to be a boolean'));

  const { hash, range } = keySchema;
  assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from argument`));
  assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from argument`));

  const Key = await marshallKey(properties, where);

  const params = {
    TableName: tableName,
    Key,
    AttributesToGet: attributesToGet,
    ConsistentRead: consistentRead,
  };

  log.debug({ getItem: params });
  const result = await client.getItem(params).promise();
  log.debug({ getItem: result });

  const item = result && isPlainObject(result.Item) ? unmarshall(result.Item) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(where),
  });

  await formatReadData(properties, item);
  return item;
};
