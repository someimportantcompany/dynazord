const AWS = require('aws-sdk');
const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { assertRequiredUpdateProps, stringifyUpdateStatement } = require('../helpers/update');
const { DynazordTransactionBlock } = require('../helpers/transaction');
const { formatWriteData, marshallKey, validateData } = require('../helpers/data');
const { stringifyUpsertStatement } = require('../helpers/upsert');
/* eslint-disable no-invalid-this */

function createTransaction(item, opts) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(item), new TypeError('Expected item argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  let key = null;

  return new DynazordTransactionBlock(this, async () => {
    await assertRequiredCreateProps.call(this, properties, item);
    await appendCreateDefaultProps.call(this, properties, item);

    await hooks.emit('beforeValidateCreate', this, opts.hooks === true, item, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
    await validateData.call(this, properties, item).catch(async err => {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, item, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateCreate', this, opts.hooks === true, item, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);

    await hooks.emit('beforeCreate', this, opts.hooks === true, item, opts);
    await formatWriteData.call(this, properties, item, { fieldHook: 'onCreate' });
    await hooks.emit('beforeCreateWrite', this, opts.hooks === true, item, opts);

    const { hash, range } = keySchema;
    const { [hash]: hashValue, [range || 'null']: rangeValue } = item;
    key = await marshallKey(properties, { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) });

    return {
      Put: {
        // Specify the name & item to be created
        TableName: tableName,
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
  }, () => {
    assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));

    return {
      Get: {
        TableName: tableName,
        Key: key,
      },
    };
  });
}

function updateTransaction(update, key, opts) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
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
    await validateData.call(this, properties, update).catch(async err => {
      await hooks.emit('validateUpdateFailed', this, opts.hooks === true, update, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, update, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateUpdate', this, opts.hooks === true, update, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, update, opts);

    await hooks.emit('beforeUpdate', this, opts.hooks === true, update, opts);
    await formatWriteData.call(this, properties, update, { fieldHook: 'onUpdate' });
    await hooks.emit('beforeUpdateWrite', this, opts.hooks === true, update, opts);

    const { expression, names, values } = stringifyUpdateStatement.call(this, update) || {};
    assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
    assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
    assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

    key = await marshallKey(properties, key);

    return {
      Update: {
        TableName: tableName,
        Key: key,
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
  }, () => {
    assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));

    return {
      Get: {
        TableName: tableName,
        Key: key,
      },
    };
  });
}

function deleteTransaction(key, opts) {
  const { tableName, keySchema, properties, client } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(key), new TypeError('Expected key to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  return new DynazordTransactionBlock(async () => {
    const { hash, range } = keySchema;
    assert(key.hasOwnProperty(hash), new Error(`Missing ${hash} hash property from key`));
    assert(!range || key.hasOwnProperty(range), new Error(`Missing ${range} range property from key`));

    return {
      Delete: {
        TableName: tableName,
        Key: await marshallKey(properties, key),
      },
    };
  });
}

function upsertTransaction(item, opts) {
  const { tableName, keySchema, properties, client, hooks } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(item), new TypeError('Expected upsert to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

  const specifiedUpsertKeys = Object.keys(item);
  let key = null;

  return new DynazordTransactionBlock(async () => {
    await assertRequiredCreateProps.call(this, properties, item);
    await appendCreateDefaultProps.call(this, properties, item);

    await hooks.emit('beforeValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, item, opts);
    await validateData.call(this, properties, item).catch(async err => {
      await hooks.emit('validateUpsertFailed', this, opts.hooks === true, item, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, item, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateUpsert', this, opts.hooks === true, item, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, item, opts);

    const { hash, range } = keySchema;
    const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = item;
    key = { [hash]: hashValue, ...(range ? { [range]: rangeValue } : {}) };

    await hooks.emit('beforeUpsert', this, opts.hooks === true, upsertValues, opts);
    await formatWriteData.call(this, properties, upsertValues, { fieldHook: 'onUpsert' });
    await hooks.emit('beforeUpsertWrite', this, opts.hooks === true, upsertValues, opts);

    const { expression, names, values } = stringifyUpsertStatement.call(this, upsertValues, specifiedUpsertKeys) || {};
    assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
    assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
    assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

    return {
      Update: {
        TableName: tableName,
        Key: await marshallKey(properties, key),
        UpdateExpression: expression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: marshall(values),
        ReturnValuesOnConditionCheckFailure: 'NONE',
      },
    };
  });
}

async function runTransaction(client, blocks, opts = undefined) {
  assert(client instanceof AWS.DynamoDB, new TypeError('Expected client to be an instance of AWS.DynamoDB'));
  assert(Array.isArray(blocks), new TypeError('Expected blocks to be an array'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));

  blocks.forEach(block => assert(block instanceof DynazordTransactionBlock || isPlainObject(block),
    new TypeError('Expected each transaction block to be from a model or a plain object')));

  const TransactItems = await Promise.all(blocks.map(block => {
    if (block instanceof DynazordTransactionBlock) {
      return block.before();
    } else {
      return block;
    }
  }));

  await client.transactWriteItems({ TransactItems }).promise();

  // @TODO Go get all the items we just wrote!
}

module.exports = {
  create: createTransaction,
  update: updateTransaction,
  delete: deleteTransaction,
  upsert: upsertTransaction,
  runTransaction,
};
