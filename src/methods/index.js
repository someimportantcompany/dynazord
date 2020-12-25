/* eslint-disable global-require */
const methods = {
  create: require('./create'),
  get: require('./get'),
  find: require('./find'),
  update: require('./update'),
  delete: require('./delete'),
};

const bulkMethods = {
  // bulkDelete: require('./bulkDelete'),
};

module.exports = {
  methods,
  bulkMethods,
};
