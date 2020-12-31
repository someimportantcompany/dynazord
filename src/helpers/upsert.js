const { assert, isPlainObject } = require('../utils');
/* eslint-disable no-invalid-this */

function stringifyUpsertStatement(data, exactKeys) {
  assert(isPlainObject(data), new TypeError('Expected data to be a plain object'));
  assert(Array.isArray(exactKeys), new TypeError('Expected exactKeys to be an array'));

  const changes = [];
  const names = {};
  const values = {};

  let i = 0;

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      i++; // eslint-disable-line no-plusplus
      changes.push(exactKeys.includes(key) ? `#u${i} = :u${i}` : `#u${i} = if_not_exists(#u${i}, :u${i})`);
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
  stringifyUpsertStatement,
};
