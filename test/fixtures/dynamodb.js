const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const AWS = require('aws-sdk');
const dynazord = require('../../src');
const { createLogger } = require('../../src/utils');
const { v4: uuid } = require('uuid');

const logger = createLogger(process.env.DYNAZORD_LOG_LEVEL);

async function assertItem(dynamodb, getItemOpts, expected) {
  getItemOpts.TableName = typeof getItemOpts.TableName === 'string' ? getItemOpts.TableName : 'dynazord-test-entries';
  getItemOpts.ConsistentRead = typeof getItemOpts.ConsistentRead === 'boolean' ? getItemOpts.ConsistentRead : true;

  logger.debug({ getItem: getItemOpts });
  const result = await dynamodb.getItem(getItemOpts).promise();
  const actual = _isPlainObject(result.Item) ? result.Item : null;
  assert.deepStrictEqual(actual, expected, 'Expected item in DynamoDB to deepStrictEqual');
}

async function createTestModel(opts) {
  assert(_isPlainObject(opts), 'Expected createTestModel opts to be a plain object');

  const { dynamodb, tableName, createTable, options, ...createOpts } = opts;
  assert(dynamodb instanceof AWS.DynamoDB, 'Expected createTestModel dynamodb to be an instance of AWS.DynamoDB');
  assert(!tableName || typeof tableName === 'string', 'Expected createTestModel opts.tableName to be a string');
  assert(!createTable || _isPlainObject(createTable), 'Expected createTestModel opts.createTable to be a plain object');
  assert(!options || _isPlainObject(options), 'Expected createTestModel opts.options to be a plain object');

  await deleteThenCreateTable(dynamodb, {
    TableName: tableName || 'dynazord-test-entries',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    ...createTable,
  });

  return dynazord.createModel({
    dynamodb,
    tableName: tableName || 'dynazord-test-entries',
    log: logger,
    keySchema: {
      hash: 'id',
    },
    properties: {
      id: {
        type: String,
        required: true,
        default: () => uuid(),
      },
    },
    options: {
      createdAtTimestamp: true,
      updatedAtTimestamp: true,
      ...options,
    },
    ...createOpts,
  });
}

async function deleteThenCreateTable(dynamodb, opts) {
  assert(dynamodb instanceof AWS.DynamoDB, 'Expected deleteThenCreateTable dynamodb to be an instance of AWS.DynamoDB');
  assert(_isPlainObject(opts), 'Expected deleteThenCreateTable opts to be a plain object');

  const { TableName, TimeToLiveSpecification, ...createTableParams } = opts;
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
    logger.debug({ createTable: { TableName, ...createTableParams } });
    await dynamodb.createTable({ TableName, ...createTableParams }).promise();
  } catch (err) {
    err.message = `Failed to create ${TableName}: ${err.message}`;
    throw err;
  }

  if (TimeToLiveSpecification) {
    try {
      logger.debug({ updateTimeToLive: { TableName, TimeToLiveSpecification } });
      await dynamodb.updateTimeToLive({ TableName, TimeToLiveSpecification }).promise();
    } catch (err) {
      err.message = `Failed to set TTL for ${TableName}: ${err.message}`;
      throw err;
    }
  }
}

module.exports = {
  assertItem,
  createTestModel,
  deleteThenCreateTable,
};
