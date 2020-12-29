const _ = require('lodash');
const assert = require('assert');
const AWS = require('aws-sdk');
const dynamodel = require('../src');
const isUUID = require('validator/lib/isUUID');
const { deleteThenCreateTable } = require('./fixtures/dynamodb');
const { v4: uuid } = require('uuid');

describe('dynamodel', () => {
  describe('createModel', () => {
    let model = null;

    before(async () => {
      console.log(process.env.AWS_DYNAMODB_ENDPOINT);

      const dynamodb = new AWS.DynamoDB({
        endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
        region: 'us-east-1',
      });

      await deleteThenCreateTable(dynamodb, {
        TableName: 'dynamodel-test-entries',
        BillingMode: 'PAY_PER_REQUEST',
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
        ],
      });

      model = dynamodel.createModel({
        dynamodb,
        tableName: 'dynamodel-test-entries',
        keySchema: {
          hash: 'id',
        },
        properties: {
          id: {
            type: String,
            required: true,
            default: () => uuid(),
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

      assert(model, 'Failed to create model');
    });

    const email = 'james@jdrydn.com';
    const name = 'James D';
    const avatar = 'http://github.com/jdrydn.png';

    it('should be able to perform singular CRUD actions with a model', async () => {
      assert(model, 'Failed to create model');
      let id = null;

      try {
        const doc = await model.create({ email, name });
        assert.ok(_.isPlainObject(doc), 'Expected document to be a plain object');
        assert.ok(typeof doc.id === 'string' && isUUID(doc.id, 4), 'Expected id to be a UUID-v4 string');
        ({ id } = doc);
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
      const ids = [];

      const body = _.times(5).map(i => ({
        email: `james+${i}@jdrydn.com`,
        name,
      }));

      try {
        const docs = await model.bulkCreate(body);
        docs.forEach((doc, i) => {
          assert.ok(_.isPlainObject(doc), `Expected document #${i} to be a plain object`);
          assert.ok(typeof doc.id === 'string' && isUUID(doc.id, 4), `Expected id #${i} to be a UUID-v4 string`);
          ids[i] = doc.id;
          assert.deepStrictEqual(doc, { id: doc.id, ...body[i] });
        });
        assert.deepStrictEqual(body.length, docs.length, `Expected bulkCreate to create ${body.length} documents`);
      } catch (err) {
        err.message = `Failed to bulk create documents: ${err.message}`;
        throw err;
      }

      try {
        const docs = await model.bulkGet(ids.map(id => ({ id })));
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
        const deleted = await model.bulkDelete(ids.map(id => ({ id })));
        assert.strictEqual(deleted, true, 'Expected model.delete to return true');
      } catch (err) {
        err.message = `Failed to bulk delete documents: ${err.message}`;
        throw err;
      }

      try {
        const docs = await model.bulkGet(ids.map(id => ({ id })));
        assert.deepStrictEqual(docs, body.map(() => null));
      } catch (err) {
        err.message = `Failed to bulk get documents: ${err.message}`;
        throw err;
      }
    });

  });
});
