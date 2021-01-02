const { assert, isPlainObject } = require('../utils');
const { marshallKey } = require('../helpers/data');

module.exports = async function deleteBulkDocuments(keys) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected argument array to be less than 25 items'));

  keys.forEach((where, i) => {
    const { hash, range } = keySchema;
    assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where #${i}`));
    assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where #${i}`));
  });

  if (keys.length) {
    const TransactItems = await Promise.all(keys.map(async where => {
      const Key = await marshallKey(where);
      return {
        Delete: {
          TableName: tableName,
          Key,
          ReturnValuesOnConditionCheckFailure: 'NONE',
        }
      };
    }));

    log.debug({ transactWriteItems: { TransactItems } });
    const results = await client.transactWriteItems({ TransactItems }).promise();
    log.debug({ transactWriteItems: results });
  }

  return true;
};
