const { assert, isPlainObject, marshall, unmarshall, promiseMapAll } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, marshallKey, validateData } = require('../helpers/data');
const { stringifyUpsertStatement } = require('../helpers/upsert');

const DEFAULT_OPTS = {
  bulkHooks: true,
  hooks: false,
};

module.exports = async function upsertBulkDocuments(items, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(Array.isArray(items), new Error('Expected argument to be an array'));
  assert(items.length <= 25, new Error('Expected array argument to be less than 25 items'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { ...DEFAULT_OPTS, ...opts };

  await hooks.emit('beforeBulkCreate', this, opts.bulkHooks === true, items, opts);

  const specifiedUpsertKeys = items.map(item => Object.keys(item));

  items = await promiseMapAll(items, async item => {
    await assertRequiredCreateProps.call(this, properties, item);
    await appendCreateDefaultProps.call(this, properties, item);
  });

  items = await promiseMapAll(items, async item => {
    await hooks.emit('beforeValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
    await validateData.call(this, properties, item).catch(async err => {
      await hooks.emit('validateUpsertFailed', this, opts.hooks === true, item, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);
  });

  items = await promiseMapAll(items, async item => {
    const { hash, range } = keySchema;
    const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = item;
    const key = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

    await hooks.emit('beforeUpsert', this, opts.hooks === true, upsertValues, opts);
    await formatWriteData.call(this, properties, upsertValues, { fieldHook: 'onUpsert' });
    await hooks.emit('beforeUpsertWrite', this, opts.hooks === true, upsertValues, opts);

    return { key: await marshallKey(properties, key), upsertValues };
  });

  if (items.length) {
    const TransactWriteItems = items.map(({ key: Key, upsertValues }) => {
      const { expression, names, values } = stringifyUpsertStatement.call(this, upsertValues, specifiedUpsertKeys) || {};
      assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
      assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
      assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

      return {
        Update: {
          TableName: tableName,
          Key,
          UpdateExpression: expression,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: marshall(values),
          ReturnValuesOnConditionCheckFailure: 'NONE',
        },
      };
    });

    log.debug({ transactWriteItems: { TransactWriteItems } });
    const transactWriteResults = await client.transactWriteItems({ TransactItems: TransactWriteItems }).promise();
    log.debug({ transactWriteItems: transactWriteResults });

    const TransactGetItems = items.map(({ key: Key }) => ({ Get: { TableName: tableName, Key } }));
    log.debug({ transactGetItems: { TransactGetItems } });
    const results = await client.transactGetItems({ TransactItems: TransactGetItems }).promise();
    log.debug({ transactGetItems: results });

    assert(results && Array.isArray(results.Responses), new TypeError('Expected results to be an array'));

    items = await promiseMapAll(results.Responses, async ({ Item }) => {
      if (Item) {
        Item = unmarshall(Item);
        await hooks.emit('afterUpsertWrite', this, opts.hooks === true, Item, opts);
        await formatReadData(properties, Item);
        await hooks.emit('afterUpsert', this, opts.hooks === true, Item, opts);
        return Item;
      } else {
        return null;
      }
    });
  }

  await hooks.emit('afterBulkCreate', this, opts.bulkHooks === true, items, opts);

  return items;
};
