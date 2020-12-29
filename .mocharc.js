const path = require('path');

module.exports = {
  exit: true,
  recursive: true,
  sort: true,
  require: [ 'dotenv/config' ],
  ignore: [ '*node_modules*' ],
  spec: [ './test/*.test.js', './test/**/*.test.js' ],
};
