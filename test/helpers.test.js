const assert = require('assert');
const expressions = require('../src/helpers/expressions');

describe('helpers', () => {
  const currentTime = new Date();

  describe('expressions', () => {

    describe('buildFilterExpression', () => {
      const { buildFilterExpression } = expressions;
      const { and, or, not, eq, ne, lt, lte, gt, gte, in: $in } = expressions.operators;

      function assertFilter(properties, args, expected) {
        return async () => {
          const actual = await buildFilterExpression(properties, args);
          assert.deepStrictEqual(actual, expected);
        };
      }

      it('should build a filter expression with { a: b }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: 'b',
      }, {
        expression: '#f1 = :f1',
        names: { '#f1': 'a' },
        values: { ':f1': 'b' },
      }));

      it('should build a filter expression with { and: { a: c } }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [and]: { a: 'c' },
      }, {
        expression: '(#fa1 = :fa1)',
        names: { '#fa1': 'a' },
        values: { ':fa1': 'c' },
      }));

      it('should build a filter expression with { and: [ { a: c }, { d: c } ] }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [and]: [
          { a: 'c' },
          { d: 'c' },
        ],
      }, {
        expression: '(#fa1 = :fa1 AND #fa2 = :fa2)',
        names: { '#fa1': 'a', '#fa2': 'd' },
        values: { ':fa1': 'c', ':fa2': 'c' },
      }));

      it('should build a filter expression with { or: { a: c } }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [or]: { a: 'c' },
      }, {
        expression: '(#fo1 = :fo1)',
        names: { '#fo1': 'a' },
        values: { ':fo1': 'c' },
      }));

      it('should build a filter expression with { or: [ { a: c }, { d: c } ] }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [or]: [
          { a: 'c' },
          { d: 'c' },
        ],
      }, {
        expression: '(#fo1 = :fo1 OR #fo2 = :fo2)',
        names: { '#fo1': 'a', '#fo2': 'd' },
        values: { ':fo1': 'c', ':fo2': 'c' },
      }));

      it('should build a filter expression with { not: { a: c } }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [not]: { a: 'c' },
      }, {
        expression: 'NOT (#fn1 = :fn1)',
        names: { '#fn1': 'a' },
        values: { ':fn1': 'c' },
      }));

      it('should build a filter expression with { not: [ { a: c }, { d: c } ] }', assertFilter({
        a: { type: 'STRING' },
        d: { type: 'STRING' },
      }, {
        [not]: [
          { a: 'c' },
          { d: 'c' },
        ],
      }, {
        expression: 'NOT (#fn1 = :fn1 AND #fn2 = :fn2)',
        names: { '#fn1': 'a', '#fn2': 'd' },
        values: { ':fn1': 'c', ':fn2': 'c' },
      }));

      it('should build a filter expression with { a: { eq: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [eq]: 'b' }
      }, {
        expression: '#f1 = :f1',
        names: { '#f1': 'a' },
        values: { ':f1': 'b' },
      }));

      it('should build a filter expression with { a: { ne: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [ne]: 'b' }
      }, {
        expression: '#f1 <> :f1',
        names: { '#f1': 'a' },
        values: { ':f1': 'b' },
      }));

      it('should build a filter expression with { a: { lt: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lt]: 'b' }
      }, {
        expression: '#f1 < :f1l',
        names: { '#f1': 'a' },
        values: { ':f1l': 'b' },
      }));

      it('should build a filter expression with { a: { gt: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [gt]: 'b' }
      }, {
        expression: '#f1 > :f1r',
        names: { '#f1': 'a' },
        values: { ':f1r': 'b' },
      }));

      it('should build a filter expression with { a: { lt: b, gt: c } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lt]: 'b', [gt]: 'c' }
      }, {
        expression: '#f1 < :f1l AND #f1 > :f1r',
        names: { '#f1': 'a' },
        values: { ':f1l': 'b', ':f1r': 'c' },
      }));

      it('should build a filter expression with { a: { lte: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lte]: 'b' }
      }, {
        expression: '#f1 <= :f1l',
        names: { '#f1': 'a' },
        values: { ':f1l': 'b' },
      }));

      it('should build a filter expression with { a: { gte: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [gte]: 'b' }
      }, {
        expression: '#f1 >= :f1r',
        names: { '#f1': 'a' },
        values: { ':f1r': 'b' },
      }));

      it('should build a filter expression with { a: { lte: b, gte: c } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lte]: 'b', [gte]: 'c' }
      }, {
        expression: '#f1 <= :f1l AND #f1 >= :f1r',
        names: { '#f1': 'a' },
        values: { ':f1l': 'b', ':f1r': 'c' },
      }));

      it('should build a filter expression with { a: { in: [ b, c ] } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [$in]: [ 'b', 'c' ] }
      }, {
        expression: '#f1 IN (:f1l0, :f1l1)',
        names: { '#f1': 'a' },
        values: { ':f1l0': 'b', ':f1l1': 'c' },
      }));

      it('should build a filter expression with { a: currentTime }', assertFilter({
        a: { type: 'DATE' },
      }, {
        a: currentTime,
      }, {
        expression: '#f1 = :f1',
        names: { '#f1': 'a' },
        values: { ':f1': currentTime.toISOString() },
      }));

      it('should return a NULL filter expression with {}', assertFilter({}, {}, null));

    });

    describe('buildKeyExpression', () => {
      const { buildKeyExpression } = expressions;
      const { eq, lt, lte, gt, gte } = expressions.operators;

      function assertFilter(properties, args, expected) {
        return async () => {
          const actual = await buildKeyExpression(properties, args);
          assert.deepStrictEqual(actual, expected);
        };
      }

      it('should build a key expression with { a: b }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: 'b',
      }, {
        expression: '#k1 = :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: { eq: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [eq]: 'b' }
      }, {
        expression: '#k1 = :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: { lt: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lt]: 'b' }
      }, {
        expression: '#k1 < :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: { gt: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [gt]: 'b' }
      }, {
        expression: '#k1 > :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: { lte: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [lte]: 'b' }
      }, {
        expression: '#k1 <= :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: { gte: b } }', assertFilter({
        a: { type: 'STRING' },
      }, {
        a: { [gte]: 'b' }
      }, {
        expression: '#k1 >= :k1',
        names: { '#k1': 'a' },
        values: { ':k1': 'b' },
      }));

      it('should build a key expression with { a: currentTime }', assertFilter({
        a: { type: 'DATE' },
      }, {
        a: currentTime,
      }, {
        expression: '#k1 = :k1',
        names: { '#k1': 'a' },
        values: { ':k1': currentTime.toISOString() },
      }));

      it('should build a key expression with { and: { a: c } }', async () => {
        try {
          const { and } = expressions.operators;
          await buildKeyExpression({ a: { type: 'STRING' } }, { [and]: { a: 'c' } });
        } catch (err) {
          assert.ok(err instanceof TypeError, 'Expected err to be an instance of TypeError');
          assert.strictEqual(err.message, 'You cannot use the AND operator with keyCondition');
        }
      });

      it('should build a key expression with { or: { a: c } }', async () => {
        try {
          const { or } = expressions.operators;
          await buildKeyExpression({ a: { type: 'STRING' } }, { [or]: { a: 'c' } });
        } catch (err) {
          assert.ok(err instanceof TypeError, 'Expected err to be an instance of TypeError');
          assert.strictEqual(err.message, 'You cannot use the OR operator with keyCondition');
        }
      });

      it('should build a key expression with { not: { a: c } }', async () => {
        try {
          const { not } = expressions.operators;
          await buildKeyExpression({ a: { type: 'STRING' } }, { [not]: { a: 'c' } });
        } catch (err) {
          assert.ok(err instanceof TypeError, 'Expected err to be an instance of TypeError');
          assert.strictEqual(err.message, 'You cannot use the NOT operator with keyCondition');
        }
      });

      it('should return a NULL key expression with {}', assertFilter({}, {}, null));

    });

    describe('buildProjectionExpression', () => {
      const { buildProjectionExpression } = expressions;

      function assertFilter(args, expected) {
        return () => {
          const actual = buildProjectionExpression(args);
          assert.deepStrictEqual(actual, expected);
        };
      }

      it('should build a projection expression with [ a, b, c ]', assertFilter([ 'a', 'b', 'c' ], {
        expression: '#p1, #p2, #p3',
        names: { '#p1': 'a', '#p2': 'b', '#p3': 'c' },
      }));

      it('should return a NULL projection expression with []', assertFilter([], null));
    });

  });
});
