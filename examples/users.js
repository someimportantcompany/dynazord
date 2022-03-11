const assert = require('http-assert');
const dynazord = require('dynazord');
const isEmail = require('validator/lib/isEmail');

const createTable = {
  TableName: 'dynazord-example-users',
  BillingMode: 'PAY_PER_REQUEST',
  KeySchema: [
    { AttributeName: 'email', KeyType: 'HASH' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'email', AttributeType: 'S' },
  ],
};

const users = dynazord.createModel({
  tableName: createTable.TableName,
  // keySchema: { hash: 'email' }, // Defaults to `email` since it's the first property
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
    name: {
      type: String,
      required: true,
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
    avatarBlob: {
      type: Buffer,
      validate: {
        notEmpty: true,
      },
    },
    role: {
      type: String,
      enum: [ 'ADMIN', 'MODERATOR', 'EDITOR', 'USER' ],
      default: 'USER',
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = users;
