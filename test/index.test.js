const assert = require('assert');
const AWS = require('aws-sdk');
const dynamodel = require('../src');
const { v4: uuid } = require('uuid');

describe('dynamodel', () => {
  const dynamodb = new AWS.DynamoDB({
    endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
    region: 'us-east-1',
  });

  describe('createModel', () => {
    const { createModel } = dynamodel;

    const id = uuid();
    const email = `james+${Date.now()}@jdrydn.com`;
    const name = 'James D';
    const avatar = 'http://github.com/jdrydn.png';

    it('should return a valid model', async () => {
      const model = createModel({
        dynamodb,
        tableName: 'dynamodel-test-users',
        keySchema: {
          hash: 'id',
        },
        properties: {
          id: {
            type: String,
            required: true,
            default: () => id,
          },
          email: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
          avatar: {
            type: String,
          },
        },
        options: {
          createdAtTimestamp: false,
          updatedAtTimestamp: false,
        },
      });

      try {
        const doc = await model.create({ email, name });
        assert.deepStrictEqual(doc, { id, email, name }, 'Expected model.create to return the document');
      } catch (err) {
        err.message = `Failed to create document: ${err.message}`;
        throw err;
      }

      try {
        const doc = await model.get({ id });
        assert.deepStrictEqual(doc, { id, email, name, avatar: undefined }, 'Expected model.get to return the document');
      } catch (err) {
        err.message = `Failed to get document: ${err.message}`;
        throw err;
      }

      try {
        const doc = await model.update({ id }, { avatar });
        assert.deepStrictEqual(doc, { id, email, name, avatar });
      } catch (err) {
        err.message = `Failed to get document: ${err.message}`;
        throw err;
      }

      try {
        const deleted = await model.delete({ id });
        assert.strictEqual(deleted, true, 'Expected model.delete to return true');
      } catch (err) {
        err.message = `Failed to get document: ${err.message}`;
        throw err;
      }
    });
  });

});
