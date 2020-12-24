const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatData } = require('../helpers/data');
const { validateData } = require('../helpers/validate');

module.exports = async function createDocument(create) {
  const { client, tableName: TableName, keySchema, properties, log, options } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof TableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(options), new TypeError('Expected options to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected argument to be a plain object'));

  const { hash, range } = keySchema;
  assert(create[hash], new Error(`Missing ${hash} property from argument`));
  assert(!range || create[range], new Error(`Missing ${range} property from argument`));

  await assertRequiredCreateProps.call(this, create);
  await appendCreateDefaultProps.call(this, create);
  await validateData.call(this, properties, create);
  await formatData.call(this, properties, create);

  if (options.createdAtTimestamp === true) {
    create.createdAt = Date.now();
  }
  if (options.updatedAtTimestamp === true) {
    create.updatedAt = Date.now();
  }

  const params = {
    // Specify the name & item to be created
    TableName,
    Item: marshall(create),
    // Specify a condition to ensure this doesn't write an item that already exists
    ConditionExpression: hash && range
      ? 'attribute_not_exists(#_hash_key) && attribute_not_exists(#_range_key)'
      : 'attribute_not_exists(#_hash_key)',
    ExpressionAttributeNames: hash && range
      ? { '#_hash_key': hash, '#_range_key': range }
      : { '#_hash_key': hash },
    // Reject all return values, since we have a complete copy of the object
    ReturnValues: 'NONE',
  };

  log.debug({ putItem: params });

  await client.putItem(params).promise();

  return create;
};
