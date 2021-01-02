const { assert, isPlainObject } = require('../utils');

function createHooks(hooks) {
  assert(isPlainObject(hooks), new Error('Expected hooks to be a plain object'));

  for (const key in hooks) {
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
    assert(key && typeof key === 'string', new TypeError('Expected hooks.on key argument to be a string'));
    assert(validHooks.includes(key), new TypeError('Expected hooks.on argument to be a valid hook'), { hook: key });

    this.hooks[key] = isPlainObject(this.hooks[key]) ? this.hooks[key] : {};
    this.hooks[key].push(fn);
  },
  async emit(key, fire = true, ...params) {
    if (fire && this.hooks && Array.isArray(this.hooks[key]) && this.hooks[key].length) {
      await Promise.all(this.hooks[key].map(fn => fn(...params)));
    }
  },
};

const validHooks = [
  'beforeBulkCreate',
  'beforeBulkUpdate',
  'beforeBulkDestroy',
  'beforeBulkUpsert',

  'beforeValidateCreate',
  'beforeValidateUpdate',
  'beforeValidateUpsert',
  'afterValidateCreate',
  'afterValidateUpdate',
  'afterValidateUpsert',
  'validateCreateFailed',
  'validateUpdateFailed',
  'validateUpsertFailed',

  'beforeCreate',
  'beforeUpdate',
  'beforeDestroy',
  'beforeUpsert',
  'beforeCreateWrite',
  'beforeUpdateWrite',
  'beforeDestroyWrite',
  'beforeUpsertWrite',

  'afterCreateWrite',
  'afterUpdateWrite',
  'afterDestroyWrite',
  'afterUpsertWrite',
  'afterCreate',
  'afterUpdate',
  'afterDestroy',
  'afterUpsert',

  'afterBulkCreate',
  'afterBulkUpdate',
  'afterBulkDestroy',
];

module.exports = {
  createHooks,
  validHooks,
};
