/* eslint-disable global-require */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, './.env') });

const dynazord = require('dynazord');
const { dynamodb } = require('./utils');
dynazord.setDynamoDB(dynamodb);
