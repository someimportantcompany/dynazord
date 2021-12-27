const assert = require('http-assert');
const dynazord = require('dynazord');
const isEmail = require('validator/lib/isEmail');
const isUUID = require('validator/lib/isUUID');
const { v4: uuid } = require('uuid');

const createTable = {
  TableName: 'dynazord-example-sessions',
  BillingMode: 'PAY_PER_REQUEST',
  KeySchema: [
    { AttributeName: 'email', KeyType: 'HASH' },
    { AttributeName: 'createdAt', KeyType: 'RANGE' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'email', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'N' },
  ],
};

const sessions = dynazord.createModel({
  tableName: 'dynazord-example-sessions',
  keySchema: {
    hash: 'email',
    range: 'createdAt',
  },
  properties: {
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
    accessToken: {
      type: String,
      required: true,
      default: () => uuid(),
      validate: {
        notNull: true,
        notEmpty: true,
        isUUID: value => isUUID(value, 4),
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
    createdAt: {
      type: Date,
      // In this example, the createdAt range key is stored as a UNIX timestamp instead of an ISO8601 string
      format: Number,
      // Functionally they act the same - ISO8601 is sortable too - it's a personal preference
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

module.exports = sessions;
