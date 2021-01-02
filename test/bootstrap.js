require('dotenv/config');
require('module-alias/register');

(() => {
  const moduleAlias = require('module-alias');
  const path = require('path');

  moduleAlias.addAliases({
    dynazord: path.resolve(__dirname, '../'),
  });
})();

(() => {
  const dynazord = require('dynazord');
  const { dynamodb } = require('./utils');

  dynazord.setDynamoDB(dynamodb);
})();
