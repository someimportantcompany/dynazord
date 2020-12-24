const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');
/* eslint-disable no-invalid-this */

async function formatReadData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;

      let value = data.hasOwnProperty(key) ? data[key] : undefined;

      if (type && typeof type.get === 'function') {
        value = await type.get.call(type, value, property); // eslint-disable-line no-useless-call
      }
      if (typeof property.get === 'function') {
        value = await property.get.call(property, value); // eslint-disable-line no-useless-call
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
  formatReadData,
};
