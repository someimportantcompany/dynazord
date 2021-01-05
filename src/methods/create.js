const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

module.exports = async function createDocument(item, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(item), new TypeError('Expected item argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { hooks: true, ...opts };

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

  try {
    const { hash, range } = keySchema;
    const params = {
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
      ReturnValues: 'NONE',
    };
    log.debug({ putItem: params });

    const results = await client.putItem(params).promise();
    log.debug({ putItem: results });
  } catch (err) {
    log.error(err);
    throw err;
  }

  await hooks.emit('afterCreateWrite', this, opts.hooks === true, item, opts);
  await formatReadData.call(this, properties, item);
  await hooks.emit('afterCreate', this, opts.hooks === true, item, opts);

  return item;
};
