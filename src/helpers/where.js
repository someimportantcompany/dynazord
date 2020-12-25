const { assert, isPlainObject } = require('../utils');

const operators = {
  and: Symbol('AND'),
  or: Symbol('OR'),

  eq: Symbol('EQUALS'),
  gt: Symbol('GREATER-THAN'),
  gte: Symbol('GREATER-THAN-OR-EQUAL'),
  lt: Symbol('LESS-THAN'),
  lte: Symbol('LESS-THAN-OR-EQUAL'),
  btw: Symbol('BETWEEN'),
};

function buildFilterExpression(where) {
  const names = {};
  const values = {};

  let i = 0;
  const pushVariables = (key, op, value) => {
    i++; // eslint-disable-line no-plusplus
    names[`#${i}`] = key;
    values[`:${i}`] = value;
    return `#${i} ${op} :${i}`;
  };

  const assertValueType = value => assert([ 'string', 'number', 'boolean', 'date' ].includes(typeof value),
    new TypeError('Expected value to be a valid type: string, number, boolean, date'));

  const buildFilterSegment = (prefix2, block) => {
    const { [operators.and]: and, [operators.or]: or, ...rest } = block;
    const segments = [];

    if (and) {
      assert(Array.isArray(and) || isPlainObject(and), new TypeError('Expected where { and } to be an array or plain object'));
      const blocks = (Array.isArray(and) ? and : [ and ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected every where { and } to be a plain object'));
        return buildFilterSegment(`${prefix2}a`, b);
      });
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' AND ')})`) : undefined;
    } else if (or) {
      assert(Array.isArray(or) || isPlainObject(or), new TypeError('Expected where { or } to be an array or plain object'));
      const blocks = (Array.isArray(or) ? or : [ or ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected every where { or } to be a plain object'));
        return buildFilterSegment(`${prefix2}o`, b);
      });
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' OR ')})`) : undefined;
    }

    for (const key in rest) {
      if (rest.hasOwnProperty(key)) {
        const { [key]: value } = rest;
        if (isPlainObject(value)) {
          const { eq, gt, gte, lt, lte, btw } = operators;
          if (value.hasOwnProperty(eq)) {
            assertValueType(value[eq]);
            segments.push(pushVariables(key, '=', value[eq]));
          } else if (value.hasOwnProperty(gt)) {
            assertValueType(value[gt]);
            segments.push(pushVariables(key, '>', value[gt]));
          } else if (value.hasOwnProperty(gte)) {
            assertValueType(value[gte]);
            segments.push(pushVariables(key, '>=', value[gte]));
          } else if (value.hasOwnProperty(lt)) {
            assertValueType(value[lt]);
            segments.push(pushVariables(key, '<', value[lt]));
          } else if (value.hasOwnProperty(lte)) {
            assertValueType(value[lte]);
            segments.push(pushVariables(key, '<=', value[lte]));
          } else if (value.hasOwnProperty(btw)) {
            assertValueType(value[btw]);
            segments.push(pushVariables(key, 'BETWEEN', value[btw]));
          }
        } else {
          assertValueType(rest[key]);
          segments.push(pushVariables(key, '=', rest[key]));
        }
      }
    }

    return segments.length ? segments.join(' AND ') : null;
  };

  const expression = buildFilterSegment('f', where);
  if (expression) {
    return { expression, names, values };
  } else {
    return null;
  }
}

function buildProjectionExpression(attributes) {
  assert(Array.isArray(attributes) && attributes.length, new TypeError('Expected attributes to be an array'));
  const names = attributes.reduce((r, v, i) => ({ ...r, [`#a${i + 1}`]: v }), {});
  const expression = Object.keys(names).join(', ');
  return { expression, names };
}

module.exports = {
  operators,
  buildFilterExpression,
  buildProjectionExpression,
};
