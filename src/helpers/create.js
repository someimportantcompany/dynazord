const { assert, isPlainObject } = require('../utils');

function assertValidCreateProperties(create) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected create to be a plain object'));

  const missingProps = Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.required === true && !property.hasOwnProperty('default') && !create.hasOwnProperty(key);
  });
  assert(missingProps.length === 0, new Error('Expected all required fields to be set'), {
    code: 'DYNAMODEL_MISSING_REQUIRED_FIELDS',
    fields: missingProps,
  });

  const additionalProps = Object.keys(create).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error('Unexpected properties on argument'), {
    code: 'DYNAMODEL_FOUND_ADDITIONAL_FIELDS',
    fields: additionalProps,
  });
}

async function appendCreateDefaultProps(create) {
  const { properties, options } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(create), new TypeError('Expected create to be a plain object'));

  await Promise.all(Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.hasOwnProperty('default') && !create.hasOwnProperty(key);
  }).map(async key => {
    const { [key]: { default: defaultValue } } = properties;
    create[key] = typeof defaultValue === 'function' ? (await defaultValue()) : defaultValue;
  }));

  if (options.createdAtTimestamp === true) {
    create.createdAt = new Date();
  }
  if (options.updatedAtTimestamp === true) {
    create.updatedAt = new Date();
  }
}

module.exports = {
  appendCreateDefaultProps,
  assertValidCreateProperties,
};
