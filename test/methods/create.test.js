const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const AWS = require('aws-sdk');
const mockdate = require('mockdate');
const { createModel } = require('../fixtures/dynamodb');

describe('dynamodel/create', () => {
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

  it('should create a new document', async () => {
    const tableName = 'dynamodel-test-entries';
    const entries = await createModel({
      dynamodb,
      tableName,
      properties: {
        id: {
          type: String,
          required: true,
          default: () => 'POST-ID',
        },
      },
      options: {
        createdAtTimestamp: false,
        updatedAtTimestamp: false,
      },
    });

    const entry = await entries.create({});
    assert(_isPlainObject(entry), 'Expected entry to be a plain object');
    assert.deepStrictEqual(entry, { id: 'POST-ID' });
  });

  it('should create a new document with required properties', async () => {
    const tableName = 'dynamodel-test-entries';
    const posts = await createModel({
      dynamodb,
      tableName,
      properties: {
        title: {
          type: String,
          required: true,
        },
      },
    });

    const post = await posts.create({
      title: 'Hello, world!',
    });

    assert(_isPlainObject(post), 'Expected post to be a plain object');
    assert(post.id && typeof post.id === 'string', 'Expected post.id to be a string');
    assert.deepStrictEqual({ ...post, id: 'POST-ID' }, {
      id: 'POST-ID',
      title: 'Hello, world!',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should create a new document with default properties', async () => {
    const tableName = 'dynamodel-test-entries';
    const posts = await createModel({
      dynamodb,
      tableName,
      properties: {
        title: {
          type: String,
          required: true,
        },
        headline: {
          type: String,
          required: true,
          default: () => 'Super interesting headline!',
        },
        slug: {
          type: String,
          default: 'super-clever-non-unique-slug',
        },
        description: {
          type: String,
        },
        author: {
          type: String,
        },
      },
    });

    const post = await posts.create({
      title: 'Hello, world!',
      author: 'James',
    });

    assert(_isPlainObject(post), 'Expected post to be a plain object');
    assert(post.id && typeof post.id === 'string', 'Expected post.id to be a string');
    assert.deepStrictEqual({ ...post, id: 'POST-ID' }, {
      id: 'POST-ID',
      title: 'Hello, world!',
      headline: 'Super interesting headline!',
      slug: 'super-clever-non-unique-slug',
      author: 'James',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should create a new document with a custom JSON property', async () => {
    const tableName = 'dynamodel-test-entries';
    const posts = await createModel({
      dynamodb,
      tableName,
      properties: {
        title: {
          type: String,
          required: true,
        },
        headline: {
          type: String,
          required: true,
          default: () => 'Super interesting headline!',
        },
        slug: {
          type: String,
          default: 'super-clever-non-unique-slug',
        },
        description: {
          type: String,
        },
        author: {
          get: value => JSON.parse(value),
          set: value => JSON.stringify(value),
        },
      },
    });

    const post = await posts.create({
      title: 'Hello, world!',
      author: {
        id: 'USER-ID',
        name: 'James',
      },
    });

    assert(_isPlainObject(post), 'Expected post to be a plain object');
    assert(post.id && typeof post.id === 'string', 'Expected post.id to be a string');
    assert.deepStrictEqual({ ...post, id: 'POST-ID' }, {
      id: 'POST-ID',
      title: 'Hello, world!',
      headline: 'Super interesting headline!',
      slug: 'super-clever-non-unique-slug',
      author: {
        id: 'USER-ID',
        name: 'James',
      },
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should create a new document with a custom property', async () => {
    const tableName = 'dynamodel-test-entries';
    const entries = await createModel({
      dynamodb,
      tableName,
      properties: {
        title: {
          required: true,
        },
        content: {},
      },
      options: {
        createdAtTimestamp: false,
        updatedAtTimestamp: false,
      },
    });

    const entry = await entries.create({
      title: 'Hello, world!',
      content: [
        { text: 'This could be the body of a post' },
        { image: { url: '/this/could/be/an/image.jpg' } },
      ],
    });

    assert(_isPlainObject(entry), 'Expected entry to be a plain object');
    assert(entry.id && typeof entry.id === 'string', 'Expected entry.id to be a string');
    assert.deepStrictEqual({ ...entry, id: 'POST-ID' }, {
      id: 'POST-ID',
      title: 'Hello, world!',
      content: [
        { text: 'This could be the body of a post' },
        { image: { url: '/this/could/be/an/image.jpg' } },
      ],
    });
  });

  it('should throw an error if a required property is not found', async () => {
    const tableName = 'dynamodel-test-entries';
    const entries = await createModel({
      dynamodb,
      tableName,
      properties: {
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
    const tableName = 'dynamodel-test-entries';
    const entries = await createModel({
      dynamodb,
      tableName,
      properties: {
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
      assert.strictEqual(err.message, 'Error validating title: Expected value to be not-null');
    }
  });

});
