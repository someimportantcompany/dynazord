/* eslint-disable global-require */
const methods = {
  create: require('./create'),
  get: require('./get'),
  find: require('./find'),
  update: require('./update'),
  delete: require('./delete'),
  upsert: require('./upsert'),
};

const bulkMethods = {
  bulkCreate: require('./bulkCreate'),
  bulkGet: require('./bulkGet'),
  bulkDelete: require('./bulkDelete'),
};

module.exports = {
  methods,
  bulkMethods,
};
