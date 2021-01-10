const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { assertRequiredUpdateProps } = require('../helpers/update');
const { buildUpdateExpression } = require('../helpers/expressions');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

module.exports = async function getBulkDocuments(update, keys, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.transactGetItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(update), new TypeError('Expected update to be a plain object'));
  assert(Array.isArray(keys), new Error('Expected argument to be an array'));
  assert(keys.length <= 25, new Error('Expected keys argument to be less than 25 items'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { bulkHooks: true, hooks: false, ...opts };

  keys.forEach((key, i) => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key #${i}`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key #${i}`));
  });

  await hooks.emit('beforeBulkUpdate', this, opts.bulkHooks === true, update, keys, opts);

  await assertRequiredUpdateProps.call(this, properties, update);

  await hooks.emit('beforeValidateUpdate', this, opts.hooks === true, update, opts);
  await hooks.emit('beforeValidate', this, opts.hooks === true, update, opts);
  try {
    await validateData.call(this, properties, update);
  } catch (err) /* istanbul ignore next */ {
    await hooks.emit('validateUpdateFailed', this, opts.hooks === true, update, err, opts);
    await hooks.emit('validateFailed', this, opts.hooks === true, update, err, opts);
    throw err;
  }
  await hooks.emit('afterValidateUpdate', this, opts.hooks === true, update, opts);
  await hooks.emit('afterValidate', this, opts.hooks === true, update, opts);

  await hooks.emit('beforeUpdate', this, opts.hooks === true, update, opts);
  await formatWriteData.call(this, properties, update, { fieldHook: 'onUpdate' });
  await hooks.emit('beforeUpdateWrite', this, opts.hooks === true, update, opts);

  const { expression, names, values } = buildUpdateExpression.call(this, update) || {};
  assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
  assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
  assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

  keys = await promiseMapAll(keys, async key => {
    await formatWriteData.call(this, properties, key);
  });

  let items = [];

  if (keys.length) {
    const { hash, range } = keySchema;
    const TransactWriteItems = keys.map(key => ({
      Update: {
        TableName: tableName,
        Key: marshall(key),
        ConditionExpression: hash && range
          ? 'attribute_exists(#_hash_key) AND attribute_exists(#_range_key)'
          : 'attribute_exists(#_hash_key)',
        UpdateExpression: expression,
        ExpressionAttributeNames: {
          ...(hash && range
            ? { '#_hash_key': hash, '#_range_key': range }
            : { '#_hash_key': hash }),
          ...names,
        },
        ExpressionAttributeValues: marshall(values),
        ReturnValuesOnConditionCheckFailure: 'NONE',
      },
    }));
    const TransactGetItems = keys.map(key => ({
      Get: {
        TableName: tableName,
        Key: marshall(key),
      },
    }));

    log.debug({ transactWriteItems: { TransactItems: TransactWriteItems } });
    const writeResults = await client.transactWriteItems({ TransactItems: TransactWriteItems }).promise();
    log.debug({ transactWriteItems: writeResults });

    log.debug({ transactGetItems: { TransactItems: TransactGetItems } });
    const results = await client.transactGetItems({ TransactItems: TransactGetItems }).promise();
    log.debug({ transactGetItems: results });

    assert(results && Array.isArray(results.Responses), new Error('Expected responses to be an array'));

    items = results.Responses.map(({ Item }) => Item ? unmarshall(Item) : null);

    items = await promiseMapAll(items, async item => {
      /* istanbul ignore else */
      if (item) {
        await hooks.emit('afterUpdateWrite', this, opts.hooks === true, item, opts);
        await formatReadData.call(this, properties, item);
        await hooks.emit('afterUpdate', this, opts.hooks === true, item, opts);
      }
    });
  }

  await hooks.emit('afterBulkUpdate', this, opts.bulkHooks === true, items, opts);

  return items;
};
