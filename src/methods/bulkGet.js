const { assert, isPlainObject, unmarshall } = require('../utils');
const { formatReadData, marshallKey } = require('../helpers/data');

module.exports = async function getBulkDocuments(keys) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.transactGetItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected keys argument to be less than 25 items'));

  keys.forEach((where, i) => {
    const { hash, range } = keySchema;
    assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where #${i}`));
    assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where #${i}`));
  });

  if (keys.length) {
    const TransactItems = await Promise.all(keys.map(async where => {
      const Key = await marshallKey(properties, where);
      return { Get: { TableName: tableName, Key } };
    }));

    log.debug({ transactGetItems: { TransactItems } });
    const results = await client.transactGetItems({ TransactItems }).promise();
    log.debug({ transactGetItems: results });

    return results && Array.isArray(results.Responses) ? Promise.all(results.Responses.map(async ({ Item }) => {
      if (Item) {
        Item = unmarshall(Item);
        await formatReadData(properties, Item);
        return Item;
      } else {
        return null;
      }
    })) : [];
  } else {
    return [];
  }
};
