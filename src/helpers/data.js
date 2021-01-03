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
    } catch (err) {
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
      } catch (err) {
        err.message = `[${err.key}]: ${err.message}`;
        throw err;
      }
    }
  }
}

async function marshallKey(properties, input) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(input), new TypeError('Expected input to be a plain object'));

  const output = {};

  for (const key in input) {
    /* istanbul ignore else */
    if (input.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;
      let { [key]: value } = input;

      if (property && typeof property.set === 'function') {
        value = await property.set.call(property, value); // eslint-disable-line no-useless-call
      }
      if (type && typeof type.set === 'function') {
        value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
      }

      assert([ 'string', 'number' ].includes(typeof value),
        new Error(`Expected key value at ${key} to be a string or number`));

      output[key] = { [typeof value === 'number' ? 'N' : 'S']: `${value}` };
    }
  }

  return output;
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
        /* istanbul ignore else */
        if (propertyValidators.hasOwnProperty(vkey)) {
          if (typeof propertyValidators[vkey] === 'function') {
            const { [vkey]: validate } = propertyValidators;
            const valid = await validate.call(property, value);
            assert(valid !== false, new Error(`Expected ${key} validator ${vkey} to pass`), { key });
          } else {
            const { [vkey]: validate } = typeValidators;
            assert(typeof validate === 'function', new Error(`Expected validator ${vkey} to be a function`), { key });
            const valid = await validate.call(property, value, propertyValidators[vkey]);
            assert(valid !== false, new Error(`Expected ${vkey} to pass`), { key });
          }
        }
      }
    } catch (err) {
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
      } catch (err) {
        err.message = `[${err.key}]: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  formatReadData,
  formatWriteData,
  marshallKey,
  validateData,
};
