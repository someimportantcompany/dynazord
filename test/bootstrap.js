/* eslint-disable global-require */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.ci') });

const dynazord = require('dynazord');
const { dynamodb } = require('./utils');
dynazord.setDynamoDB(dynamodb);
