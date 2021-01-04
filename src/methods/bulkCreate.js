const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

const DEFAULT_OPTS = {
  bulkHooks: true,
  hooks: false,
};

module.exports = async function createBulkDocuments(items, opts = undefined) {
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

  const { hash, range } = keySchema;
  const { [hash]: hashProp, [range]: rangeProp } = properties;
  items = await asyncEach(items, async create => {
    assert(hashProp.hasOwnProperty('default') || create.hasOwnProperty(hash),
      new Error(`Missing ${hash} hash property from argument`));
    assert(!range || rangeProp.hasOwnProperty('default') || create.hasOwnProperty(range),
      new Error(`Missing ${range} range property from argument`));

    await assertRequiredCreateProps.call(this, properties, create);
    await appendCreateDefaultProps.call(this, properties, create);
  });

  items = await asyncEach(items, async create => {
    await hooks.emit('beforeValidateCreate', this, opts.hooks === true, create, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, create, opts);
    await validateData.call(this, properties, create).catch(async err => {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, create, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, create, err, opts);
      throw err;
    });
    await hooks.emit('afterValidateCreate', this, opts.hooks === true, create, opts);
    await hooks.emit('afterValidate', this, opts.hooks === true, create, opts);
  });

  items = await asyncEach(items, async create => {
    await hooks.emit('beforeCreate', this, opts.hooks === true, create, opts);
    await formatWriteData.call(this, properties, create, { fieldHook: 'onCreate' });
    await hooks.emit('beforeCreateWrite', this, opts.hooks === true, create, opts);
  });

  if (items.length) {
    const TransactItems = items.map(create => ({
      Put: {
        // Specify the name & item to be created
        TableName: tableName,
        Item: marshall(create),
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
    }));

    log.debug({ transactWriteItems: { TransactItems } });
    const results = await client.transactWriteItems({ TransactItems }).promise();
    log.debug({ transactWriteItems: results });
  }

  items = await asyncEach(items, async create => {
    await hooks.emit('afterCreateWrite', this, opts.hooks === true, create, opts);
    await formatReadData.call(this, properties, create);
    await hooks.emit('afterCreate', this, opts.hooks === true, create, opts);
  });

  await hooks.emit('afterBulkCreate', this, opts.bulkHooks === true, items, opts);

  return items;
};

function asyncEach(array, eachItem) {
  return Promise.all(array.map(async item => {
    await eachItem(item);
    return item;
  }));
}
