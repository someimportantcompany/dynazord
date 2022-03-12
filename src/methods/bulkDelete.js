const { assert, isPlainObject, marshall } = require('../utils');
const { formatWriteData, formatKeySchemaKey } = require('../helpers/data');

module.exports = async function deleteBulkDocuments(keys, opts) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected argument array to be less than 25 items'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { bulkHooks: true, hooks: false, ...opts };

  keys.forEach((key, i) => {
    const { hash, range } = keySchema;
    key = keys[i] = formatKeySchemaKey.call(this, properties, keySchema, key);
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key #${i}`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key #${i}`));
  });

  if (keys.length) {
    await hooks.emit('beforeBulkDelete', this, opts.bulkHooks === true, keys, opts);

    const TransactItems = await Promise.all(keys.map(async key => {
      await formatWriteData.call(this, properties, key);
      return {
        Delete: {
          TableName: tableName,
          Key: marshall(key),
          ReturnValuesOnConditionCheckFailure: 'NONE',
        }
      };
    }));

    log.debug({ transactWriteItems: { TransactItems } });
    const results = await client.transactWriteItems({ TransactItems }).promise();
    log.debug({ transactWriteItems: results });

    await hooks.emit('afterBulkDelete', this, opts.bulkHooks === true, keys, opts);
  }

  return true;
};
