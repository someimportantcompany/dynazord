const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const AWS = require('aws-sdk');
const mockdate = require('mockdate');
const { assertItem, createTestModel } = require('../utils');
const { v4: uuid } = require('uuid');

describe.skip('dynazord/update', () => {
  let dynamodb = null;
  const currentDate = new Date();

  before(() => {
    dynamodb = new AWS.DynamoDB({
      endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
      region: 'us-east-1',
    });

    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should create & update a document with a hash key', async () => {
    const entries = await createTestModel({
      dynamodb,
      properties: {
        id: {
          type: String,
          required: true,
          default: () => 'POST-ID',
        },
        title: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
          default: 'RED',
        },
      },
      options: {
        createdAtTimestamp: false,
        updatedAtTimestamp: false,
      },
    });

    const created = await entries.create({ title: 'Hello world 1' });
    assert(_isPlainObject(created), 'Expected entry to be a plain object');

    await assertItem(dynamodb, { Key: { id: { S: 'POST-ID' } } }, {
      id: { S: 'POST-ID' },
      title: { S: 'Hello world 1' },
      color: { S: 'RED' },
    });

    assert.deepStrictEqual(created, {
      id: 'POST-ID',
      title: 'Hello world 1',
      color: 'RED',
    });

    const updated = await entries.update({ title: 'Hello world 2' }, { id: 'POST-ID' });
    assert(_isPlainObject(updated), 'Expected entry to be a plain object');

    await assertItem(dynamodb, { Key: { id: { S: 'POST-ID' } } }, {
      id: { S: 'POST-ID' },
      title: { S: 'Hello world 2' },
      color: { S: 'RED' },
    });

    assert.deepStrictEqual(updated, {
      id: 'POST-ID',
      title: 'Hello world 2',
      color: 'RED',
    });
  });

  it('should create & update a document with a hash & range key', async () => {
    const entries = await createTestModel({
      dynamodb,
      createTable: {
        KeySchema: [
          { AttributeName: 'blog', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'blog', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'N' },
        ],
      },
      keySchema: {
        hash: 'blog',
        range: 'createdAt',
      },
      properties: {
        blog: {
          type: String,
          required: true,
          enum: [ 'jdrydn.com', 'theverge.com' ],
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        createdAt: {
          type: Date,
          format: Number,
        },
      },
      options: {
        createdAtTimestamp: true,
        updatedAtTimestamp: true,
      },
    });

    const created = await entries.create({
      blog: 'jdrydn.com',
      title: 'Hello world 1',
    });
    assert(_isPlainObject(created), 'Expected entry to be a plain object');

    await assertItem(dynamodb, {
      Key: {
        blog: { S: 'jdrydn.com' },
        createdAt: { N: currentDate.getTime().toString() },
      },
    }, {
      blog: { S: 'jdrydn.com' },
      title: { S: 'Hello world 1' },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(created, {
      blog: 'jdrydn.com',
      title: 'Hello world 1',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const updated = await entries.update({ title: 'Hello world 2' }, { blog: 'jdrydn.com', createdAt: currentDate });
    assert(_isPlainObject(updated), 'Expected entry to be a plain object');

    await assertItem(dynamodb, {
      Key: {
        blog: { S: 'jdrydn.com' },
        createdAt: { N: currentDate.getTime().toString() },
      },
    }, {
      blog: { S: 'jdrydn.com' },
      title: { S: 'Hello world 2' },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(updated, {
      blog: 'jdrydn.com',
      title: 'Hello world 2',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should throw an error if a required property is not found', async () => {
    const entries = await createTestModel({
      dynamodb,
      properties: {
        id: {
          type: String,
          required: true,
          default: () => uuid(),
        },
        title: {
          required: true,
        },
      },
    });

    try {
      await entries.create({});
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Expected all required fields to be set');
      assert.deepStrictEqual(err.fields, [ 'title' ]);
    }
  });

  it('should throw an error if a validator fails', async () => {
    const entries = await createTestModel({
      dynamodb,
      properties: {
        id: {
          type: String,
          required: true,
          default: () => uuid(),
        },
        title: {
          type: String,
          required: true,
          validate: {
            notNull: true,
          },
        },
      },
    });

    try {
      await entries.create({ title: null });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[dynazord-test-entries] [title]: Expected value to be not-null');
      assert.strictEqual(err.name, 'ValidationError');
    }
  });

});
