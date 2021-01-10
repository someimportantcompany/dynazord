const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { buildFilterExpression, buildProjectionExpression } = require('../helpers/expressions');
const { formatReadData } = require('../helpers/data');

module.exports = async function findDocument(where, opts = undefined) {
  const { client, tableName, keySchema, secondaryIndexes, properties, log } = this;
  assert(client && typeof client.scan === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(where), new TypeError('Expected argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts to be a plain object'));
  opts = { ...opts };

  assert(opts.attributesToGet === undefined || (Array.isArray(opts.attributesToGet) && opts.attributesToGet.length),
    new TypeError('Expected opts.attributesToGet to be an array'));
  assert(opts.filter === undefined || isPlainObject(opts.filter),
    new TypeError('Expected opts.filter to be a plain object'));
  assert(opts.consistentRead === undefined || typeof opts.consistentRead === 'boolean',
    new TypeError('Expected opts.consistentRead to be a boolean'));
  assert(opts.indexName === undefined || typeof opts.indexName === 'string',
    new TypeError('Expected opts.indexName to be a string'));
  assert(opts.exclusiveStartKey === undefined || isPlainObject(opts.exclusiveStartKey),
    new TypeError('Expected opts.exclusiveStartKey to be a plain object'));
  assert(opts.limit === undefined || typeof opts.limit === 'number',
    new TypeError('Expected opts.limit to be a string'));
  assert(opts.select === undefined || typeof opts.select === 'string',
    new TypeError('Expected opts.select to be a string'));
  assert(opts.select !== 'ALL_PROJECTED_ATTRIBUTES' || opts.indexName,
    new TypeError('opts.select can only be ALL_PROJECTED_ATTRIBUTES if indexName is set'));
  assert(opts.attributesToGet === undefined || opts.select === 'SPECIFIC_ATTRIBUTES',
    new TypeError('Cannot use attributesToGet with select'));

  assert(!opts.indexName || (secondaryIndexes && isPlainObject(secondaryIndexes[opts.indexName])),
    new Error(`Unknown secondary index ${opts.indexName}`));

  const filters = (await buildFilterExpression(properties, where)) || {};
  const projected = opts.attributesToGet ? buildProjectionExpression(properties, opts.attributesToGet) : {};

  const params = {
    TableName: tableName,
    IndexName: opts.indexName || undefined,
    FilterExpression: filters.expression || undefined,
    ProjectionExpression: projected.expression || undefined,
    ExpressionAttributeNames: { ...filters.names, ...projected.names },
    ExpressionAttributeValues: marshall({ ...filters.values }),
    ExclusiveStartKey: opts.exclusiveStartKey ? marshall(opts.exclusiveStartKey) : undefined,
    ConsistentRead: opts.consistentRead || undefined,
    Limit: opts.limit || undefined,
  };

  log.debug({ scan: params });
  const result = await client.scan(params).promise();
  log.debug({ scan: result });

  assert(result && Array.isArray(result.Items), new Error('Expected scan to return an array of Items'));

  let items = result.Items.map(item => unmarshall(item));
  items = promiseMapAll(items, item => formatReadData(properties, item));

  Object.defineProperties(items, {
    count: {
      enumerable: true,
      value: result.Count || 0,
    },
    scannedCount: {
      enumerable: true,
      value: result.ScannedCount || 0,
    },
    lastEvaluatedKey: {
      enumerable: true,
      value: result.LastEvaluatedKey ? unmarshall(result.LastEvaluatedKey) : undefined,
    },
  });

  return items;
};
