const _isPlainObject = require('lodash/isPlainObject');
const assert = require('assert');
const AWS = require('aws-sdk');
const mockdate = require('mockdate');
const { assertItem, createTestModel } = require('../fixtures/dynamodb');
const { v4: uuid } = require('uuid');

describe('dynazord/create', () => {
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
    const entries = await createTestModel({
      dynamodb,
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

    await assertItem(dynamodb, { Key: { id: { S: 'POST-ID' } } }, {
      id: {
        S: 'POST-ID',
      },
    });

    assert.deepStrictEqual(entry, { id: 'POST-ID' });
  });

  it('should create a new document with required properties', async () => {
    const posts = await createTestModel({
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
        },
      },
    });

    const post = await posts.create({
      title: 'Hello, world!',
    });

    assert(_isPlainObject(post), 'Expected post to be a plain object');
    assert(post.id && typeof post.id === 'string', 'Expected post.id to be a string');

    await assertItem(dynamodb, { Key: { id: { S: post.id } } }, {
      id: { S: post.id },
      title: { S: 'Hello, world!' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(post, {
      id: post.id,
      title: 'Hello, world!',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should create a new document with default properties', async () => {
    const posts = await createTestModel({
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

    await assertItem(dynamodb, { Key: { id: { S: post.id } } }, {
      id: { S: post.id },
      title: { S: 'Hello, world!' },
      headline: { S: 'Super interesting headline!' },
      slug: { S: 'super-clever-non-unique-slug' },
      author: { S: 'James' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

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
    const posts = await createTestModel({
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

    await assertItem(dynamodb, { Key: { id: { S: post.id } } }, {
      id: { S: post.id },
      title: { S: 'Hello, world!' },
      headline: { S: 'Super interesting headline!' },
      slug: { S: 'super-clever-non-unique-slug' },
      author: { S: '{"id":"USER-ID","name":"James"}' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

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

    await assertItem(dynamodb, { Key: { id: { S: entry.id } } }, {
      id: { S: entry.id },
      title: { S: 'Hello, world!' },
      content: {
        L: [
          { M: { text: { S: 'This could be the body of a post' } } },
          { M: { image: { M: { url: { S: '/this/could/be/an/image.jpg' } } } } },
        ],
      },
    });

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
      assert.strictEqual(err.message, 'Error validating title: Expected value to be not-null');
    }
  });

});
