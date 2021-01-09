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

async function buildFilterExpression(prefix, properties, where) {
  assert(typeof prefix === 'string', new TypeError('Expected prefix to be a string'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));
  assert(isPlainObject(where), new TypeError('Expected where to be a plain object'));

  const names = {};
  const values = {};

  let i = 0;

  const assertValueType = value => {
    const validType = [ 'string', 'number', 'boolean', 'date' ].includes(typeof value) || (value instanceof Date);
    assert(validType, new TypeError('Expected value to be a valid type: string, number, boolean, date'));
  };

  const formatValue = async (key, value) => {
    const property = getPropertyForKey(properties, key);

    if (property && typeof property.set === 'function') {
      value = await property.set.call(property, value); // eslint-disable-line no-useless-call
    }

    const { [property ? property.type : 'null']: type } = types;
    if (type && typeof type.set === 'function') {
      value = await type.set.call(type, value, property); // eslint-disable-line no-useless-call
    }

    return value;
  };

  const pushVariables = (p1, key, op, value) => {
    i++; // eslint-disable-line no-plusplus
    names[`#${p1}${i}`] = key;
    values[`:${p1}${i}`] = value;
    return `#${p1}${i} ${op} :${p1}${i}`;
  };

  const buildFilterSegment = async (p1, block) => {
    const { [operators.and]: and, [operators.or]: or, [operators.not]: not, ...rest } = block;
    const segments = [];

    if (and) {
      assert(Array.isArray(and) || isPlainObject(and), new TypeError('Expected where { and } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(and) ? and : [ and ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { and } to be a plain object'));
        return buildFilterSegment(`${p1}a`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' AND ')})`) : undefined;
    }

    if (or) {
      assert(Array.isArray(or) || isPlainObject(or), new TypeError('Expected where { or } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(or) ? or : [ or ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { or } to be a plain object'));
        return buildFilterSegment(`${p1}o`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`(${blocks.join(' OR ')})`) : undefined;
    }

    if (not) {
      assert(Array.isArray(not) || isPlainObject(not), new TypeError('Expected where { not } to be an array or plain object'));
      const blocks = await Promise.all((Array.isArray(not) ? not : [ not ]).map(b => {
        assert(isPlainObject(b), new TypeError('Expected each where { or } to be a plain object'));
        return buildFilterSegment(`${p1}n`, b);
      }));
      // eslint-disable-next-line no-unused-expressions
      blocks.length ? segments.push(`NOT (${blocks.join(' AND ')})`) : undefined;
    }

    for (const key in rest) {
      /* istanbul ignore else */
      if (rest.hasOwnProperty(key)) {
        const { [key]: value } = rest;
        if (isPlainObject(value)) {
          const { eq, ne, gt, gte, lt, lte, in: $in } = operators;
          if (value.hasOwnProperty(eq)) {
            assertValueType(value[eq]);
            segments.push(pushVariables(p1, key, '=', await formatValue(key, value[eq])));
          } else if (value.hasOwnProperty(ne)) {
            assertValueType(value[ne]);
            segments.push(pushVariables(p1, key, '<>', await formatValue(key, value[ne])));
          } else if (value.hasOwnProperty(gt) || value.hasOwnProperty(gte) ||
            value.hasOwnProperty(lt) || value.hasOwnProperty(lte)) {
              assert(!(value.hasOwnProperty(gt) && value.hasOwnProperty(gte)),
                new TypeError(`Expected ${key} to only have { gt } or { gte }, not both`));
              assert(!(value.hasOwnProperty(lt) && value.hasOwnProperty(lte)),
                new TypeError(`Expected ${key} to only have { lt } or { lte }, not both`));

              const formatted = {
                [gt]: value.hasOwnProperty(gt) ? (await formatValue(key, value[gt])) : undefined,
                [gte]: value.hasOwnProperty(gte) ? (await formatValue(key, value[gte])) : undefined,
                [lt]: value.hasOwnProperty(lt) ? (await formatValue(key, value[lt])) : undefined,
                [lte]: value.hasOwnProperty(lte) ? (await formatValue(key, value[lte])) : undefined,
              };

              i++; // eslint-disable-line no-plusplus
              names[`#${p1}${i}`] = key;

              if (value.hasOwnProperty(lt) || value.hasOwnProperty(lte)) {
                segments.push(`#${p1}${i} ${value.hasOwnProperty(lte) ? '<=' : '<'} :${p1}${i}l`);
                values[`:${p1}${i}l`] = value.hasOwnProperty(lte) ? formatted[lte] : formatted[lt];
              }
              if (value.hasOwnProperty(gt) || value.hasOwnProperty(gte)) {
                segments.push(`#${p1}${i} ${value.hasOwnProperty(gte) ? '>=' : '>'} :${p1}${i}r`);
                values[`:${p1}${i}r`] = value.hasOwnProperty(gte) ? formatted[gte] : formatted[gt];
              }
          } else if (value.hasOwnProperty($in)) {
            assert(Array.isArray(value[$in]) && value[$in].length, new TypeError(`Expected ${key} to be an array for { in }`));
            value[$in].forEach(v => assertValueType(v));
            const params = await Promise.all(value[$in].map(v => formatValue(key, v)));

            i++; // eslint-disable-line no-plusplus
            names[`#${p1}${i}`] = key;
            const vals = params.map((v, j) => {
              values[`:${p1}${i}l${j}`] = v;
              return `:${p1}${i}l${j}`;
            });
            segments.push(`#${p1}${i} IN (${vals.join(', ')})`);
          }
        } else {
          assertValueType(rest[key]);
          segments.push(pushVariables(p1, key, '=', await formatValue(key, rest[key])));
        }
      }
    }

    return segments.length ? segments.join(' AND ') : null;
  };

  const expression = await buildFilterSegment('f', where);
  /* istanbul ignore else */
  return expression ? { expression, names, values } : null;
}

function buildAttributesExpression(prefix, attributes) {
  assert(typeof prefix === 'string', new TypeError('Expected prefix to be a string'));
  assert(Array.isArray(attributes) && attributes.length, new TypeError('Expected attributes to be an array'));
  const names = attributes.reduce((r, v, i) => ({ ...r, [`#${prefix}${i + 1}`]: v }), {});
  const expression = Object.keys(names).join(', ');
  return { expression, names };
}

module.exports = {
  operators,
  buildFilterExpression,
  buildAttributesExpression,
};
