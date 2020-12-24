const AWS = require('aws-sdk');
const isPlainObject = require('lodash/isPlainObject');

const { marshall, unmarshall } = AWS.DynamoDB.Converter;

function assert(value, err, additional = {}) {
  if (Boolean(value) === false) {
    if ((err instanceof Error) === false) {
      err = new Error(`${err}`);
      if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(err, assert);
      }
    }

    for (const key in additional) {
      if (additional.hasOwnProperty(key) && key !== 'message' && key !== 'stack') {
        try {
          err[key] = typeof additional[key] === 'function' ? additional[key].call() : additional[key];
        } catch (e) {
          err[key] = `ERR: ${e.message}`;
        }
      }
    }

    throw err;
  }
}

function createLogger({ level }) {
  level = level || process.env.DYNAMODEL_LOG_LEVEL || null;
  const make = (log, allowed) => allowed.includes(level) ? args => log(JSON.stringify(args, null, 2)) : () => null;
  /* eslint-disable no-console */
  return {
    debug: make(console.log, [ 'debug' ]),
    info: make(console.log, [ 'debug', 'info' ]),
    warn: make(console.warn, [ 'debug', 'info', 'warn' ]),
    error: make(console.error, [ 'debug', 'info', 'warn', 'error' ]),
  };
}

module.exports = {
  assert,
  createLogger,
  isPlainObject,
  marshall,
  unmarshall,
};
