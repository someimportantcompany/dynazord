const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const AWS = require('aws-sdk');
const dynamodel = require('../../src');
const { createLogger } = require('../../src/utils');
const { v4: uuid } = require('uuid');

const logger = createLogger();

async function createModel(opts) {
  assert(_isPlainObject(opts), 'Expected createModel opts to be a plain object');

  const { dynamodb, tableName, createTable, keySchema, properties, ...createOpts } = opts;
  assert(dynamodb instanceof AWS.DynamoDB, 'Expected createModel dynamodb to be an instance of AWS.DynamoDB');
  assert(tableName && typeof tableName === 'string', 'Expected createModel opts.tableName to be a string');
  assert(!createTable || _isPlainObject(createTable), 'Expected createModel opts.createTable to be a plain object');
  assert(!keySchema || _isPlainObject(keySchema), 'Expected createModel opts.keySchema to be a plain object');
  assert(!properties || _isPlainObject(properties), 'Expected createModel opts.properties to be a plain object');

  await deleteThenCreateTable(dynamodb, {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    ...createTable,
  });

  return dynamodel.createModel({
    dynamodb,
    tableName,
    keySchema: {
      hash: 'id',
    },
    properties: {
      id: {
        type: String,
        required: true,
        default: () => uuid(),
      },
      ...properties,
    },
    ...createOpts,
  });
}

async function deleteThenCreateTable(dynamodb, opts) {
  assert(dynamodb instanceof AWS.DynamoDB, 'Expected deleteThenCreateTable dynamodb to be an instance of AWS.DynamoDB');
  assert(_isPlainObject(opts), 'Expected deleteThenCreateTable opts to be a plain object');

  const { TableName } = opts;
  assert(TableName && typeof TableName === 'string', 'Expected deleteThenCreateTable opts.TableName to be a string');

  try {
    logger.debug({ deleteTable: { TableName } });
    await dynamodb.deleteTable({ TableName }).promise();
  } catch (err) {
    if (!`${err.message}`.includes('Cannot do operations on a non-existent table')) {
      err.message = `Failed to delete ${TableName}: ${err.message}`;
      throw err;
    }
  }

  try {
    logger.debug({ createTable: opts });
    await dynamodb.createTable(opts).promise();
  } catch (err) {
    err.message = `Failed to create ${TableName}: ${err.message}`;
    throw err;
  }
}

module.exports = {
  createModel,
  deleteThenCreateTable,
};
