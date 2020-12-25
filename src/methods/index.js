/* eslint-disable global-require */
const methods = {
  create: require('./create'),
  get: require('./get'),
  find: require('./find'),
  update: require('./update'),
  delete: require('./delete'),
};

const bulkMethods = {
  bulkCreate: require('./bulkCreate'),
  bulkDelete: require('./bulkDelete'),
  bulkGet: require('./bulkGet'),
};

module.exports = {
  methods,
  bulkMethods,
};
