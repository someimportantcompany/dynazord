const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { buildFilterExpression, buildKeyExpression, buildProjectionExpression } = require('../helpers/expressions');
const { formatReadData, formatKeySchemaKey } = require('../helpers/data');

module.exports = async function findDocument(where, opts = undefined) {
  const { client, tableName, keySchema, secondaryIndexes, properties, log } = this;
  assert(client && typeof client.scan === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(!secondaryIndexes || isPlainObject(secondaryIndexes), new TypeError('Expected secondaryIndexes to be a plain object'));

  assert(isPlainObject(where), new TypeError('Expected argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts to be a plain object'));
  opts = { ...opts };

  assert(opts.attributesToGet === undefined || (Array.isArray(opts.attributesToGet) && opts.attributesToGet.length),
    new TypeError('Expected opts.attributesToGet to be an array'));
  assert(opts.consistentRead === undefined || typeof opts.consistentRead === 'boolean',
    new TypeError('Expected opts.consistentRead to be a boolean'));
  assert(opts.exclusiveStartKey === undefined || isPlainObject(opts.exclusiveStartKey),
    new TypeError('Expected opts.exclusiveStartKey to be a plain object'));
  assert(opts.filter === undefined || isPlainObject(opts.filter),
    new TypeError('Expected opts.filter to be a plain object'));
  assert(opts.indexName === undefined || typeof opts.indexName === 'string',
    new TypeError('Expected opts.indexName to be a string'));
  assert(opts.limit === undefined || typeof opts.limit === 'number',
    new TypeError('Expected opts.limit to be a string'));
  assert(opts.scanIndexForward === undefined || typeof opts.scanIndexForward === 'boolean',
    new TypeError('Expected opts.scanIndexForward to be a boolean'));
  assert(opts.select === undefined || typeof opts.select === 'string',
    new TypeError('Expected opts.select to be a string'));

  assert(!opts.indexName || (secondaryIndexes && isPlainObject(secondaryIndexes[opts.indexName])),
    new Error(`Unknown secondary index ${opts.indexName}`));
  assert(opts.select !== 'ALL_PROJECTED_ATTRIBUTES' || opts.indexName,
    new TypeError('opts.select can only be ALL_PROJECTED_ATTRIBUTES if indexName is set'));
  assert(opts.attributesToGet === undefined || opts.select === 'SPECIFIC_ATTRIBUTES',
    new TypeError('Cannot use attributesToGet with select'));

  // const { hash, range } = opts.indexName ? secondaryIndexes[opts.indexName] : keySchema;
  // assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from argument`));
  // assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from argument`));

  where = formatKeySchemaKey.call(this, properties, opts.indexName ? secondaryIndexes[opts.indexName] : keySchema, where);
  const keyCondition = (await buildKeyExpression(properties, where)) || {};
  const filter = (opts.filter && (await buildFilterExpression(properties, opts.filter))) || {};
  const projected = opts.attributesToGet ? buildProjectionExpression(opts.attributesToGet) : {};

  const params = {
    TableName: tableName,
    IndexName: opts.indexName,
    KeyConditionExpression: keyCondition.expression || undefined,
    FilterExpression: filter.expression || undefined,
    ProjectionExpression: projected.expression || undefined,
    ExclusiveStartKey: opts.exclusiveStartKey ? marshall(opts.exclusiveStartKey) : undefined,
    Limit: opts.limit || undefined,
    Select: opts.select,
    ExpressionAttributeNames: (keyCondition.expression || filter.expression || projected.expression)
      ? { ...keyCondition.names, ...filter.names, ...projected.names }
      : undefined,
    ExpressionAttributeValues: (keyCondition.expression || filter.expression)
      ? marshall({ ...keyCondition.values, ...filter.values })
      : undefined,
    ConsistentRead: opts.consistentRead,
    ScanIndexForward: opts.scanIndexForward,
  };

  log.debug({ query: params });
  const result = await client.query(params).promise();
  log.debug({ query: result });

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
