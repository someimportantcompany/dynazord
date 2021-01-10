/* eslint-disable global-require */
const methods = {
  create: require('./create'),
  get: require('./get'),
  query: require('./query'),
  scan: require('./scan'),
  update: require('./update'),
  delete: require('./delete'),
  upsert: require('./upsert'),
};

const bulkMethods = {
  bulkCreate: require('./bulkCreate'),
  bulkGet: require('./bulkGet'),
  bulkUpdate: require('./bulkUpdate'),
  bulkDelete: require('./bulkDelete'),
  bulkUpsert: require('./bulkUpsert'),
};

const { runTransaction, ...transactionMethods } = require('./transaction');

module.exports = {
  methods,
  bulkMethods,
  transactionMethods,
  runTransaction,
};
