const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');

function assertValidProperties(properties) {
  const assertEachProperty = (key, property) => {
    assert(isPlainObject(property), new TypeError('Expected property to be a plain object'), { key });
    const { [property.type]: type } = types;

    // String.value properties should only be assigned to string types, and should not be on a nested object
    assert(!property.hasOwnProperty('composite') || (property.type === String || property.type === 'STRING'),
      new TypeError('Expected composite property to be assigned to string types'));
    assert(!property.hasOwnProperty('composite') || typeof property.composite === 'string',
      new TypeError('Expected composite property to be a string'));
    assert(!property.hasOwnProperty('composite') || !key.includes('.'),
      new TypeError('Nested properties cannot have a composite property'));
    if (property.hasOwnProperty('composite')) {
      Object.assign(property, buildCompositeValue(properties, property.composite));
    }

    assert(!property.hasOwnProperty('enum') || Array.isArray(property.enum),
      new Error('Expected enum to be an array of values'), { key });

    assert(!property.hasOwnProperty('validate') || property.validate === undefined || isPlainObject(property.validate),
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
      assertEachProperty(`${key}[i]`, property.properties);
    }

    if (property.properties && (property.type === Object || `${property.type}`.toUpperCase() === 'MAP')) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });

      for (const key2 in property.properties) {
        /* istanbul ignore else */
        if (property.properties.hasOwnProperty(key2)) {
          assert(typeof key2 === 'string', new TypeError('Expected key to be a string'), { key: `${key}.${key2}` });
          assert(!key2.includes('.'), new TypeError('A nested property key cannot include a dot'), { key: `${key}.${key2}` });
          assertEachProperty(`${key}.${key2}`, property.properties[key2]);
        }
      }
    }
  };

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      try {
        assert(typeof key === 'string', new TypeError('Expected key to be a string'), { key });
        assert(!key.includes('.'), new TypeError('A property key cannot include a dot'), { key });
        assertEachProperty(key, properties[key]);
      } catch (err) /* istanbul ignore next */ {
        err.message = `${err.key}: ${err.message}`;
        throw err;
      }
    }
  }
}

function buildCompositeValue(properties, composite) {
  assert(typeof composite === 'string', new TypeError('Expected composite to be a string'));

  const pattern = /\{(.*?)\}/g;
  const valueKeys = Array.from(composite.matchAll(pattern)).map(match => match[1]);

  const set = (v, entry) => composite.replace(pattern, (m, key) => entry.hasOwnProperty(key) ? entry[key] : '');

  return {
    variableProperties: valueKeys.reduce(((list, key) => {
      const { type, default: d, required } = properties[key];
      return { ...list, [key]: { type, default: d, required } };
    }), {}),
    default: set,
    onCreate: set,
    // onUpdate: set,
    // onUpsert: set,
  };
}

function isValidKeyScalar(field) {
  return field && field.type && (checks => checks.filter(a => a === true).length === 1)([
    // "The only data types allowed for key attributes are string, number, or binary"
    // @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
    field.type === 'STRING', field.type === String,
    field.type === 'NUMBER', field.type === Number,
    field.type === 'BINARY', field.type === Buffer,
    // Technically, Dynazord "Date" types are String/Number underneath
    field.type === 'DATE', field.type === Date,
  ]);
}

function validateIndexProperties(properties, ref, { hash, range }) {
  assert(typeof hash === 'string', new TypeError(`Expected ${ref} hash property to be a string`));
  assert(properties[hash], new TypeError(`Expected ${ref} ${hash} to be a property`));
  assert(isValidKeyScalar(properties[hash]), new TypeError(`Expected ${ref} ${hash} property to be a valid key scalar`));
  if (ref === 'keySchema') {
    const { required, composite } = properties[hash];
    if (typeof composite === 'string') {
      const { variableProperties: variables } = properties[hash];
      assert(isPlainObject(variables), new TypeError(`Expected variables to exist for ${ref} ${hash}`));
      for (const key in variables) {
        if (variables.hasOwnProperty(key)) {
          assert(properties[key].required === true, new TypeError(`Expected ${ref} ${hash} variable ${key} to be required`));
        }
      }
    } else {
      assert(required === true, new TypeError(`Expected ${ref} ${hash} property to be required`));
    }
  }

  assert(!range || typeof range === 'string', new TypeError(`Expected ${ref} range property to be a string`));
  assert(!range || properties[range], new TypeError(`Expected ${ref} ${range} to be a property`));
  assert(!range || isValidKeyScalar(properties[range]), new TypeError(`Expected ${ref} ${range} property to be a valid key scalar`));
  if (ref === 'keySchema' && range) {
    const { required, composite } = properties[range];
    if (typeof composite === 'string') {
      const { variableProperties: variables } = properties[range];
      assert(isPlainObject(variables), new TypeError(`Expected variables to exist for ${ref} ${range}`));
      for (const key in variables) {
        if (variables.hasOwnProperty(key)) {
          assert(properties[key].required === true, new TypeError(`Expected ${ref} ${range} variable ${key} to be required`));
        }
      }
    } else {
      assert(required === true, new TypeError(`Expected ${ref} ${range} property to be required`));
    }
  }
}

module.exports = {
  assertValidProperties,
  buildCompositeValue,
  isValidKeyScalar,
  validateIndexProperties,
};
