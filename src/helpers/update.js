const { assert, isEmpty, isPlainObject } = require('../utils');

function assertRequiredUpdateProps(properties, data) {
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
    code: 'TOO_MANY_FIELDS',
    fields: additionalProps,
  });
}

function stringifyUpdateStatement(data) {
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));

  const changes = [];
  const names = {};
  const values = {};

  let i = 0;

  for (const key in data) {
    /* istanbul ignore else */
    if (data.hasOwnProperty(key)) {
      i++; // eslint-disable-line no-plusplus
      changes.push(`#u${i} = :u${i}`);
      names[`#u${i}`] = key;
      values[`:u${i}`] = data[key];
    }
  }

  if (changes.length) {
    return {
      expression: `SET ${changes.join(', ')}`,
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
  stringifyUpdateStatement,
};
