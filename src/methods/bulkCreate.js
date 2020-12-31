const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

module.exports = async function createBulkDocuments(bulk) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(bulk), new Error('Expected argument to be an array'));
  assert(bulk.length <= 25, new Error('Expected bulk argument to be less than 25 items'));

  bulk = await Promise.all(bulk.map(async create => {
    const { hash, range } = keySchema;
    const { [hash]: hashProp, [range]: rangeProp } = properties;
    assert(hashProp.hasOwnProperty('default') || create.hasOwnProperty(hash),
      new Error(`Missing ${hash} hash property from argument`));
    assert(!range || rangeProp.hasOwnProperty('default') || create.hasOwnProperty(range),
      new Error(`Missing ${range} range property from argument`));

    await assertRequiredCreateProps.call(this, properties, create);
    await appendCreateDefaultProps.call(this, properties, create);
    await validateData.call(this, properties, create);
    await formatWriteData.call(this, properties, create, { fieldHook: 'onCreate' });

    return create;
  }));

  if (bulk.length) {
    const { hash, range } = keySchema;
    const params = {
      TransactItems: bulk.map(create => ({
        Put: {
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
          ReturnValuesOnConditionCheckFailure: 'NONE',
        },
      })),
    };

    log.debug({ transactWriteItems: params });
    const results = await client.transactWriteItems(params).promise();
    log.debug({ transactWriteItems: results });
  }

  bulk = await Promise.all(bulk.map(async create => {
    await formatReadData.call(this, properties, create);
    return create;
  }));

  return bulk;
};
