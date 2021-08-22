const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { formatReadData, formatWriteData } = require('../helpers/data');

module.exports = async function updateProperty(update) {
  const { tableName, keySchema, properties, client, log } = this;
  assert(client && typeof client.updateItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(update), new TypeError('Expected update arg to be a plain object'));

  const { key, expression, expressionAttributeNames: names, expressionAttributeValues: values } = update;
  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(typeof expression === 'string' && expression.length, new TypeError('Expected expression to be a string'));
  assert(!names || isPlainObject(names), new TypeError('Expected expressionAttributeNames to be a plain object'));
  assert(!values || isPlainObject(values), new TypeError('Expected expressionAttributeValues to be a plain object'));

  const { hash, range } = keySchema;
  assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
  assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

  await formatWriteData(properties, key);

  const params = {
    TableName: tableName,
    Key: marshall(key),
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
    ReturnValues: 'UPDATED_NEW', // Return only the updated attributes
  };

  log.debug({ updateItem: params });
  const result = await client.updateItem(params).promise();
  log.debug({ updateItem: result });

  const item = result && isPlainObject(result.Item) ? unmarshall(result.Item) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(key),
  });

  await formatReadData(properties, item);
  return item;
};
