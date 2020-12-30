const { assert, isEmpty } = require('./utils');

const types = {
  STRING: {
    validate: {
      type(value, field) {
        assert(isEmpty(value) || typeof value === 'string', new Error('Expected value to be a string'));

        if (field.hasOwnProperty('enum')) {
          const { enum: values } = field;
          assert(Array.isArray(values), new TypeError('Expected field enum to be an array'));
          assert(values.includes(value), new Error(`Expected value to be one of: ${values.join(', ')}`));
        }
      },
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
      notEmpty: value => assert(typeof value === 'string' && value.length > 0, new Error('Expected value to be not empty')),
    },
  },
  NUMBER: {
    validate: {
      type: value => isEmpty(value) || assert(typeof value === 'number', new Error('Expected value to be a number')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
      isUnsigned: value => assert(parseInt(value, 10) > 0, new Error('Expected value to be unsigned')),
    },
  },
  BOOLEAN: {
    validate: {
      type: value => isEmpty(value) || assert(typeof value === 'boolean', new Error('Expected value to be a boolean')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
    },
  },
  DATE: {
    get(value, { format } = {}) {
      const formatAsNumber = format === Number || format === 'NUMBER' || format === 'Number';
      assert(!formatAsNumber || typeof value === 'number', new TypeError('Expected value to be a number'), { value });
      assert(formatAsNumber || typeof value === 'string', new TypeError('Expected value to be a string'), { value });
      return new Date(value);
    },
    set(value, { format } = {}) {
      assert(value instanceof Date, new TypeError('Expected value to be an instance of Date'), { value });
      const formatAsNumber = format === Number || format === 'NUMBER' || format === 'Number';
      return formatAsNumber ? value.getTime() : value.toISOString();
    },
    validate: {
      type: value => isEmpty(value) || assert(value instanceof Date, new TypeError('Expected value to be a Date')),
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
  BINARY: {
    get(value) {
      return Buffer.from(value, 'binary');
    },
    set(value) {
      assert(value instanceof Buffer, new TypeError('Expected value to be an instance of Buffer'), { value });
      return value.toString('binary');
    },
    validate: {
      type: value => isEmpty(value) || assert(value instanceof Buffer, new TypeError('Expected value to be a Buffer')),
      notNull: value => assert(value !== null, new Error('Expected value to be not-null')),
    },
  },
};

module.exports = {
  types,
  keys: Object.keys(types),
};

/**
 * Fix JS-native types to defined types above
 */
types[String] = types.STRING;
types[Number] = types.NUMBER;
types[Boolean] = types.BOOLEAN;
types[Date] = types.DATE;
// types[Set] = types.SET;
types[Buffer] = types.BINARY;
