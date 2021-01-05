const { assert } = require('../utils');

class DynazordTransactionBlock {
  constructor(beforeFn, afterFn) {
    assert(typeof beforeFn === 'function', new TypeError('Expected first argument to be a function'));
    assert(afterFn === undefined || typeof afterFn === 'function', new TypeError('Expected second argument to be a function'));

    Object.defineProperties(this, {
      before: { enumerable: true, value: beforeFn },
      after: { enumerable: true, value: afterFn },
    });
  }
}

module.exports = {
  DynazordTransactionBlock,
};
