const AWS = require('aws-sdk');
const isPlainObject = require('lodash.isplainobject');

const { marshall, unmarshall } = AWS.DynamoDB.Converter;

function assert(value, err, additional = {}) {
  if (Boolean(value) === false) {
    /* istanbul ignore if */
    if ((err instanceof Error) === false) {
      err = new Error(`${err}`);
      if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(err, assert);
      }
    }

    for (const key in additional) {
      /* istanbul ignore else */
      if (additional.hasOwnProperty(key) && key !== 'message' && key !== 'stack') {
        try {
          err[key] = typeof additional[key] === 'function' ? additional[key].call() : additional[key];
        } catch (e) /* istanbul ignore next */ {
          err[key] = `ERR: ${e.message}`;
        }
      }
    }

    throw err;
  }

  return true;
}

function createLogger(level = null) {
  /* istanbul ignore next */
  const make = (log, allowed) => allowed.includes(level) ? args => log(JSON.stringify(args, null, 2)) : () => null;
  /* eslint-disable no-console */
  return {
    debug: make(console.log, [ 'debug' ]),
    info: make(console.log, [ 'debug', 'info' ]),
    warn: make(console.warn, [ 'debug', 'info', 'warn' ]),
    error: make(console.error, [ 'debug', 'info', 'warn', 'error' ]),
  };
}

function isEmpty(value) {
  return value === null || value === undefined;
}

function isArrayProperty(property) {
  return property && (property.type === Array || `${property.type}`.toUpperCase() === 'LIST');
}

function isObjectProperty(property) {
  return property && (property.type === Object || `${property.type}`.toUpperCase() === 'MAP');
}

function promiseEachSeries(a, fn) {
  assert(Array.isArray(a), new TypeError('Expected argument to be an array'));
  assert(typeof fn === 'function', new TypeError('Expected argument to be a function'));

  return a.reduce((p, v, i) => p.then(() => fn(v, i, a)), Promise.resolve());
}

function promiseMapAll(a, fn) {
  assert(Array.isArray(a), new TypeError('Expected argument to be an array'));
  assert(typeof fn === 'function', new TypeError('Expected argument to be a function'));

  return Promise.all(a.map(async item => {
    await fn(item);
    return item;
  }));
}

function promiseMapSeries(a, fn) {
  assert(Array.isArray(a), new TypeError('Expected argument to be an array'));
  assert(typeof fn === 'function', new TypeError('Expected argument to be a function'));

  return a.reduce((p, v, i) => p.then(async r => r.concat(await fn(v, i, a))), Promise.resolve([]));
}

function promiseReduceSeries(a, fn, s = undefined) {
  assert(Array.isArray(a), new TypeError('Expected argument to be an array'));
  assert(typeof fn === 'function', new TypeError('Expected argument to be a function'));

  return a.reduce((p, v, i) => p.then(r => fn(r, v, i, a)), Promise.resolve(s === undefined ? a[0] || null : s));
}

module.exports = {
  assert,
  createLogger,
  isEmpty,
  isArrayProperty,
  isObjectProperty,
  isPlainObject,
  marshall,
  unmarshall,
  promiseEachSeries,
  promiseMapAll,
  promiseMapSeries,
  promiseReduceSeries,
};
