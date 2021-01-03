const { assert, isArrayProperty, isObjectProperty, isPlainObject } = require('../utils');

function assertRequiredCreateProps(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties descriptor to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  const assertRequiredProperty = (property, key, value) => {
    assert(isPlainObject(property), new Error('Expected property descriptor to be a plain object'), { key });
    assert(property.onCreate !== false, new Error('Field cannot be created'));

    assert(value !== undefined || property.required !== true || property.hasOwnProperty('default'),
      new Error('Expected required field to be set'), { code: 'MISSING_REQUIRED_FIELD', key, value });

    if (isArrayProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assert(Array.isArray(value), new TypeError('Expected value to be an array'), { key });

      for (let i = 0; i < value.length; i++) { // eslint-disable-line no-plusplus
        assertRequiredProperty(property.properties, `${key}[${i}]`, value[i]);
      }
    }

    if (isObjectProperty(property) && property.properties && value) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });
      assert(isPlainObject(value), new TypeError('Expected value to be a plain object'), { key });

      for (const key2 in value) {
        /* istanbul ignore else */
        if (property.properties.hasOwnProperty(key2)) {
          assertRequiredProperty(property.properties[key2], `${key}.${key2}`, value[key2]);
        }
      }

      const additionalProps = Object.keys(value).filter(key2 => !property.properties.hasOwnProperty(key2));
      assert(additionalProps.length === 0, new Error(`Unexpected properties on nested object: ${additionalProps.join(', ')}`), {
        code: 'TOO_MANY_NESTED_FIELDS',
        key,
      });
    }
  };

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      try {
        assertRequiredProperty(properties[key], key, data[key]);
      } catch (err) {
        err.message = `[${err.key || key}]: ${err.message}`;
        throw err;
      }
    }
  }

  const additionalProps = Object.keys(data).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error(`Unexpected properties on object: ${additionalProps.join(', ')}`), {
    code: 'TOO_MANY_FIELDS',
  });
}

async function appendCreateDefaultProps(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected data to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  const appendCreateDefaults = async (property, object, key) => {
    assert(isPlainObject(property), new Error('Expected property descriptor to be a plain object'), { key });

    if (property.hasOwnProperty('default') && !object.hasOwnProperty(key)) {
      object[key] = typeof property.default === 'function' ? (await property.default()) : property.default;
    }

    if (isArrayProperty(property) && property.properties && object[key]) {
      assert(isPlainObject(property.properties), new TypeError('Expected Array properties to be a plain object'), { key });
      assert(Array.isArray(object[key]), new TypeError('Expected value to be an array'), { key });

      for (let i = 0; i < object[key].length; i++) { // eslint-disable-line no-plusplus
        await appendCreateDefaults(property.properties, object[key][i], `${key}[${i}]`);
      }
    }

    if (isObjectProperty(property) && property.properties && object[key]) {
      assert(isPlainObject(property.properties), new TypeError('Expected Object properties to be a plain object'), { key });
      assert(isPlainObject(object[key]), new TypeError('Expected value to be a plain object'), { key });

      for (const key2 in object[key]) {
        /* istanbul ignore else */
        if (property.properties.hasOwnProperty(key2)) {
          await appendCreateDefaults(property.properties[key2], object[key][key2], `${key}.${key2}`);
        }
      }

      const additionalProps = Object.keys(data).filter(key2 => !property.properties.hasOwnProperty(key2));
      assert(additionalProps.length === 0, new Error('Unexpected properties on nested object'), {
        code: 'TOO_MANY_NESTED_FIELDS',
        fields: additionalProps,
        key,
      });
    }
  };

  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      try {
        await appendCreateDefaults(properties[key], data, key);
      } catch (err) {
        err.message = `${err.key || key} ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  assertRequiredCreateProps,
  appendCreateDefaultProps,
};
