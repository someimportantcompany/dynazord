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
        } catch (err2) {
          err[key] = `ERR: ${err2.message}`;
        }
      }
    }

    throw err;
  }
}

const log = {
  debug: () => null,
  info: () => null,
  warn: () => null,
  error: () => null,
};

module.exports = {
  assert,
  isPlainObject,
  log,
  marshall,
  unmarshall,
};
