const _forEach = require('lodash/forEach');
const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const { types } = require('../src/types');

describe('dynamodel/types', () => {

  it('should expose an object of types', () => {
    assert(_isPlainObject(types), 'Expected types to be a plain object');
    _forEach(types, (value, key) => {
      assert(_isPlainObject(value), `Expected field ${key} to be a plain object`);
    });

    _forEach(types, ({ validate }, key) => {
      assert(_isPlainObject(validate), `Expected ${key}.validate to be a plain object`);
    });
    _forEach(types, ({ validate: { type } }, key) => {
      assert.strictEqual(typeof type, 'function', `Expected ${key}.validate.type to be a function`);
    });
  });

});
