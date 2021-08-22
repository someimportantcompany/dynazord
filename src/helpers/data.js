const { assert, isArrayProperty, isObjectProperty, isPlainObject } = require('../utils');
const { types } = require('../types');

async function formatReadData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  const formatProperty = async (property, key, value) => {
    const { [property ? property.type : 'null']: type } = types;

    if (type && typeof type.get === 'function') {
      value = await type.get.call(type, value, property); // eslint-disable-line no-useless-call
    }
    if (typeof property.get === 'function') {
      value = await property.get.call(property, value); // eslint-disable-line no-useless-call
    }

    if (isArrayProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assert(Array.isArray(value), new TypeError('Expected value to be an array'), { key });

      for (let i = 0; i < value.length; i++) { // eslint-disable-line no-plusplus
        value[i] = await formatProperty(property.properties, key, value[i]);
      }
    }

    if (isObjectProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });
      assert(isPlainObject(value), new TypeError('Expected value to be a plain object'), { key });

      for (const key2 in value) {
        /* istanbul ignore else */
        if (value.hasOwnProperty(key2) && property.properties.hasOwnProperty(key2)) {
          value[key2] = await formatProperty(property.properties[key2], `${key}[${key2}]`, value[key2]);
        }
      }
    }

    return value;
  };

  for (const key in properties) {
    /* istanbul ignore else */
    if (data.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
      data[key] = await formatProperty(properties[key], key, data[key]);
    }
  }
}

async function formatWriteData(properties, data, opts = {}) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));
  assert(isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  const { fieldHook } = opts;
  assert(!fieldHook || typeof fieldHook === 'string', new TypeError('Expected opts.fieldHook to be a string'));

  const formatProperty = async (property, key, value) => {
    try {
      if (fieldHook && typeof property[fieldHook] === 'function') {
        value = await property[fieldHook].call(property, value); // eslint-disable-line no-useless-call
      }

      if (value !== undefined && typeof property.set === 'function') {
        value = await property.set.call(property, value); // eslint-disable-line no-useless-call
      }

      const { [property ? property.type : 'null']: type } = types;
      if (value !== undefined && type && typeof type.set === 'function') {
        value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
      }
    } catch (err) /* istanbul ignore next */ {
      err.key = key;
      throw err;
    }

    if (isArrayProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assert(Array.isArray(value), new TypeError('Expected value to be an array'), { key });

      for (let i = 0; i < value.length; i++) { // eslint-disable-line no-plusplus
        value[i] = await formatProperty(property.properties, key, value[i]);
      }
    }

    if (isObjectProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });
      assert(isPlainObject(value), new TypeError('Expected value to be a plain object'), { key });

      for (const key2 in value) {
        /* istanbul ignore else */
        if (value.hasOwnProperty(key2) && property.properties.hasOwnProperty(key2)) {
          value[key2] = await formatProperty(property.properties[key2], `${key}[${key2}]`, value[key2]);
        }
      }
    }

    return value;
  };

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      try {
        const value = await formatProperty(properties[key], key, data[key]);
        if (data.hasOwnProperty(key) || value !== undefined) {
          data[key] = value;
        }
      } catch (err) /* istanbul ignore next */ {
        err.message = `[${err.key}]: ${err.message}`;
        throw err;
      }
    }
  }
}

function getPropertyForKey(properties, path, prefix = '') {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(typeof path === 'string' && path.length, new TypeError('Expected path to be a string'));

  const [ key, ...children ] = path.split('.');
  assert(key.length, new TypeError('Expected key to be a string'));

  const { [key]: property } = properties;
  assert(isPlainObject(property), new Error(`Expected ${prefix}${key} to be a valid property`));
  assert(children.length === 0 || isObjectProperty(property),
    new Error(`Expected ${prefix}${key} to be an object since it has child keys: ${children.join('.')}`));

  if (isObjectProperty(property)) {
    assert(children.length > 0, new Error(`Expected ${prefix}${key} to have child keys since it is an object property`));
    if (property.properties) {
      assert(isPlainObject(properties), new TypeError(`Expected ${prefix}${key}.properties to be a plain object`));
      return getPropertyForKey(property.properties, children.join('.'), `${prefix}${key}.`);
    } else {
      return property;
    }
  } else {
    assert(children.length === 0, new Error(`Expected ${prefix}${key} is not an object & cannot have child keys`));
    return property;
  }
}

async function validateData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected create to be a plain object'));

  const validateProperty = async (key, value, property) => {
    try {
      const { [property ? property.type : 'null']: type } = types;
      const propertyValidators = property && isPlainObject(property.validate) ? property.validate : {};
      const { type: assertValidType, ...typeValidators } = type && isPlainObject(type.validate) ? type.validate : {};

      // eslint-disable-next-line no-unused-expressions
      typeof assertValidType === 'function' && assertValidType(value, property);

      for (const vkey in propertyValidators) {
        if (propertyValidators.hasOwnProperty(vkey) && typeof typeValidators[vkey] === 'function' &&
          typeof propertyValidators[vkey] !== 'function') {
            const { [vkey]: validate } = typeValidators;
            const valid = await validate.call(property, value, propertyValidators[vkey]);
            assert(valid !== false, new Error(`Expected ${vkey} to pass`), { key });
        }
      }

      for (const vkey in propertyValidators) {
        if (propertyValidators.hasOwnProperty(vkey) && typeof propertyValidators[vkey] === 'function' &&
          (value !== null || value !== undefined)) {
            const { [vkey]: validate } = propertyValidators;
            const valid = await validate.call(property, value);
            assert(valid !== false, new Error(`Expected ${key} validator ${vkey} to pass`), { key });
        }
      }
    } catch (err) /* istanbul ignore next */ {
      err.key = key;
      throw err;
    }

    if (isArrayProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assert(Array.isArray(value), new TypeError('Expected value to be an array'), { key });

      for (let i = 0; i < value.length; i++) { // eslint-disable-line no-plusplus
        await validateProperty(`${key}[${i}]`, value[i], property.properties);
      }
    }

    if (isObjectProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });
      assert(isPlainObject(value), new TypeError('Expected value to be a plain object'), { key });

      for (const key2 in value) {
        /* istanbul ignore else */
        if (value.hasOwnProperty(key2) && property.properties.hasOwnProperty(key2)) {
          await validateProperty(`${key}[${key2}]`, value[key2], property.properties[key2]);
        }
      }

      const additional = Object.keys(value).filter(key2 => !property.properties.hasOwnProperty(key2));
      assert(additional.length === 0, new Error(`Unexpected properties in nested object: ${additional.join(',')}`), {
        code: 'TOO_MANY_NESTED_FIELDS',
        key,
      });
    }
  };

  for (const key in data) {
    /* istanbul ignore else */
    if (data.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
      try {
        await validateProperty(key, data[key], properties[key]);
      } catch (err) /* istanbul ignore next */ {
        err.message = `[${err.key}]: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  formatReadData,
  formatWriteData,
  getPropertyForKey,
  validateData,
};
