const { assert, isPlainObject } = require('../utils');
const { types } = require('../types');

async function formatReadData(properties, data) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;

      const hasProperty = data.hasOwnProperty(key);
      let value = hasProperty ? data[key] : undefined;

      if ((hasProperty || value) && type && typeof type.get === 'function') {
        value = await type.get.call(type, value, property); // eslint-disable-line no-useless-call
      }
      if ((hasProperty || value) && typeof property.get === 'function') {
        value = await property.get.call(property, value); // eslint-disable-line no-useless-call
      }

      /* istanbul ignore else */
      if (hasProperty) {
        data[key] = value;
      } else if (value !== undefined) {
        data[key] = value;
      }
    }
  }
}

async function formatWriteData(properties, data, opts = {}) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));
  assert(isPlainObject(opts), new TypeError('Expected opts to be a plain object'));

  const { fieldHook } = opts;
  assert(!fieldHook || typeof fieldHook === 'string', new TypeError('Expected opts.fieldHook to be a string'));

  for (const key in properties) {
    /* istanbul ignore else */
    if (properties.hasOwnProperty(key)) {
      const { [key]: property } = properties;
      const { [property ? property.type : 'null']: type } = types;

      const hasProperty = data.hasOwnProperty(key);
      let value = data.hasOwnProperty(key) ? data[key] : undefined;

      if (fieldHook && typeof property[fieldHook] === 'function') {
        value = await property[fieldHook].call(property, value); // eslint-disable-line no-useless-call
      }
      if ((hasProperty || value) && typeof property.set === 'function') {
        value = await property.set.call(property, value); // eslint-disable-line no-useless-call
      }
      if ((hasProperty || value) && type && typeof type.set === 'function') {
        value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
      }

      /* istanbul ignore else */
      if (hasProperty) {
        data[key] = value;
      } else if (value !== undefined) {
        data[key] = value;
      }
    }
  }
}

async function validateData(properties, data, prefix = '') {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(data), new TypeError('Expected create to be a plain object'));

  for (const key in data) {
    /* istanbul ignore else */
    if (data.hasOwnProperty(key)) {
      try {
        const { [key]: property } = properties;
        const { [property ? property.type : 'null']: type } = types;

        const propertyValidators = property && isPlainObject(property.validate) ? property.validate : {};
        const { type: assertValidType, ...typeValidators } = type && isPlainObject(type.validate) ? type.validate : {};
        // eslint-disable-next-line no-unused-expressions
        typeof assertValidType === 'function' && assertValidType(data[key], property);

        for (const vkey in propertyValidators) {
          /* istanbul ignore else */
          if (propertyValidators.hasOwnProperty(vkey)) {
            if (typeof propertyValidators[vkey] === 'function') {
              const { [vkey]: validateProperty } = propertyValidators;
              await validateProperty(data[key]);
            } else {
              const { [vkey]: validateType } = typeValidators;
              assert(typeof validateType === 'function', new Error(`Expected validator ${vkey} to be a function`));
              await validateType(data[key], propertyValidators[vkey], property);
            }
          }
        }
      } catch (err) {
        err.message = `Error validating ${prefix}${key}: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  formatReadData,
  formatWriteData,
  validateData,
};
