const _ = require('lodash');
const assert = require('assert');
const AWS = require('aws-sdk');
const dynazord = require('../src');
const isUUID = require('validator/lib/isUUID');
const { createTestModel } = require('./utils');
const { v4: uuid } = require('uuid');

describe('dynazord', () => {
  describe('createModel', () => {
    let model = null;

    before(async () => {
      assert.strictEqual(typeof dynazord.createModel, 'function', 'Expected createModel to be a function');

      const dynamodb = new AWS.DynamoDB({
        endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
        region: 'us-east-1',
      });

      model = await createTestModel({
        dynamodb,
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

    describe('CRUD', () => {
      let id = null;

      it('should create an entry', async () => {
        assert(model, 'Failed to create the model');

        const doc = await model.create({ email, name });
        assert.ok(_.isPlainObject(doc), 'Expected document to be a plain object');
        assert.ok(typeof doc.id === 'string' && isUUID(doc.id, 4), 'Expected id to be a UUID-v4 string');
        ({ id } = doc);
        assert.deepStrictEqual(doc, { id, email, name });
      });

      it('should get an entry', async () => {
        assert(model, 'Failed to create the model');
        assert(id, 'Failed to initially create the entry');

        const doc = await model.get({ id });
        assert.deepStrictEqual(doc, { id, email, name });
      });

      it('should find an entry #1', async () => {
        assert(model, 'Failed to create the model');
        assert(id, 'Failed to initially create the entry');

        const docs = await model.find({ email });
        assert.deepStrictEqual(docs, [ { id, email, name } ]);
      });

      it('should find an entry #2', async () => {
        assert(model, 'Failed to create the model');
        assert(id, 'Failed to initially create the entry');

        const { or: $or } = dynazord.operators;
        const docs = await model.find({ [$or]: [ { email }, { email } ] });
        assert.deepStrictEqual(docs, [ { id, email, name } ]);
      });

      it('should update an entry', async () => {
        assert(model, 'Failed to create the model');
        assert(id, 'Failed to initially create the entry');

        const doc = await model.update({ avatar }, { id });
        assert.deepStrictEqual(doc, { id, email, name, avatar });
      });

      it('should delete an entry', async () => {
        assert(model, 'Failed to create the model');
        assert(id, 'Failed to initially create the entry');

        const deleted = await model.delete({ id });
        assert.strictEqual(deleted, true);
        id = null;
      });

      it('should upsert an entry', async () => {
        assert(model, 'Failed to create the model');
        assert(!id, 'Failed to initially create then delete the entry');

        const doc1 = await model.upsert({ email, name });
        assert.ok(_.isPlainObject(doc1), 'Expected document to be a plain object');
        assert.ok(typeof doc1.id === 'string' && isUUID(doc1.id, 4), 'Expected id to be a UUID-v4 string');
        ({ id } = doc1);
        assert.deepStrictEqual(doc1, { id, email, name });

        const doc2 = await model.upsert({ id, email, name, avatar });
        assert.ok(_.isPlainObject(doc2), 'Expected document to be a plain object');
        assert.deepStrictEqual(doc2, { id, email, name, avatar });
      });
    });

    describe('bulk CRUD', () => {
      const ids = [];
      const body = _.times(5).map(i => ({
        email: `jdrydn+${i}@github.io`,
        name,
      }));

      it('should create entries', async () => {
        assert(model, 'Failed to create the model');

        const docs = await model.bulkCreate(body);
        docs.forEach((doc, i) => {
          assert.ok(_.isPlainObject(doc), `Expected document #${i} to be a plain object`);
          assert.ok(typeof doc.id === 'string' && isUUID(doc.id, 4), `Expected id #${i} to be a UUID-v4 string`);
          ids[i] = doc.id;
          assert.deepStrictEqual(doc, { id: doc.id, ...body[i] });
        });
        assert.deepStrictEqual(body.length, docs.length, `Expected bulkCreate to create ${body.length} documents`);
      });

      it('should get entries', async () => {
        assert(model, 'Failed to create the model');
        assert(ids.length, 'Failed to initially create entries');

        const docs = await model.bulkGet(ids.map(id => ({ id })));
        assert.deepStrictEqual(docs, body.map((b, i) => ({ id: ids[i], ...b })));
      });

      it('should find entries #1', async () => {
        assert(model, 'Failed to create the model');
        assert(ids.length, 'Failed to initially create entries');

        const docs = await model.find({ email: body[0].email });
        assert.deepStrictEqual(docs, [ { id: ids[0], ...body[0] } ]);
      });

      it('should find entries #2', async () => {
        assert(model, 'Failed to create the model');
        assert(ids.length, 'Failed to initially create entries');

        const { or: $or } = dynazord.operators;
        const docs = await model.find({ [$or]: [ { email: body[0].email }, { email: body[1].email } ] });
        assert.strictEqual(docs.length, 2, 'Expected find to return 2 documents');

        const first = docs.find(d => d && d.email === body[0].email);
        const second = docs.find(d => d && d.email === body[1].email);
        assert.deepStrictEqual([ first, second ], [ { id: ids[0], ...body[0] }, { id: ids[1], ...body[1] } ]);
      });

      it.skip('should update entries', () => {
        assert(model, 'Failed to create the model');
        assert(ids.length, 'Failed to initially create entries');

        assert.fail('Not implemented');

        // const doc = await model.update({ avatar }, { id });
        // assert.deepStrictEqual(doc, { id, email, name, avatar });
      });

      it('should delete entries', async () => {
        assert(model, 'Failed to create the model');
        assert(ids.length, 'Failed to initially create entries');

        const deleted = await model.bulkDelete(ids.map(id => ({ id })));
        assert.strictEqual(deleted, true);
      });
    });
  });

  describe('types', () => {
    it('should export a static object of types', () => {
      assert.deepStrictEqual(dynazord.types, {
        STRING: 'STRING',
        NUMBER: 'NUMBER',
        BOOLEAN: 'BOOLEAN',
        DATE: 'DATE',
        BINARY: 'BINARY',
      });
    });
  });

  describe('operators', () => {
    const { operators } = require('../src/helpers/where');

    it('should export a static object of operators', () => {
      assert.deepStrictEqual(dynazord.operators, operators);
    });
  });

  describe('setDynamoDB', () => {
    it('should set a global dynamodb client', () => {
      dynazord.setDynamoDB({});
      dynazord.setDynamoDB(new AWS.DynamoDB());
      dynazord.setDynamoDB(null);
    });

    it('should throw an error if a DocumentClient is passed', () => {
      try {
        dynazord.setDynamoDB(new AWS.DynamoDB.DocumentClient());
        assert.fail('Should have errored');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'Sorry, dynazord doesn\'t support AWS.DynamoDB.DocumentClient');
      }
    });

    after(() => dynazord.setDynamoDB(null));
  });
});
