const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');

function assertValidProperties(properties, prefix = '') {
  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      try {
        const { [key]: property } = properties;
        assert(isPlainObject(property), new TypeError('Expected property to be a plain object'));

        assert(!property.hasOwnProperty('enum') || Array.isArray(property.enum),
          new Error('Expected enum to be an array of values'));

        if (isPlainObject(property.validate)) {
          if (property.type && isPlainObject(types[property.type])) {
            const { [property.type]: type } = types;
            const builtIn = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
            assert(builtIn.length === 0 || isPlainObject(type.validators),
              new TypeError('This field type doesn\'t have any built-in validators'));
            builtIn.forEach(k => assert(typeof type.validators[k] === 'function',
              new TypeError(`Unknown validator ${k} for field`)));
          } else {
            const nonFunctions = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
            assert(nonFunctions.length === 0, new TypeError('All custom types must have function validators'));
          }
        } else {
          assert(!property.hasOwnProperty('validate') || typeof property.validate === 'function',
            new TypeError('Expected validate to be a function or an object of validators'));
        }
      } catch (err) {
        err.message = `${prefix}${key}: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  assertValidProperties,
};
