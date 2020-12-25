const { assert, isPlainObject, marshall } = require('../utils');

module.exports = async function deleteBulkDocuments(bulk) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(bulk), new Error('Expected argument to be an array'));
  assert(bulk.length <= 25, new Error('Expected bulk argument to be less than 25 items'));

  bulk.forEach((where, i) => {
    const { hash, range } = keySchema;
    assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where #${i}`));
    assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where #${i}`));
  });

  if (bulk.length) {
    const params = {
      TransactItems: bulk.map(where => ({
        Delete: {
          TableName: tableName,
          Key: marshall(where),
          ReturnValuesOnConditionCheckFailure: 'NONE',
        },
      })),
    };

    log.debug({ transactWriteItems: params });
    const results = await client.transactWriteItems(params).promise();
    log.debug({ transactWriteItems: results });
  }

  return true;
};
