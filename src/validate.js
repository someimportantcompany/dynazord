const types = require('./types');
const { assert, isPlainObject } = require('./utils');

function assertMissingProperties(properties, entry, err, props = {}) {
  const missingProps = Object.keys(properties).filter(key => properties[key].required === true &&
    !properties[key].hasOwnProperty('default') && !entry.hasOwnProperty(key));
  assert(missingProps.length === 0, err, { fields: missingProps, ...props });
}

function assertValidProperties(properties, prefix = '') {
  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      try {
        const { [key]: property } = properties;
        assert(property && typeof property.type === 'string', new TypeError('Unknown type'));
        assert(types[property.type], new TypeError(`Unknown type passed: ${property.type}`));

        if (isPlainObject(property.validate)) {
          const { [property.type]: field } = types;
          const name = property.type.name || `${property.type}`;
          const builtIn = Object.keys(property.validate).filter(k => typeof property.validate[k] !== 'function');
          assert(!builtIn.length || isPlainObject(field.validate), new TypeError(`Field '${name}' doesn't support validators`));
          builtIn.forEach(k => assert(typeof field.validate[k] === 'function',
            new TypeError(`Unknown validator ${k} for ${name} field`)));
        }
      } catch (err) {
        err.message = `${prefix}${key}: ${err.message}`;
        throw err;
      }
    }
  }
}

module.exports = {
  assertMissingProperties,
  assertValidProperties,
};
