const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { buildProjectionExpression } = require('../helpers/expressions');
const { formatReadData, formatWriteData } = require('../helpers/data');

module.exports = async function getDocument(key, opts) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.getItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(key), new TypeError('Expected argument to be a plain object'));
  assert(!opts || isPlainObject(opts), new TypeError('Expected opts to be a plain object'));
  opts = { ...opts };

  assert(opts.attributesToGet === undefined || (Array.isArray(opts.attributesToGet) && opts.attributesToGet.length),
    new TypeError('Expected opts.attributesToGet to be an array'));
  assert(opts.consistentRead === undefined || typeof opts.consistentRead === 'boolean',
    new TypeError('Expected opts.consistentRead to be a boolean'));

  const { hash, range } = keySchema;
  assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from argument`));
  assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from argument`));
  await formatWriteData(properties, key);

  const projected = opts.attributesToGet ? buildProjectionExpression(properties, opts.attributesToGet) : {};

  const params = {
    TableName: tableName,
    Key: marshall(key),
    ProjectionExpression: projected.expression || undefined,
    ExpressionAttributeNames: projected.expression ? { ...projected.names } : undefined,
    ConsistentRead: opts.consistentRead,
  };

  log.debug({ getItem: params });
  const result = await client.getItem(params).promise();
  log.debug({ getItem: result });

  const item = result && isPlainObject(result.Item) ? unmarshall(result.Item) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(key),
  });

  await formatReadData(properties, item);
  return item;
};
