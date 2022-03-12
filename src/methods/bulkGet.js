const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { formatReadData, formatWriteData, formatKeySchemaKey } = require('../helpers/data');

module.exports = async function getBulkDocuments(keys) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.transactGetItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected keys argument to be less than 25 items'));

  keys.forEach((key, i) => {
    const { hash, range } = keySchema;
    key = keys[i] = formatKeySchemaKey.call(this, properties, keySchema, key);
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key #${i}`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key #${i}`));
  });

  if (keys.length) {
    const TransactItems = await Promise.all(keys.map(async key => {
      await formatWriteData.call(this, properties, key);
      return { Get: { TableName: tableName, Key: marshall(key) } };
    }));

    log.debug({ transactGetItems: { TransactItems } });
    const results = await client.transactGetItems({ TransactItems }).promise();
    log.debug({ transactGetItems: results });

    assert(results && Array.isArray(results.Responses), new Error('Expected responses to be an array'));

    let items = results.Responses.map(({ Item }) => Item ? unmarshall(Item) : null);

    items = await promiseMapAll(items, async item => {
      /* istanbul ignore else */
      if (item) {
        await formatReadData(properties, item);
      }
    });

    return items;
  } else {
    return [];
  }
};
