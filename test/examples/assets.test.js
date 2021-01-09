const _ = require('lodash');
const assert = require('assert');
const fs = require('fs');
const mockdate = require('mockdate');
const path = require('path');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');

describe('examples', () => describe('assets', () => {
  const assets = rewire('../../examples/assets');
  const currentDate = new Date();
  const ids = [];

  before(async () => {
    await deleteThenCreateTable(dynamodb, assets.__get__('createTable'));
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should fail to create an entry without required fields', async () => {
    try {
      await assets.create({});
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[filename]: Expected required field to be set');
      assert.strictEqual(err.key, 'filename');
    }
  });

  it('should create a new entry', async () => {
    const entry = await assets.create({
      filename: 'image.jpg',
      filemime: 'image/jpg',
    });

    assert.ok(_.isPlainObject(entry), 'Expected assets.create to return a plain object');
    assert.ok(typeof entry.id === 'string' && entry.id.length, 'Expected assets.create to return an ID');
    const { id } = entry;

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      filename: { S: 'image.jpg' },
      filemime: { S: 'image/jpg' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    ids.push(entry.id);
  });

  it('should create a new entry with a buffer', async () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../middle-out.jpg'));
    assert.ok(content instanceof Buffer, 'Expected middle-out.jpg to be a Buffer');

    const entry = await assets.create({
      filename: 'middle-out.jpg',
      filemime: 'image/jpg',
      filesize: 26285,
      content,
      filesha1: '7d57cdcf81ccd30b2c2a863dcec66fc420b1cfe6',
    });

    assert.ok(_.isPlainObject(entry), 'Expected assets.create to return a plain object');
    assert.ok(typeof entry.id === 'string' && entry.id.length, 'Expected assets.create to return an ID');
    const { id } = entry;

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      filename: { S: 'middle-out.jpg' },
      filemime: { S: 'image/jpg' },
      filesize: { N: '26285' },
      content: { S: content.toString('binary') },
      filesha1: { S: '7d57cdcf81ccd30b2c2a863dcec66fc420b1cfe6' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      id,
      filename: 'middle-out.jpg',
      filemime: 'image/jpg',
      filesize: content.length,
      content,
      filesha1: '7d57cdcf81ccd30b2c2a863dcec66fc420b1cfe6',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should get the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected assets.create to have succeeded');

    const entry = await assets.get({ id });

    assert.ok(_.isPlainObject(entry), 'Expected assets.get to return a plain object');
    assert.deepStrictEqual(entry, {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should scan for the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected assets.create to have succeeded');

    const results = await assets.scan({ filename: 'image.jpg' });
    assert.ok(Array.isArray(results) && results.length === 1, 'Expected assets.scan to return results');
    assert.ok(_.isPlainObject(results[0]) && results[0].id, 'Expected assets.scan to return an entry');

    assert.deepStrictEqual(results[0], {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected assets.create to have succeeded');

    const entry = await assets.update({
      filesize: 1024,
    }, {
      id,
    });

    assert.ok(_.isPlainObject(entry), 'Expected assets.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      filename: { S: 'image.jpg' },
      filemime: { S: 'image/jpg' },
      filesize: { N: '1024' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      filesize: 1024,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should delete the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected assets.create to have succeeded');

    const deleted = await assets.delete({ id });
    assert.ok(deleted === true, 'Expected assets.delete to return a boolean');

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, null);

    ids.splice(0, ids.length);
    assert.ok(ids.length === 0, 'Expected ids to be an empty array');
  });

  it('should upsert the entry', async () => {
    const entry1 = await assets.upsert({
      filename: 'image.jpg',
      filemime: 'image/jpg',
    });

    assert.ok(_.isPlainObject(entry1), 'Expected assets.upsert to return a plain object');
    assert.ok(_.isPlainObject(entry1), 'Expected assets.create to return a plain object');
    assert.ok(typeof entry1.id === 'string' && entry1.id.length, 'Expected assets.create to return an ID');
    const { id } = entry1;

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      filename: { S: 'image.jpg' },
      filemime: { S: 'image/jpg' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry1, {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const entry2 = await assets.upsert({
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      filesize: 1024,
    });

    assert.ok(_.isPlainObject(entry2), 'Expected assets.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: assets.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      filename: { S: 'image.jpg' },
      filemime: { S: 'image/jpg' },
      filesize: { N: '1024' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry2, {
      id,
      filename: 'image.jpg',
      filemime: 'image/jpg',
      filesize: 1024,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  describe('getUploadUrl', () => {

    before(() => {
      assert.strictEqual(typeof assets.getUploadUrl, 'function', 'Expected assets.getUploadUrl to be a function');
    });

    it('should get a signed S3 URL', () => {
      const signedUrl = assets.getUploadUrl({
        filename: 'image.jpg',
        filemime: 'image/jpg',
        filesize: 1024,
      });

      assert.ok(typeof signedUrl === 'string', 'Expected signedUrl to be a string');
      assert.ok(signedUrl.startsWith('https://'), 'Expected signedUrl to start with https://');
      assert.ok(signedUrl.startsWith('https://dynazord-example-assets.s3.amazonaws.com/uploads'),
        'Expected signedUrl to start with Bucket & Prefix');
    });

  });

}));
