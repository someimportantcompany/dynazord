/* eslint-disable no-invalid-this */
const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { assertRequiredUpdateProps } = require('../helpers/update');
const { buildUpdateExpression, buildUpsertExpression } = require('../helpers/expressions');
const { DynamoDB } = require('aws-sdk');
const { DynazordTransactionBlock } = require('../helpers/transaction');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

function createTransaction(item, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(item), new TypeError('Expected item argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  return new DynazordTransactionBlock(this, async () => {
    await assertRequiredCreateProps.call(this, properties, item);
    await appendCreateDefaultProps.call(this, properties, item);

    await hooks.emit('beforeValidateCreate', this, opts.hooks === true, item, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
    try {
      await validateData.call(this, properties, item);
    } catch (err) /* istanbul ignore next */ {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, item, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
      throw err;
    }
    await hooks.emit('afterValidateCreate', this, opts.hooks === true, item, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);

    await hooks.emit('beforeCreate', this, opts.hooks === true, item, opts);
    await formatWriteData.call(this, properties, item, { fieldHook: 'onCreate' });
    await hooks.emit('beforeCreateWrite', this, opts.hooks === true, item, opts);

    const { hash, range } = keySchema;
    const { [hash]: hashValue, [range || 'null']: rangeValue } = item;
    const key = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

    return {
      Put: {
        TableName: tableName,
        Key: marshall(key), // Secretly injected here to read items after the transaction is written
        Item: marshall(item),
        // Specify a condition to ensure this doesn't write an item that already exists
        ConditionExpression: hash && range
          ? 'attribute_not_exists(#_hash_key) AND attribute_not_exists(#_range_key)'
          : 'attribute_not_exists(#_hash_key)',
        ExpressionAttributeNames: hash && range
          ? { '#_hash_key': hash, '#_range_key': range }
          : { '#_hash_key': hash },
        // Reject all return values, since we have a complete copy of the object
        ReturnValuesOnConditionCheckFailure: 'NONE',
      },
    };
  }, async created => {
    await hooks.emit('afterCreateWrite', this, opts.hooks === true, created, opts);
    await formatReadData(properties, created);
    await hooks.emit('afterCreate', this, opts.hooks === true, created, opts);
    return created;
  });
}

function getTransaction(key, opts = undefined) {
  const { tableName, keySchema, properties, client } = this;
  assert(client && typeof client.transactGetItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  return new DynazordTransactionBlock(this, async () => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

    await formatWriteData.call(this, properties, key);

    return {
      Get: {
        TableName: tableName,
        Key: marshall(key),
      },
    };
  }, async fetched => {
    await formatReadData(properties, fetched);
    return fetched;
  });
}

function updateTransaction(update, key, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(update), new TypeError('Expected update to be a plain object'));
  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  return new DynazordTransactionBlock(this, async () => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

    await assertRequiredUpdateProps.call(this, properties, update);

    await hooks.emit('beforeValidateUpdate', this, opts.hooks === true, update, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, update, opts);
    try {
      await validateData.call(this, properties, update);
    } catch (err) /* istanbul ignore next */ {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, update, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, update, err, opts);
      throw err;
    }
    await hooks.emit('afterValidateUpdate', this, opts.hooks === true, update, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, update, opts);

    await hooks.emit('beforeUpdate', this, opts.hooks === true, update, opts);
    await formatWriteData.call(this, properties, update, { fieldHook: 'onUpdate' });
    await formatWriteData.call(this, properties, key);
    await hooks.emit('beforeUpdateWrite', this, opts.hooks === true, update, opts);

    const { expression, names, values } = buildUpdateExpression.call(this, update) || {};
    assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
    assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
    assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

    return {
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
      },
    };
  }, async updated => {
    await hooks.emit('afterUpdateWrite', this, opts.hooks === true, updated, opts);
    await formatReadData(properties, updated);
    await hooks.emit('afterUpdate', this, opts.hooks === true, updated, opts);
    return updated;
  });
}

function updatePropertyTransaction(update, key) {
  const { tableName, keySchema, properties, client } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(update), new TypeError('Expected update arg to be a plain object'));
  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));

  const { expression, names, values } = update;
  assert(typeof expression === 'string' && expression.length, new TypeError('Expected expression to be a string'));
  assert(!names || isPlainObject(names), new TypeError('Expected expressionAttributeNames to be a plain object'));
  assert(!values || isPlainObject(values), new TypeError('Expected expressionAttributeValues to be a plain object'));

  return new DynazordTransactionBlock(this, async () => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

    await formatWriteData.call(this, properties, key);

    return {
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
      },
    };
  });
}

function deleteTransaction(key, opts = undefined) {
  const { tableName, keySchema, properties, client } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  return new DynazordTransactionBlock(this, async () => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

    await formatWriteData.call(this, properties, key);

    return {
      Delete: {
        TableName: tableName,
        Key: marshall(key),
      },
    };
  });
}

function upsertTransaction(item, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.transactWriteItems === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(item), new TypeError('Expected upsert to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  const specifiedUpsertKeys = Object.keys(item);

  return new DynazordTransactionBlock(this, async () => {
    await assertRequiredCreateProps.call(this, properties, item);
    await appendCreateDefaultProps.call(this, properties, item);

    await hooks.emit('beforeValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
    try {
      await validateData.call(this, properties, item);
    } catch (err) /* istanbul ignore next */ {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, item, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
      throw err;
    }
    await hooks.emit('afterValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);

    await hooks.emit('beforeUpsert', this, opts.hooks === true, item, opts);
    await formatWriteData.call(this, properties, item, { fieldHook: 'onUpsert' });
    await hooks.emit('beforeUpsertWrite', this, opts.hooks === true, item, opts);

    const { hash, range } = keySchema;
    const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = item;
    const key = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

    const { expression, names, values } = buildUpsertExpression.call(this, upsertValues, specifiedUpsertKeys) || {};
    assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
    assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
    assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

    return {
      Update: {
        TableName: tableName,
        Key: marshall(key),
        UpdateExpression: expression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: marshall(values),
        ReturnValuesOnConditionCheckFailure: 'NONE',
      },
    };
  }, async upserted => {
    await hooks.emit('afterUpsertWrite', this, opts.hooks === true, upserted, opts);
    await formatReadData.call(this, properties, upserted);
    await hooks.emit('afterUpsert', this, opts.hooks === true, upserted, opts);
    return upserted;
  });
}

/**
 * Runs a transaction.
 * @param {DynamoDB} client
 * @param {Array<DynazordTransactionBlock>} blocks
 * @param {Object|undefined} opts
 * @return {Array<Object|null>}
 */
async function runTransaction(client, blocks, opts = undefined) {
  assert(client instanceof DynamoDB, new TypeError('Expected client to be an instance of AWS.DynamoDB'));
  assert(Array.isArray(blocks), new TypeError('Expected transaction blocks to be an array'));
  assert(blocks.length <= 25, new Error('Expected transaction blocks to contain less than or equal to 25 items'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));

  // Look after our own - if the developer wants to do manual DynamoDB transactions...
  // ...then there's nothing stopping them creating a DynamoDB instance & running transact(Get|Write)Items themselves
  blocks.forEach(block => assert(block instanceof DynazordTransactionBlock,
    new TypeError('Expected each transaction block to be from a model')));

  const transactItems = await Promise.all(blocks.map(block => block.before()));
  transactItems.forEach(block => {
    assert(isPlainObject(block), new TypeError('Expected block to be a plain object'));
    assert(Object.keys(block).length === 1, new TypeError('Expected each block to have a single key'));
  });

  const { results, readItems, readMapIndexes, writeItems } = transactItems.reduce((list, block, i) => {
    list.results.push(null);

    if (block.hasOwnProperty('Get')) {
      const { Get: { TableName, Key } } = block;
      list.readItems.push({ Get: { TableName, Key } });
      list.readMapIndexes.push(i);
    } else if (block.hasOwnProperty('Put')) {
      const { Put: { TableName, Key, ...rest } } = block;
      list.readItems.push({ Get: { TableName, Key } });
      list.readMapIndexes.push(i);
      list.writeItems.push({ Put: { TableName, ...rest } });
    } else if (block.hasOwnProperty('Update')) {
      const { Update: { TableName, Key } } = block;
      list.readItems.push({ Get: { TableName, Key } });
      list.readMapIndexes.push(i);
      list.writeItems.push(block);
    } else if (block.hasOwnProperty('Delete')) {
      list.writeItems.push(block);
    }

    return list;
  }, {
    results: [],
    readItems: [],
    readMapIndexes: [],
    writeItems: [],
  });

  if (writeItems.length > 0) {
    try {
      // Write items in a transaction
      await client.transactWriteItems({ TransactItems: writeItems }).promise();
    } catch (err) /* istanbul ignore next */ {
      // console.error(JSON.stringify({ transactWriteItems: TransactItems, err: { ...err } }, null, 2));
      err.message = `TransactionError: ${err.message}`;
      throw err;
    }
  }

  if (readItems.length) {
    let Responses = null;
    try {
      // If we have items to fetch (complete list if CRU but empty if D)
      ({ Responses } = await client.transactGetItems({ TransactItems: readItems }).promise());
    } catch (err) /* istanbul ignore next */ {
      // console.error(JSON.stringify({ transactGetItems: TransactItems, err: { ...err } }, null, 2));
      err.message = `TransactionError: ${err.message}`;
      throw err;
    }

    assert(Array.isArray(Responses), new TypeError('Expected transactGetItems results to be an array'));

    await Promise.all(Responses.map(async ({ Item }, i) => {
      // Lookup the "actual" index for this result
      const gi = readMapIndexes[i];

      /* istanbul ignore else */
      if (Item) {
        Item = unmarshall(Item);

        /* istanbul ignore else */
        if (blocks[gi] && typeof blocks[gi].after === 'function') {
          // If this result has an after function to run, then run it to trigger relevant hooks
          const { after } = blocks[gi];
          results[gi] = await after(Item);
        } else {
          // Otherwise, just pass back the item
          results[gi] = Item;
        }
      }
    }));
  }

  return results;
}

module.exports = {
  create: createTransaction,
  get: getTransaction,
  update: updateTransaction,
  updateProperty: updatePropertyTransaction,
  delete: deleteTransaction,
  upsert: upsertTransaction,
  runTransaction,
};
