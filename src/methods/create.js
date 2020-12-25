const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps, formatCreateData } = require('../helpers/create');
const { validateData } = require('../helpers/validate');

module.exports = async function createDocument(create) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected argument to be a plain object'));

  const { hash, range } = keySchema;
  const { [hash]: hashProp, [range]: rangeProp } = properties;
  assert(hashProp.hasOwnProperty('default') || create.hasOwnProperty(hash),
    new Error(`Missing ${hash} hash property from argument`));
  assert(!range || rangeProp.hasOwnProperty('default') || create.hasOwnProperty(range),
    new Error(`Missing ${range} range property from argument`));

  await assertRequiredCreateProps.call(this, create);
  await appendCreateDefaultProps.call(this, create);
  await validateData.call(this, properties, create);
  await formatCreateData.call(this, properties, create);

  const params = {
    // Specify the name & item to be created
    TableName: tableName,
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
  const results = await client.putItem(params).promise();
  log.debug({ putItem: results });

  return create;
};
