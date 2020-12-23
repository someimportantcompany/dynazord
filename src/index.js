const AWS = require('aws-sdk');
const { assert, createLogger, isPlainObject } = require('./utils');
const { assertValidProperties } = require('./validate');
const { transaction: transactionMethods, ...methods } = require('./methods');

const defaultOptions = {
  createdAtTimestamp: true,
  updatedAtTimestamp: true,
};
let overwriteOptions = {};

function createModel(opts) {
  assert(isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  const { tableName, keySchema, properties } = opts;
  assert(typeof tableName === 'string', new TypeError('Expected { tableName } to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected { keySchema } to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected { properties } to be a plain object'));

  const { hash, range } = keySchema;
  assert(typeof hash === 'string', new TypeError('Expected keySchema hash property to be a string'));
  assert(properties[hash], new TypeError(`Expected ${hash} to be a property`));
  assert(properties[hash].required === true, new TypeError(`Expected ${hash} property to be required`));
  assert(!range || typeof range === 'string', new TypeError('Expected keySchema range property to be a string'));
  assert(!range || properties[range], new TypeError(`Expected ${range} to be a property`));
  assert(!range || properties[range].required === true, new TypeError(`Expected ${range} property to be required`));

  const { options, region } = opts;
  assert(!options || isPlainObject(options), new TypeError('Expected { options } to be a plain object'));
  assert(!region || typeof region === 'string', new TypeError('Expected { region } to be a string'));

  try {
    assertValidProperties(properties);
  } catch (err) {
    err.message = `[${tableName}] ${err.message}`;
    throw err;
  }

  return Object.create(methods, {
    client: {
      value: new AWS.DynamoDB({ region }),
    },
    log: {
      value: opts.log || createLogger({ level: (options || {}).logLevel }),
    },
    tableName: {
      enumerable: true,
      value: tableName,
    },
    region: {
      enumerable: true,
      value: region,
    },
    keySchema: {
      enumerable: true,
      value: keySchema,
    },
    properties: {
      enumerable: true,
      value: Object.freeze(opts.properties),
    },
    transaction: {
      enumerable: true,
      get() {
        return Object.keys(transactionMethods).reduce((r, k) => ({ ...r, [k]: transactionMethods[k].bind(this) }), {});
      },
    },
    options: {
      enumerable: true,
      value: Object.freeze({
        ...defaultOptions,
        ...overwriteOptions,
        ...options,
      }),
    },
  });
}

module.exports = {
  createModel,
  setOptions(overwrite) {
    assert(isPlainObject(overwrite), new TypeError('Expected argument to be a plain object'));
    overwriteOptions = overwrite;
  },
};
