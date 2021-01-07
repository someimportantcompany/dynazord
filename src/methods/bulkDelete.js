const { assert, isPlainObject, marshall } = require('../utils');
const { formatWriteData } = require('../helpers/data');

const DEFAULT_OPTS = {
  bulkHooks: true,
  hooks: false,
};

module.exports = async function deleteBulkDocuments(keys, opts) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected argument array to be less than 25 items'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { ...DEFAULT_OPTS, ...opts };

  keys.forEach((where, i) => {
    const { hash, range } = keySchema;
    assert(where.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from where #${i}`));
    assert(!range || where.hasOwnProperty(range), new Error(`Missing ${range} range property from where #${i}`));
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
