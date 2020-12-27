const { assert, isPlainObject } = require('../utils');
/* eslint-disable no-invalid-this */

function assertRequiredCreateProps(data) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  const required = Object.keys(properties).filter(key => {
    const { [key]: prop } = properties;
    return prop.required === true && !prop.hasOwnProperty('default');
  });

  for (const key in data) {
    if (data.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
      const { [key]: prop } = properties;
      assert(prop.onCreate !== false, new Error(`Field ${key} cannot be created`));

      if (required.find(r => r === key) && data.hasOwnProperty(key)) {
        required.splice(required.indexOf(key), 1);
      }
    }
  }

  assert(required.length === 0, new Error('Expected all required fields to be set'), {
    code: 'DYNAMODEL_MISSING_REQUIRED_FIELDS',
    fields: required,
  });

  const additionalProps = Object.keys(data).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error('Unexpected properties on argument'), {
    code: 'DYNAMODEL_FOUND_ADDITIONAL_FIELDS',
    fields: additionalProps,
  });
}

async function appendCreateDefaultProps(data) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  await Promise.all(Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.hasOwnProperty('default') && !data.hasOwnProperty(key);
  }).map(async key => {
    const { [key]: { default: defaultValue } } = properties;
    data[key] = typeof defaultValue === 'function' ? (await defaultValue()) : defaultValue;
  }));
}

module.exports = {
  assertRequiredCreateProps,
  appendCreateDefaultProps,
};
