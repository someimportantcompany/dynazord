const { assert } = require('./utils');

module.exports = {
  [String]: {
    validate: {
      type: value => typeof value === 'string',
      notNull: value => value !== null,
      notEmpty: value => typeof value === 'string' && value.length > 0,
    },
  },
  [Number]: {
    validate: {
      type: value => typeof value === 'number',
      notNull: value => value !== null,
      notEmpty: value => typeof value === 'number',
      isUnsigned: value => parseInt(value, 10) > 0,
    },
  },
  [Boolean]: {
    validate: {
      type: value => typeof value === 'boolean',
      notNull: value => value !== null,
      notEmpty: value => typeof value === 'boolean',
    },
  },
  [Date]: {
    get(value) {
      assert(typeof value === 'number', new TypeError('Expected value to be a number'), { value });
      return new Date(value);
    },
    set(value) {
      assert(value instanceof Date, new TypeError('Expected value to be an instance of Date'), { value });
      return value.getTime();
    },
    validate: {
      type: value => value instanceof Date,
      notNull: value => value !== null,
    },
  },
  // STRINGSET: {
  //   validate: {
  //     type: value => typeof value === 'string',
  //     notNull: value => value !== null,
  //     notEmpty: value => typeof value === 'string' && value.length > 0,
  //   },
  // },
  // NUMBERSET: {
  //   validate: {
  //     type: value => typeof value === 'string',
  //     notNull: value => value !== null,
  //     notEmpty: value => typeof value === 'string' && value.length > 0,
  //   },
  // },
};
