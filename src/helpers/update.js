const { assert, isEmpty, isPlainObject } = require('../utils');
const { types } = require('../types');
/* eslint-disable no-invalid-this */

function assertRequiredUpdateProps(data) {
  const { properties } = this; // eslint-disable-line no-invalid-this
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected create to be a plain object'));

  for (const key in data) {
    if (data.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
      const { [key]: prop } = properties;
      assert(prop.required === false || !isEmpty(data[key]), new Error(`Required field ${key} cannot be empty/unset`));
      assert(prop.onUpdate !== false, new Error(`Field ${key} cannot be created`));
    }
  }

  const additionalProps = Object.keys(data).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error('Unexpected properties on argument'), {
    code: 'DYNAMODEL_FOUND_ADDITIONAL_FIELDS',
    fields: additionalProps,
  });
}

async function formatUpdateData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  for (const key in data) {
    if (data.hasOwnProperty(key) && properties.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;

      let value = data.hasOwnProperty(key) ? data[key] : undefined;

      if (typeof property.onUpdate === 'function') {
        value = await property.onUpdate.call(property, value); // eslint-disable-line no-useless-call
      }
      if (typeof property.set === 'function') {
        value = await property.set.call(property, value); // eslint-disable-line no-useless-call
      }
      if (type && typeof type.set === 'function') {
        value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
      }

      if (data.hasOwnProperty(key)) {
        data[key] = value;
      } else if (value !== undefined) {
        data[key] = value;
      }
    }
  }
}

function stringifyUpdateStatement(data) {
  const changes = [];
  const names = {};
  const values = {};

  let i = 0;

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      i++; // eslint-disable-line no-plusplus
      changes.push(`#u${i} = :u${i}`);
      names[`#u${i}`] = key;
      values[`:u${i}`] = data[key];
    }
  }

  if (changes.length) {
    return {
      expression: `SET ${changes.join('')}`,
      changes,
      names,
      values,
    };
  } else {
    return null;
  }
}

module.exports = {
  assertRequiredUpdateProps,
  formatUpdateData,
  stringifyUpdateStatement,
};
