const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { buildFilterExpression, buildProjectionExpression } = require('../helpers/where');
const { formatReadData } = require('../helpers/data');

module.exports = async function findDocument(where, opts) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.scan === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(where), new TypeError('Expected argument to be a plain object'));
  assert(!opts || isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  const {
    attributesToGet = undefined,
    consistentRead = true,
  } = opts || {};
  assert(attributesToGet === undefined || (Array.isArray(attributesToGet) && attributesToGet.length),
    new TypeError('Expected attributesToGet to be an array'));
  assert(consistentRead === undefined || typeof consistentRead === 'boolean',
    new TypeError('Expected consistentRead to be a boolean'));

  const filters = (await buildFilterExpression(properties, where)) || {};
  const projected = attributesToGet ? buildProjectionExpression(attributesToGet) : {};

  const params = {
    TableName: tableName,
    FilterExpression: filters.expression || undefined,
    ExpressionAttributeNames: { ...filters.names, ...projected.names },
    ExpressionAttributeValues: marshall({ ...filters.values, ...projected.values }),
    AttributesToGet: attributesToGet,
    ConsistentRead: consistentRead,
  };

  log.debug({ scan: params });
  const result = await client.scan(params).promise();
  log.debug({ scan: result });

  assert(result && Array.isArray(result.Items), new Error('Expected scan to return an array of Items'));

  let items = result.Items.map(item => unmarshall(item));
  items = promiseMapAll(items, item => formatReadData(properties, item));
  return items;
};
