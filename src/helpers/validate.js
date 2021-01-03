const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');

function assertValidProperties(properties) {
  const assertValidProperty = (key, property) => {
    assert(isPlainObject(property), new TypeError('Expected property to be a plain object'), { key });

    const { [property.type]: type } = types;
    assert(isPlainObject(type), new TypeError('Expected property.type to be a valid type'),
      { key, type: `${property.type}` });

    assert(!property.hasOwnProperty('enum') || Array.isArray(property.enum),
      new Error('Expected enum to be an array of values'), { key });

    assert(!property.hasOwnProperty('validate') || isPlainObject(property.validate),
      new Error('Expected validate to be an object'), { key });

    if (property.validate) {
      assert(isPlainObject(property.validate), new TypeError('Expected validate to be a plain object'), { key });
      const builtIn = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
      assert(builtIn.length === 0 || isPlainObject(type.validate),
        new TypeError('This field type doesn\'t have any built-in validators'), { key });
      builtIn.forEach(k => assert(typeof type.validate[k] === 'function',
        new TypeError(`Unknown validator ${k} for field`), { key }));
    }

    if (property.properties && (property.type === Array || `${property.type}`.toUpperCase() === 'LIST')) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assertValidProperty(`${key}[i]`, property.properties);
    }

    if (property.properties && (property.type === Object || `${property.type}`.toUpperCase() === 'MAP')) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });

      for (const key2 in property.properties) {
        /* istanbul ignore else */
        if (property.properties.hasOwnProperty(key2)) {
          assertValidProperty(`${key}.${key2}`, property.properties[key2]);
        }
      }
    }
  };

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      try {
        assertValidProperty(key, properties[key]);
      } catch (err) {
        err.message = `${err.key}: ${err.message}`;
      }
    }
  }
}

module.exports = {
  assertValidProperties,
};
