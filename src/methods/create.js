const { assert, isPlainObject, marshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');

const DEFAULT_OPTS = {
  hooks: true,
};

module.exports = async function createDocument(create, opts = undefined) {
  const { tableName, keySchema, properties, client, hooks, log } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected create argument to be a plain object'));
  assert(opts === undefined || isPlainObject(opts), new TypeError('Expected opts argument to be a plain object'));
  opts = { ...DEFAULT_OPTS, ...opts };

  const { hash, range } = keySchema;
  const { [hash]: hashProp, [range]: rangeProp } = properties;
  assert(hashProp.hasOwnProperty('default') || create.hasOwnProperty(hash),
    new Error(`Missing ${hash} hash property from argument`));
  assert(!range || rangeProp.hasOwnProperty('default') || create.hasOwnProperty(range),
    new Error(`Missing ${range} range property from argument`));

  await assertRequiredCreateProps.call(this, properties, create);
  await appendCreateDefaultProps.call(this, properties, create);

  try {
    await hooks.emit('beforeValidateCreate', this, opts.hooks === true, create, opts);
    await hooks.emit('beforeValidate', this, opts.hooks === true, create, opts);
    await validateData.call(this, properties, create).catch(async err => {
      await hooks.emit('validateCreateFailed', this, opts.hooks === true, create, err, opts);
      await hooks.emit('validateFailed', this, opts.hooks === true, create, err, opts);
      throw err;
    });
    await hooks.emit('afterValidate', this, opts.hooks === true, create, opts);
    await hooks.emit('afterValidateCreate', this, opts.hooks === true, create, opts);
  } catch (err) {
    err.name = 'ValidationError';
    err.message = `[${tableName}] ${err.message}`;
    throw err;
  }

  await hooks.emit('beforeCreate', this, opts.hooks === true, create, opts);
  await formatWriteData.call(this, properties, create, { fieldHook: 'onCreate' });
  await hooks.emit('beforeCreateWrite', this, opts.hooks === true, create, opts);

  try {
    const params = {
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
      ReturnValues: 'NONE',
    };
    log.debug({ putItem: params });

    const results = await client.putItem(params).promise();
    log.debug({ putItem: results });
  } catch (err) {
    log.error(err);
    throw err;
  }

  await hooks.emit('afterCreateWrite', this, opts.hooks === true, create, opts);
  await formatReadData.call(this, properties, create);
  await hooks.emit('afterCreate', this, opts.hooks === true, create, opts);

  return create;
};
