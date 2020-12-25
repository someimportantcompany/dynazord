const AWS = require('aws-sdk');
const { assert, createLogger, isPlainObject } = require('./utils');
const { assertValidProperties } = require('./helpers/validate');
const { methods, bulkMethods } = require('./methods');
const { operators } = require('./helpers/where');
const { types } = require('./types');

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

  assert(!opts.options || isPlainObject(opts.options), new TypeError('Expected { options } to be a plain object'));
  assert(!opts.region || typeof opts.region === 'string', new TypeError('Expected { region } to be a string'));

  const options = {
    ...defaultOptions,
    ...overwriteOptions,
    ...opts.options,
  };

  try {
    if (options.createdAtTimestamp === true) {
      assert(!properties.hasOwnProperty('createdAt'),
        new TypeError('Property "createdAt" already exists - set createdAtTimestamp to false!'));
      properties.createdAt = {
        type: Date,
        onCreate: value => value || new Date(),
      };
    }
    if (options.updatedAtTimestamp === true) {
      assert(!properties.hasOwnProperty('updatedAt'),
        new TypeError('Property "updatedAt" already exists - set updatedAtTimestamp to false!'));
      properties.updatedAt = {
        type: Date,
        onCreate: value => value || new Date(),
        onUpdate: value => value || new Date(),
      };
    }

    assertValidProperties(properties);
  } catch (err) {
    err.message = `[${tableName}] ${err.message}`;
    throw err;
  }

  return Object.create({ ...methods, ...bulkMethods }, {
    client: {
      value: opts.dynamodb || new AWS.DynamoDB({ region: opts.region || undefined }),
    },
    log: {
      value: opts.log || createLogger({ level: (options || {}).logLevel }),
    },
    tableName: {
      enumerable: true,
      value: tableName,
    },
    keySchema: {
      enumerable: true,
      value: Object.freeze(keySchema),
    },
    properties: {
      enumerable: true,
      value: Object.freeze(opts.properties),
    },
    options: {
      enumerable: true,
      value: Object.freeze(options),
    },
  });
}

module.exports = {
  createModel,
  fieldTypes: Object.freeze(Object.keys(types).reduce((r, t) => ({ ...r, [t]: t }), {})),
  operators: Object.freeze(operators),
  setOptions(overwrite) {
    assert(isPlainObject(overwrite), new TypeError('Expected argument to be a plain object'));
    overwriteOptions = overwrite;
  },
};
