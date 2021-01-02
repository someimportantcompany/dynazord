const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');

function assertValidProperties(properties, prefix = '') {
  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      try {
        const { [key]: property } = properties;
        assert(isPlainObject(property), new TypeError('Expected property to be a plain object'));

        assert(!property.hasOwnProperty('enum') || Array.isArray(property.enum),
          new Error('Expected enum to be an array of values'));

        assert(!property.hasOwnProperty('validate') || isPlainObject(property.validate),
          new Error('Expected validate to be an object'));

        if (property.validate) {
          if (property.type && isPlainObject(types[property.type])) {
            const { [property.type]: type } = types;
            const builtIn = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
            assert(builtIn.length === 0 || isPlainObject(type.validate),
              new TypeError('This field type doesn\'t have any built-in validators'));
            builtIn.forEach(k => assert(typeof type.validate[k] === 'function',
              new TypeError(`Unknown validator ${k} for field`)));
          } else {
            const nonFunctions = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
            assert(nonFunctions.length === 0, new TypeError('All custom types must have function validators'));
          }
        }
      } catch (err) /* istanbul ignore next */ {
        err.message = `${prefix}${key}: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  assertValidProperties,
};
