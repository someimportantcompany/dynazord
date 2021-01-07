const { assert, isPlainObject } = require('../utils');

class DynazordTransactionBlock {
  constructor(model, beforeFn, afterFn) {
    assert(model && isPlainObject(model.transaction), new TypeError('Expected first argument to be a model'));
    assert(typeof beforeFn === 'function', new TypeError('Expected second argument to be a function'));
    assert(afterFn === undefined || typeof afterFn === 'function', new TypeError('Expected third argument to be a function'));

    Object.defineProperties(this, {
      model: { enumerable: true, value: model },
      before: { enumerable: true, value: beforeFn },
      after: { enumerable: true, value: afterFn },
    });
  }
}

module.exports = {
  DynazordTransactionBlock,
};
