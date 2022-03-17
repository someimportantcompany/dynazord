const assert = require('http-assert');
const dynazord = require('dynazord');
const isEmail = require('validator/lib/isEmail');
const { ulid } = require('ulid');

const createTable = {
  TableName: 'dynazord-example-singleTableDesign',
  BillingMode: 'PAY_PER_REQUEST',
  KeySchema: [
    { AttributeName: 'pk', KeyType: 'HASH' },
    { AttributeName: 'sk', KeyType: 'RANGE' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'gs1',
      KeySchema: [
        { AttributeName: 'gs1pk', KeyType: 'HASH' },
        { AttributeName: 'gs1sk', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'KEYS_ONLY',
      },
    },
  ],
  LocalSecondaryIndexes: [
    {
      IndexName: 'ls1',
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'KEYS_ONLY',
      },
    },
  ],
  AttributeDefinitions: [
    { AttributeName: 'pk', AttributeType: 'S' },
    { AttributeName: 'sk', AttributeType: 'S' },
    { AttributeName: 'gs1pk', AttributeType: 'S' },
    { AttributeName: 'gs1sk', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'S' },
  ],
};

const users = dynazord.createModel({
  tableName: createTable.TableName,
  keySchema: { hash: 'pk', range: 'sk' },
  secondaryIndexes: {
    gs1: { hash: 'gs1pk', range: 'gs1sk' },
    ls1: { hash: 'pk', range: 'createdAt' },
  },
  properties: {
    pk: { type: String, composite: 'USER' },
    sk: { type: String, composite: 'USER:{id}' },
    gs1pk: { type: String, composite: 'USER-EMAILS' },
    gs1sk: { type: String, composite: 'EMAIL:{email}' },
    id: {
      type: String,
      required: true,
      default: () => ulid(),
      validate: {
        notNull: true,
      },
    },
    email: {
      type: String,
      required: true,
      validate: {
        notNull: true,
        isEmail(value) {
          assert(isEmail(value), 400, new Error('Expected value to be an email address'), { value });
        },
      },
    },
    name: {
      type: String,
      required: true,
    },
    avatarBlob: {
      type: Buffer,
      validate: {
        notEmpty: true,
      },
    },
    avatarUrl: {
      type: String,
      validate: {
        notEmpty: true,
        isValidUrl(value) {
          const isValid = `${value}`.startsWith('https://') ||
            `${value}`.startsWith('data:image/jpg;base64,') || `${value}`.startsWith('data:image/jpeg;base64,') ||
              `${value}`.startsWith('data:image/png;base64,');
          assert(isValid, 400, new Error('Expected value to be a base64-image or URL'), { value });
        },
      },
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

const sessions = dynazord.createModel({
  tableName: createTable.TableName,
  keySchema: { hash: 'pk', range: 'sk' },
  secondaryIndexes: {
    gs1: { hash: 'gs1pk', range: 'gs1sk' },
    ls1: { hash: 'pk', range: 'createdAt' },
  },
  properties: {
    pk: { type: String, composite: 'USER:{userID}' },
    sk: { type: String, composite: 'SESSION:{id}' },
    gs1pk: { type: String, composite: 'USER-SESSIONS' },
    gs1sk: { type: String, composite: 'SESSION:{id}' },
    userID: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
      default: () => ulid(),
      validate: {
        notNull: true,
      },
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    lastActiveAt: {
      type: Date,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

const posts = dynazord.createModel({
  tableName: createTable.TableName,
  keySchema: { hash: 'pk', range: 'sk' },
  secondaryIndexes: {
    ls1: { hash: 'pk', range: 'createdAt' },
  },
  properties: {
    pk: { type: String, composite: 'POST' },
    sk: { type: String, composite: 'POST:{id}' },
    id: {
      type: String,
      required: true,
      default: () => ulid(),
      validate: {
        notNull: true,
      },
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
    },
    authorID: {
      type: String,
      required: true,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = {
  users,
  sessions,
  posts,
};
