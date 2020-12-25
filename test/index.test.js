const _ = require('lodash');
const assert = require('assert');
const AWS = require('aws-sdk');
const dynamodel = require('../src');
const { v4: uuid } = require('uuid');

describe('dynamodel', () => {
  describe('createModel', () => {
    const { createModel } = dynamodel;
    let dynamodb = null;

    const tableName = `dynamodel-test-users-${Date.now()}`;

    before(async () => {
      dynamodb = new AWS.DynamoDB({
        endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
        region: 'us-east-1',
      });

      const deleteTableParams = {
        TableName: tableName,
      };
      const createTableParams = {
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
        ],
      };

      try {
        await dynamodb.deleteTable(deleteTableParams).promise();
      } catch (err) {
        if (!`${err.message}`.includes('Cannot do operations on a non-existent table')) {
          throw err;
        }
      }

      await dynamodb.createTable(createTableParams).promise();
    });

    let model = null;
    const id = uuid();
    const email = 'james@jdrydn.com';
    const name = 'James D';
    const avatar = 'http://github.com/jdrydn.png';

    it('should create a valid model', () => {
      model = createModel({
        dynamodb,
        tableName,
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
    });

    it('should be able to perform singular CRUD actions with a model', async () => {
      assert(model, 'Failed to create model');

      try {
        const doc = await model.create({ email, name });
        assert.deepStrictEqual(doc, { id, email, name });
      } catch (err) {
        err.message = `Failed to create document: ${err.message}`;
        throw err;
      }

      try {
        const doc = await model.get({ id });
        assert.deepStrictEqual(doc, { id, email, name });
      } catch (err) {
        err.message = `Failed to get document: ${err.message}`;
        throw err;
      }

      try {
        const docs = await model.find({ email });
        assert.deepStrictEqual(docs, [ { id, email, name } ]);
      } catch (err) {
        err.message = `Failed to find documents: ${err.message}`;
        throw err;
      }

      try {
        const { or: $or } = dynamodel.operators;
        const docs = await model.find({ [$or]: [ { email }, { email } ] });
        assert.deepStrictEqual(docs, [ { id, email, name } ]);
      } catch (err) {
        err.message = `Failed to find documents: ${err.message}`;
        throw err;
      }

      try {
        const doc = await model.update({ avatar }, { id });
        assert.deepStrictEqual(doc, { id, email, name, avatar });
      } catch (err) {
        err.message = `Failed to update document: ${err.message}`;
        throw err;
      }

      try {
        const deleted = await model.delete({ id });
        assert.strictEqual(deleted, true, 'Expected model.delete to return true');
      } catch (err) {
        err.message = `Failed to delete document: ${err.message}`;
        throw err;
      }
    });

    it('should be able to perform bulk CRUD actions with a model', async () => {
      assert(model, 'Failed to create model');

      const body = _.times(5).map(i => ({
        id: uuid(),
        email: `james+${i}@jdrydn.com`,
        name: 'James Dryden',
      }));

      try {
        const docs = await model.bulkCreate(body);
        assert.deepStrictEqual(docs, body);
      } catch (err) {
        err.message = `Failed to bulk create document: ${err.message}`;
        throw err;
      }

      try {
        const docs = await model.bulkGet(body.map(({ id: i }) => ({ id: i })));
        assert.deepStrictEqual(docs, body);
      } catch (err) {
        err.message = `Failed to bulk get documents: ${err.message}`;
        throw err;
      }

      // try {
      //   const doc = await model.update({ avatar }, { id });
      //   assert.deepStrictEqual(doc, { id, email, name, avatar });
      // } catch (err) {
      //   err.message = `Failed to update document: ${err.message}`;
      //   throw err;
      // }

      try {
        const deleted = await model.bulkDelete(body.map(({ id: i }) => ({ id: i })));
        assert.strictEqual(deleted, true, 'Expected model.delete to return true');
      } catch (err) {
        err.message = `Failed to bulk delete documents: ${err.message}`;
        throw err;
      }

      try {
        const docs = await model.bulkGet(body.map(({ id: i }) => ({ id: i })));
        assert.deepStrictEqual(docs, body.map(() => null));
      } catch (err) {
        err.message = `Failed to bulk get documents: ${err.message}`;
        throw err;
      }
    });

  });
});
