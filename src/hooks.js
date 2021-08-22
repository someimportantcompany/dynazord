const { assert, isPlainObject } = require('./utils');

function createHooks(hooks) {
  assert(isPlainObject(hooks), new Error('Expected hooks to be a plain object'));

  for (const key in hooks) {
    /* istanbul ignore else */
    if (hooks.hasOwnProperty(key)) {
      assert(key && typeof key === 'string', new TypeError('Expected hooks key to be a string'));
      assert(validHooks.includes(key), new TypeError('Expected hooks key argument to be a valid hook'), { hook: key });

      if (typeof hooks[key] === 'function') {
        hooks[key] = [ hooks[key] ];
      } else {
        assert(isPlainObject(hooks[key]), new TypeError(`Expected hooks.${key} to be a function or object-of-functions`));
        hooks[key] = Object.values(hooks[key]).map(fn => {
          assert(typeof fn === 'function', new TypeError(`Expected all hooks.${key} values to be a function`));
          return fn;
        });
      }
    }
  }

  return Object.create(hooksProto, {
    hooks: { enumerable: true, value: hooks },
  });
}

const hooksProto = {
  on(key, fn) {
    assert(typeof key === 'string' && key.length, new TypeError('Expected hooks.on key argument to be a string'));
    assert(validHooks.includes(key), new TypeError('Expected hooks.on argument to be a valid hook'), { hook: key });
    assert(typeof fn === 'function', new TypeError('Expected hooks.on function argument to be a function'));
    this.hooks[key] = (Array.isArray(this.hooks[key]) ? this.hooks[key] : []).concat([ fn ]);
  },
  async emit(key, model, fire = true, ...params) {
    if (fire && this.hooks && Array.isArray(this.hooks[key]) && this.hooks[key].length) {
      await Promise.all(this.hooks[key].map(fn => fn.call(model, ...params)));
    }
  },
};

const validHooks = [
  'beforeBulkCreate',
  'beforeBulkUpdate',
  'beforeBulkDelete',
  'beforeBulkUpsert',

  'beforeValidate',
  'beforeValidateCreate',
  'beforeValidateUpdate',
  'beforeValidateUpsert',
  'afterValidate',
  'afterValidateCreate',
  'afterValidateUpdate',
  'afterValidateUpsert',
  'validateFailed',
  'validateCreateFailed',
  'validateUpdateFailed',
  'validateUpsertFailed',

  'beforeCreate',
  'beforeUpdate',
  'beforeDelete',
  'beforeUpsert',
  'beforeCreateWrite',
  'beforeUpdateWrite',
  'beforeDeleteWrite',
  'beforeUpsertWrite',

  'afterCreateWrite',
  'afterUpdateWrite',
  'afterDeleteWrite',
  'afterUpsertWrite',
  'afterCreate',
  'afterUpdate',
  'afterDelete',
  'afterUpsert',

  'afterBulkCreate',
  'afterBulkUpdate',
  'afterBulkDelete',
  'afterBulkUpsert',
];

module.exports = {
  createHooks,
  validHooks,
};
