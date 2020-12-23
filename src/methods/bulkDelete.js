const { assert } = require('../utils');

module.exports = function bulkDelete(keys) {
  const { client, tableName } = this;
  assert(client && typeof client.batchWrite === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(Array.isArray(keys), new TypeError('Expected keys to be an array'));

  const RequestItems = {
    [tableName]: keys.map(Key => ({ DeleteRequest: { Key } })),
  };

  return client.batchWrite({ RequestItems }).promise().then(function onResult(res) {
    if (res.UnprocessedItems && res.UnprocessedItems.length) {
      return client.batchWrite(res.UnprocessedItems).promise().then(onResult);
    }
  });
};
