const _forEach = require('lodash/forEach');
const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const { types } = require('../src/types');

describe('dynazord', () => describe('types', () => {

  before(() => {
    assert(_isPlainObject(types), 'Expected types to be a plain object');
    _forEach(types, (value, key) => {
      assert(_isPlainObject(value), `Expected field ${key} to be a plain object`);
    });
  });

  it('should expose validators for each type', () => {
    _forEach(types, ({ validate }, key) => {
      assert(_isPlainObject(validate), `Expected ${key}.validate to be a plain object`);
    });
    _forEach(types, ({ validate: { type } }, key) => {
      assert.strictEqual(typeof type, 'function', `Expected ${key}.validate.type to be a function`);
    });
  });

  describe('STRING', () => {
    const { STRING: { validate } } = types;

    it('should validate with type', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType('Hello world!', {});
      assertType(undefined, {});
      assertType(null, {});

      try {
        assertType(1, {});
        assert.fail('Should have failed with a number');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a string');
        assert.strictEqual(err.type, 'number');
        assert.strictEqual(err.value, 1);
      }

      try {
        assertType(true, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a string');
        assert.strictEqual(err.type, 'boolean');
        assert.strictEqual(err.value, true);
      }

      try {
        assertType({ a: 'b' }, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a string');
        assert.strictEqual(err.type, 'object');
        assert.deepStrictEqual(err.value, { a: 'b' });
      }
    });

    it('should validate with type + enum', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType('A', { enum: [ 'A', 'B', 'C' ] });

      try {
        assertType('D', { enum: [ 'A', 'B', 'C' ] });
        assert.fail('Should have failed with an invalid enum value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be one of: A, B, C');
        assert.strictEqual(err.value, 'D');
      }
    });

    it('should validate with notNull', () => {
      const { notNull: assertNotNull } = validate;
      assert.strictEqual(typeof assertNotNull, 'function', 'Expected validate.NotNull to be a function');

      assertNotNull('A');

      try {
        assertNotNull(null);
        assert.fail('Should have failed with a NULL value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not-null');
      }
    });

    it('should validate with notEmpty', () => {
      const { notEmpty: assertNotEmpty } = validate;
      assert.strictEqual(typeof assertNotEmpty, 'function', 'Expected validate.NotNull to be a function');

      assertNotEmpty('A');

      try {
        assertNotEmpty('');
        assert.fail('Should have failed with an empty value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not empty');
      }
    });
  });

  describe('NUMBER', () => {
    const { NUMBER: { validate } } = types;

    it('should validate with type', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType(42, {});
      assertType(undefined, {});
      assertType(null, {});

      try {
        assertType('A', {});
        assert.fail('Should have failed with a string');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a number');
        assert.strictEqual(err.type, 'string');
        assert.strictEqual(err.value, 'A');
      }

      try {
        assertType(true, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a number');
        assert.strictEqual(err.type, 'boolean');
        assert.strictEqual(err.value, true);
      }

      try {
        assertType({ a: 'b' }, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a number');
        assert.strictEqual(err.type, 'object');
        assert.deepStrictEqual(err.value, { a: 'b' });
      }
    });

    it('should validate with notNull', () => {
      const { notNull: assertNotNull } = validate;
      assert.strictEqual(typeof assertNotNull, 'function', 'Expected validate.NotNull to be a function');

      assertNotNull(42);

      try {
        assertNotNull(null);
        assert.fail('Should have failed with a NULL value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not-null');
      }
    });

    it('should validate with isUnsigned', () => {
      const { isUnsigned: assertIsUnsigned } = validate;
      assert.strictEqual(typeof assertIsUnsigned, 'function', 'Expected validate.NotNull to be a function');

      assertIsUnsigned(1);

      try {
        assertIsUnsigned(0);
        assert.fail('Should have failed with an empty value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be unsigned');
      }
    });
  });

  describe('BOOLEAN', () => {
    const { BOOLEAN: { validate } } = types;

    it('should validate with type', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType(true, {});
      assertType(undefined, {});
      assertType(null, {});

      try {
        assertType('A', {});
        assert.fail('Should have failed with a string');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a boolean');
        assert.strictEqual(err.type, 'string');
        assert.strictEqual(err.value, 'A');
      }

      try {
        assertType(1, {});
        assert.fail('Should have failed with a number');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a boolean');
        assert.strictEqual(err.type, 'number');
        assert.strictEqual(err.value, 1);
      }

      try {
        assertType({ a: 'b' }, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a boolean');
        assert.strictEqual(err.type, 'object');
        assert.deepStrictEqual(err.value, { a: 'b' });
      }
    });

    it('should validate with notNull', () => {
      const { notNull: assertNotNull } = validate;
      assert.strictEqual(typeof assertNotNull, 'function', 'Expected validate.NotNull to be a function');

      assertNotNull(true);

      try {
        assertNotNull(null);
        assert.fail('Should have failed with a NULL value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not-null');
      }
    });
  });

  describe('DATE', () => {
    const { DATE: { validate } } = types;
    const currentTimestamp = new Date();

    it('should validate with type', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType(currentTimestamp, {});
      assertType(undefined, {});
      assertType(null, {});

      try {
        assertType('A', {});
        assert.fail('Should have failed with a string');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Date');
        assert.strictEqual(err.type, 'string');
        assert.strictEqual(err.value, 'A');
      }

      try {
        assertType(1, {});
        assert.fail('Should have failed with a number');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Date');
        assert.strictEqual(err.type, 'number');
        assert.strictEqual(err.value, 1);
      }

      try {
        assertType(true, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Date');
        assert.strictEqual(err.type, 'boolean');
        assert.deepStrictEqual(err.value, true);
      }
    });

    it('should validate with notNull', () => {
      const { notNull: assertNotNull } = validate;
      assert.strictEqual(typeof assertNotNull, 'function', 'Expected validate.NotNull to be a function');

      assertNotNull(currentTimestamp);

      try {
        assertNotNull(null);
        assert.fail('Should have failed with a NULL value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not-null');
      }
    });
  });

  describe('BINARY', () => {
    const { BINARY: { validate } } = types;
    const content = Buffer.from('Hello, world!', 'utf8');

    it('should validate with type', () => {
      const { type: assertType } = validate;
      assert.strictEqual(typeof assertType, 'function', 'Expected validate.type to be a function');

      assertType(content, {});
      assertType(undefined, {});
      assertType(null, {});

      try {
        assertType('A', {});
        assert.fail('Should have failed with a string');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Buffer');
        assert.strictEqual(err.type, 'string');
        assert.strictEqual(err.value, 'A');
      }

      try {
        assertType(1, {});
        assert.fail('Should have failed with a number');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Buffer');
        assert.strictEqual(err.type, 'number');
        assert.strictEqual(err.value, 1);
      }

      try {
        assertType(true, {});
        assert.fail('Should have failed with a boolean');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be a Buffer');
        assert.strictEqual(err.type, 'boolean');
        assert.deepStrictEqual(err.value, true);
      }
    });

    it('should validate with notNull', () => {
      const { notNull: assertNotNull } = validate;
      assert.strictEqual(typeof assertNotNull, 'function', 'Expected validate.NotNull to be a function');

      assertNotNull(true);

      try {
        assertNotNull(null);
        assert.fail('Should have failed with a NULL value');
      } catch (err) {
        assert(err instanceof Error, 'Expected err to be an instance of Error');
        assert.strictEqual(err.message, 'Expected value to be not-null');
      }
    });
  });

}));
