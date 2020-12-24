const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');
/* eslint-disable no-invalid-this */

function assertRequiredCreateProps(create) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected create to be a plain object'));

  const required = Object.keys(properties).filter(key => {
    const { [key]: prop } = properties;
    return prop.required === true && !prop.hasOwnProperty('default');
  });

  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      const { [key]: prop } = properties;
      assert(prop.onCreate !== false, new Error(`Field ${key} cannot be created`));

      if (required.find(r => r === key) && !create.hasOwnProperty(key)) {
        required.splice(required.indexOf(key), 1);
      }
    }
  }

  assert(required.length === 0, new Error('Expected all required fields to be set'), {
    code: 'DYNAMODEL_MISSING_REQUIRED_FIELDS',
    fields: required,
  });

  const additionalProps = Object.keys(create).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error('Unexpected properties on argument'), {
    code: 'DYNAMODEL_FOUND_ADDITIONAL_FIELDS',
    fields: additionalProps,
  });
}

async function appendCreateDefaultProps(create) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(create), new TypeError('Expected create to be a plain object'));

  await Promise.all(Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.hasOwnProperty('default') && !create.hasOwnProperty(key);
  }).map(async key => {
    const { [key]: { default: defaultValue } } = properties;
    create[key] = typeof defaultValue === 'function' ? (await defaultValue()) : defaultValue;
  }));
}

async function formatCreateData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;

      let value = data.hasOwnProperty(key) ? data[key] : undefined;

      if (typeof property.onCreate === 'function') {
        value = await property.onCreate(value);
      }
      if (typeof property.set === 'function') {
        value = await property.set(value);
      }
      if (type && typeof type.set === 'function') {
        value = await type.set(value);
      }

      if (data.hasOwnProperty(key)) {
        data[key] = value;
      } else if (value !== undefined) {
        data[key] = value;
      }
    }
  }
}

module.exports = {
  assertRequiredCreateProps,
  appendCreateDefaultProps,
  formatCreateData,
};
