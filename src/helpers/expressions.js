const { assert, isPlainObject } = require('../utils');
const { getPropertyForKey } = require('./data');
const { types } = require('../types');

const operators = {
  and: Symbol('AND'),
  or: Symbol('OR'),
  not: Symbol('NOT'),

  eq: Symbol('EQUALS'),
  ne: Symbol('NOT-EQUALS'),
  gt: Symbol('GREATER-THAN'),
  gte: Symbol('GREATER-THAN-OR-EQUALS'),
  lt: Symbol('LESS-THAN'),
  lte: Symbol('LESS-THAN-OR-EQUALS'),
  in: Symbol('IN'),
};

function assertValueType(value) {
  const validType = [ 'string', 'number', 'boolean', 'date' ].includes(typeof value) || (value instanceof Date);
  assert(validType, new TypeError('Expected value to be a valid type: string, number, boolean, date'));
}

async function formatValue(property, value) {
  if (property && typeof property.set === 'function') {
    value = await property.set.call(property, value); // eslint-disable-line no-useless-call
  }

  const { [property ? property.type : 'null']: type } = types;
  if (type && typeof type.set === 'function') {
    value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
  }

  return value;
}

async function buildFilterExpression(properties, where) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(where), new TypeError('Expected where to be a plain object'));

  const names = {};
  const values = {};

  let i = 0;

  const pushVariables = (prefix, key, op, value) => {
    i++; // eslint-disable-line no-plusplus
    names[`#${prefix}${i}`] = key;
    values[`:${prefix}${i}`] = value;
    return `#${prefix}${i} ${op} :${prefix}${i}`;
  };

  const buildSegment = async (prefix, block) => {
    const { [operators.and]: and, [operators.or]: or, [operators.not]: not, ...rest } = block;
    const segments = [];

    if (and) {
      assert(Array.isArray(and) || isPlainObject(and), new TypeError('Expected where { and } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(and) ? and : [ and ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { and } to be a plain object'));
        return buildSegment(`${prefix}a`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' AND ')})`) : undefined;
    }

    if (or) {
      assert(Array.isArray(or) || isPlainObject(or), new TypeError('Expected where { or } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(or) ? or : [ or ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { or } to be a plain object'));
        return buildSegment(`${prefix}o`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' OR ')})`) : undefined;
    }

    if (not) {
      assert(Array.isArray(not) || isPlainObject(not), new TypeError('Expected where { not } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(not) ? not : [ not ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { or } to be a plain object'));
        return buildSegment(`${prefix}n`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`NOT (${blocks.join(' AND ')})`) : undefined;
    }

    for (const key in rest) {
      /* istanbul ignore else */
      if (rest.hasOwnProperty(key)) {
        const { [key]: value } = rest;
        const property = getPropertyForKey(properties, key);
        assert(isPlainObject(property), new Error(`Expected ${key} to be a valid property`));

        if (isPlainObject(value)) {
          const { eq, ne, gt, gte, lt, lte, in: $in } = operators;
          if (value.hasOwnProperty(eq)) {
            assertValueType(value[eq]);
            segments.push(pushVariables(prefix, key, '=', await formatValue(property, value[eq])));
          } else if (value.hasOwnProperty(ne)) {
            assertValueType(value[ne]);
            segments.push(pushVariables(prefix, key, '<>', await formatValue(property, value[ne])));
          } else if (value.hasOwnProperty(gt) || value.hasOwnProperty(gte) ||
            value.hasOwnProperty(lt) || value.hasOwnProperty(lte)) {
              assert(!(value.hasOwnProperty(gt) && value.hasOwnProperty(gte)),
                new TypeError(`Expected ${key} to only have { gt } or { gte }, not both`));
              assert(!(value.hasOwnProperty(lt) && value.hasOwnProperty(lte)),
                new TypeError(`Expected ${key} to only have { lt } or { lte }, not both`));

              const formatted = {
                [gt]: value.hasOwnProperty(gt) ? (await formatValue(property, value[gt])) : undefined,
                [gte]: value.hasOwnProperty(gte) ? (await formatValue(property, value[gte])) : undefined,
                [lt]: value.hasOwnProperty(lt) ? (await formatValue(property, value[lt])) : undefined,
                [lte]: value.hasOwnProperty(lte) ? (await formatValue(property, value[lte])) : undefined,
              };

              i++; // eslint-disable-line no-plusplus
              names[`#${prefix}${i}`] = key;

              if (value.hasOwnProperty(lt) || value.hasOwnProperty(lte)) {
                segments.push(`#${prefix}${i} ${value.hasOwnProperty(lte) ? '<=' : '<'} :${prefix}${i}l`);
                values[`:${prefix}${i}l`] = value.hasOwnProperty(lte) ? formatted[lte] : formatted[lt];
              }
              if (value.hasOwnProperty(gt) || value.hasOwnProperty(gte)) {
                segments.push(`#${prefix}${i} ${value.hasOwnProperty(gte) ? '>=' : '>'} :${prefix}${i}r`);
                values[`:${prefix}${i}r`] = value.hasOwnProperty(gte) ? formatted[gte] : formatted[gt];
              }
          } else if (value.hasOwnProperty($in)) {
            assert(Array.isArray(value[$in]) && value[$in].length, new TypeError(`Expected ${key} to be an array for { in }`));
            value[$in].forEach(v => assertValueType(v));
            const params = await Promise.all(value[$in].map(v => formatValue(property, v)));

            i++; // eslint-disable-line no-plusplus
            names[`#${prefix}${i}`] = key;
            const vals = params.map((v, j) => {
              values[`:${prefix}${i}l${j}`] = v;
              return `:${prefix}${i}l${j}`;
            });
            segments.push(`#${prefix}${i} IN (${vals.join(', ')})`);
          } else {
            /* istanbul ignore next */
            assert(false, new TypeError(`Unsupported where syntax for ${key}`));
          }
        } else {
          assertValueType(rest[key]);
          segments.push(pushVariables(prefix, key, '=', await formatValue(property, rest[key])));
        }
      }
    }

    return segments.length ? segments.join(' AND ') : null;
  };

  const expression = await buildSegment('f', where);
  /* istanbul ignore else */
  return expression ? { expression, names, values } : null;
}

async function buildKeyExpression(properties, where) {
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(where), new TypeError('Expected where to be a plain object'));

  const names = {};
  const values = {};

  let i = 0;

  const pushVariables = (prefix, key, op, value) => {
    i++; // eslint-disable-line no-plusplus
    names[`#${prefix}${i}`] = key;
    values[`:${prefix}${i}`] = value;
    return `#${prefix}${i} ${op} :${prefix}${i}`;
  };

  const buildSegment = async (prefix, block) => {
    const segments = [];

    assert(!block[operators.and], new TypeError('You cannot use the AND operator with keyCondition'));
    assert(!block[operators.or], new TypeError('You cannot use the OR operator with keyCondition'));
    assert(!block[operators.not], new TypeError('You cannot use the NOT operator with keyCondition'));

    for (const key in block) {
      /* istanbul ignore else */
      if (block.hasOwnProperty(key)) {
        const { [key]: value } = block;
        const property = getPropertyForKey(properties, key);
        assert(isPlainObject(property), new Error(`Expected ${key} to be a valid property`));

        if (isPlainObject(value)) {
          const { eq, gt, gte, lt, lte } = operators;

          const count = (a => a.reduce((b, c) => b + (c ? 1 : 0), 0))([
            value.hasOwnProperty(eq),
            value.hasOwnProperty(lt), value.hasOwnProperty(lte),
            value.hasOwnProperty(gt), value.hasOwnProperty(gte),
          ]);
          assert(count === 1, new Error(`Expected ${key} to have one property underneath`));

          if (value.hasOwnProperty(eq)) {
            assertValueType(value[eq]);
            segments.push(pushVariables(prefix, key, '=', await formatValue(property, value[eq])));
          } else if (value.hasOwnProperty(lt)) {
            assertValueType(value[lt]);
            segments.push(pushVariables(prefix, key, '<', await formatValue(property, value[lt])));
          } else if (value.hasOwnProperty(lte)) {
            assertValueType(value[lte]);
            segments.push(pushVariables(prefix, key, '<=', await formatValue(property, value[lte])));
          } else if (value.hasOwnProperty(gt)) {
            assertValueType(value[gt]);
            segments.push(pushVariables(prefix, key, '>', await formatValue(property, value[gt])));
          } else if (value.hasOwnProperty(gte)) {
            assertValueType(value[gte]);
            segments.push(pushVariables(prefix, key, '>=', await formatValue(property, value[gte])));
          } else {
            /* istanbul ignore next */
            assert(false, new TypeError(`Unsupported where syntax for ${key}`));
          }
        } else {
          assertValueType(block[key]);
          segments.push(pushVariables(prefix, key, '=', await formatValue(property, block[key])));
        }
      }
    }

    return segments.length ? segments.join(' AND ') : null;
  };

  const expression = await buildSegment('k', where);
  /* istanbul ignore else */
  return expression ? { expression, names, values } : null;
}

function buildProjectionExpression(attributes) {
  assert(Array.isArray(attributes), new TypeError('Expected attributes to be an array'));
  const names = attributes.reduce((r, v, i) => ({ ...r, [`#p${i + 1}`]: v }), {});
  return Object.keys(names).length > 0 ? { expression: Object.keys(names).join(', '), names } : null;
}

module.exports = {
  operators,
  buildFilterExpression,
  buildKeyExpression,
  buildProjectionExpression,
};
