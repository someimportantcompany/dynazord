const AWS = require('aws-sdk');
const { assert, createLogger, isPlainObject } = require('./utils');
const { assertValidProperties } = require('./helpers/schema');
const { createHooks } = require('./hooks');
const { keys: typeKeys } = require('./types');
const { methods, bulkMethods, transactionMethods, runTransaction } = require('./methods');
const { operators } = require('./helpers/expressions');

const { name: PACKAGE_NAME } = require('../package.json');

const defaultOptions = {
  createdAtTimestamp: false,
  updatedAtTimestamp: false,
};

let overwriteDynamoDB = null;
let overwriteOptions = null;

/**
 * @param {Object} opts
 * @return {Object}
 */
function createModel(opts) {
  assert(isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  // Required
  const { tableName, properties } = opts;
  assert(typeof tableName === 'string', new TypeError('Expected { tableName } to be a string'));
  assert(isPlainObject(properties), new TypeError('Expected { properties } to be a plain object'));
  assert(Object.keys(properties).length, new TypeError('Expected { properties } to have properties'));
  // Optional
  opts.keySchema = opts.keySchema || Object.keys(properties).shift();
  assert(isPlainObject(opts.keySchema) || (typeof opts.keySchema === 'string' && opts.keySchema.length),
    new TypeError('Expected { keySchema } to be a string or a plain object'));
  assert(!opts.secondaryIndexes || isPlainObject(opts.secondaryIndexes),
    new TypeError('Expected { secondaryIndexes } to be a plain object'));
  assert(!opts.hooks || isPlainObject(opts.hooks), new TypeError('Expected { hooks } to be a plain object'));
  assert(!opts.options || isPlainObject(opts.options), new TypeError('Expected { options } to be a plain object'));

  const options = {
    ...defaultOptions,
    ...overwriteOptions,
    ...opts.options,
  };

  try {
    const pickTimestampProps = ({ format, validate }) => ({ format, validate });

    if (options.createdAtTimestamp === true) {
      properties.createdAt = {
        type: Date,
        required: true,
        default: () => new Date(),
        onCreate: value => value || new Date(),
        ...pickTimestampProps(isPlainObject(properties.createdAt) ? properties.createdAt : {}),
      };
    }

    if (options.updatedAtTimestamp === true) {
      properties.updatedAt = {
        type: Date,
        required: true,
        default: () => new Date(),
        onCreate: value => value || new Date(),
        onUpdate: value => value || new Date(),
        onUpsert: value => value || new Date(),
        ...pickTimestampProps(isPlainObject(properties.updatedAt) ? properties.updatedAt : {}),
      };
    }

    assertValidProperties(properties);
  } catch (err) /* istanbul ignore next */ {
    err.message = `[${tableName}] ${err.message}`;
    throw err;
  }

  const { hash, range, ...keySchemaOpts } = isPlainObject(opts.keySchema) ? opts.keySchema : { hash: opts.keySchema };
  assert(typeof hash === 'string', new TypeError('Expected keySchema hash property to be a string'));
  assert(properties[hash], new TypeError(`Expected ${hash} to be a property`));
  assert(properties[hash].required === true, new TypeError(`Expected ${hash} property to be required`));
  assert(!range || typeof range === 'string', new TypeError('Expected keySchema range property to be a string'));
  assert(!range || properties[range], new TypeError(`Expected ${range} to be a property`));
  assert(!range || properties[range].required === true, new TypeError(`Expected ${range} property to be required`));

  if (opts.secondaryIndexes) {
    for (const name in opts.secondaryIndexes) {
      if (opts.secondaryIndexes.hasOwnProperty(name)) {
        assert(isPlainObject(opts.secondaryIndexes[name]), new TypeError(`Expected secondaryIndexes.${name} to be an object`));
        const { hash: shash, range: srange } = opts.secondaryIndexes[name];
        assert(typeof shash === 'string', new TypeError(`Expected secondaryIndexes ${name} hash property to be a string`));
        assert(properties[shash], new TypeError(`Expected ${hash} to be a property`));
        assert(typeof srange === 'string', new TypeError(`Expected secondaryIndexes ${name} range property to be a string`));
        assert(properties[srange], new TypeError(`Expected ${range} to be a property`));
      }
    }
  }

  const hooks = createHooks(opts.hooks || {});

  return Object.create({ ...methods, ...bulkMethods }, {
    tableName: { enumerable: true, value: tableName },
    keySchema: { enumerable: true, value: { hash, range, ...keySchemaOpts } },
    secondaryIndexes: { enumerable: true, value: opts.secondaryIndexes },
    properties: { enumerable: true, value: opts.properties },
    client: { value: validateDynamoDB(opts.dynamodb) || overwriteDynamoDB || new AWS.DynamoDB() },
    hooks: { enumerable: true, value: hooks },
    log: { value: opts.log || createLogger(opts.logLevel) },
    options: { enumerable: true, value: options },

    transaction: {
      get() {
        assert(!opts.dynamodb, new Error('Model cannot take part in transactions with specific DynamoDB instances'));
        return (tm => Object.keys(tm).reduce((r, k) => ({ ...r, [k]: tm[k].bind(this) }), []))(transactionMethods);
      },
    },
  });
}

function validateDynamoDB(client) {
  if (isPlainObject(client)) {
    return new AWS.DynamoDB({ ...client });
  } else if (client) {
    assert(!(client instanceof AWS.DynamoDB.DocumentClient),
      new TypeError(`Sorry, ${PACKAGE_NAME} doesn't support AWS.DynamoDB.DocumentClient`));
    assert(client instanceof AWS.DynamoDB,
      new TypeError('Expected { dynamodb } to be an instance of AWS.DynamoDB'));
    return client;
  } else {
    return null;
  }
}

module.exports = {
  createModel,

  /**
   * @param {(AWS.DynamoDB|Object)}
   * @return {(AWS.DynamoDB|null)}
   */
  setDynamoDB(client) {
    overwriteDynamoDB = validateDynamoDB(client);
    return overwriteDynamoDB;
  },

  /**
   * @param {Object<string, (string|number|boolean)>}
   * @return void
   */
  setOptions(overwrite) {
    assert(isPlainObject(overwrite), new TypeError('Expected argument to be a plain object'));
    overwriteOptions = overwrite;
  },

  /**
   * Run a transaction
   *
   * @param {(AWS.DynamoDB|Object)} [client] Defaults to the global or a clean DynamoDB instance
   * @param {DynazordTransactionBlock[]} blocks The array
   * @param {(Object|undefined)} [opts]
   * @return {(Object|null)[]}
   */
  transaction(client, blocks, opts = undefined) {
    if (Array.isArray(client)) {
      // client => blocks
      opts = blocks;
      blocks = client;
      client = null;
    }

    return runTransaction(validateDynamoDB(client) || overwriteDynamoDB || new AWS.DynamoDB(), blocks, opts);
  },

  /**
   * @type {Object<string, function>}
   */
  methods: { ...methods, ...bulkMethods, transaction: transactionMethods },
  /**
   * @type {Object<string, Symbol>}
   */
  operators,
  /**
   * @type {Object<string, string>}
   */
  types: typeKeys.reduce((r, t) => ({ ...r, [t]: t }), {}),
};
