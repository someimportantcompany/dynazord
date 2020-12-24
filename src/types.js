const { assert } = require('./utils');

const types = {
  [String]: {
    set(value, field) {
      if (field.hasOwnProperty('enum')) {
        const { enum: values } = field;
        assert(Array.isArray(values), new TypeError('Expected field enum to be an array'));
        assert(values.includes(value), new Error(`Expected value to be one of: ${values.join(', ')}`));
      }

      return value;
    },
    validate: {
      type: value => assert(typeof value === 'string', new Error('Expected value to be a string')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
      notEmpty: value => assert(typeof value === 'string' && value.length > 0, new Error('Expected value to be not empty')),
    },
  },
  [Number]: {
    validate: {
      type: value => assert(typeof value === 'number', new Error('Expected value to be a number')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
      isUnsigned: value => assert(parseInt(value, 10) > 0, new Error('Expected value to be unsigned')),
    },
  },
  [Boolean]: {
    validate: {
      type: value => assert(typeof value === 'boolean', new Error('Expected value to be a boolean')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
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
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
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

module.exports = {
  types,
};
