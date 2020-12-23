const { assert, isPlainObject, marshall } = require('../utils');
const { assertValidCreateProperties, appendCreateDefaultProps } = require('../helpers/create');
/* eslint-disable no-invalid-this */

async function createTransaction(create) {
  const { tableName: TableName, keySchema, options } = this;
  assert(typeof TableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(options), new TypeError('Expected options to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected argument to be a plain object'));

  const { hash, range } = keySchema;
  assert(create[hash], new Error(`Missing ${hash} property from argument`));
  assert(!range || create[range], new Error(`Missing ${range} property from argument`));

  await assertValidCreateProperties.call(this, create);
  await appendCreateDefaultProps.call(this, create);

  if (options.createdAtTimestamp === true) {
    create.createdAt = Date.now();
  }
  if (options.updatedAtTimestamp === true) {
    create.updatedAt = Date.now();
  }

  return {
    Put: {
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
    },
  };
}

module.exports = {
  create: createTransaction,
};
