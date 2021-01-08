const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');

describe('examples', () => describe('sessions', () => {
  const sessions = rewire('../../examples/sessions');

  const currentDate = new Date();
  const userAgent = 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15';

  before(async () => {
    await deleteThenCreateTable(dynamodb, sessions.__get__('createTable'));
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should fail to create an entry without required fields', async () => {
    try {
      await sessions.create({});
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[email]: Expected required field to be set');
      assert.strictEqual(err.key, 'email');
    }
  });

  it('should create a new entry', async () => {
    const entry = await sessions.create({
      email: 'jdrydn@github.io',
      ipAddress: '127.0.0.1',
      userAgent,
    });

    assert.ok(_.isPlainObject(entry), 'Expected sessions.create to return a plain object');
    assert.ok(typeof entry.accessToken === 'string', 'Expected sessions.create to return an access token');
    assert.ok(entry.createdAt instanceof Date, 'Expected sessions.create to return a createdAt date');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: entry.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      accessToken: entry.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should get the entry', async () => {
    const entry = await sessions.get({ email: 'jdrydn@github.io', createdAt: currentDate });

    assert.ok(_.isPlainObject(entry), 'Expected sessions.get to return a plain object');
    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      accessToken: entry.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should scan for the entry', async () => {
    const results = await sessions.scan({ email: 'jdrydn@github.io', createdAt: currentDate });
    assert.ok(Array.isArray(results) && results.length === 1, 'Expected posts.scan to return results');
    assert.ok(_.isPlainObject(results[0]) && results[0].accessToken, 'Expected posts.scan to return an entry');

    assert.deepStrictEqual(results[0], {
      email: 'jdrydn@github.io',
      accessToken: results[0].accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update the entry', async () => {
    const entry = await sessions.update({
      lastActiveAt: new Date(),
    }, {
      email: 'jdrydn@github.io',
      createdAt: currentDate,
    });

    assert.ok(_.isPlainObject(entry), 'Expected sessions.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: entry.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      lastActiveAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      accessToken: entry.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      lastActiveAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should delete the entry', async () => {
    const deleted = await sessions.delete({ email: 'jdrydn@github.io', createdAt: currentDate });
    assert.ok(deleted === true, 'Expected sessions.delete to return a boolean');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, null);
  });

  it('should upsert the entry', async () => {
    const entry1 = await sessions.upsert({
      email: 'jdrydn@github.io',
      ipAddress: '127.0.0.1',
      userAgent,
    });

    assert.ok(_.isPlainObject(entry1), 'Expected sessions.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: entry1.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry1, {
      email: 'jdrydn@github.io',
      accessToken: entry1.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const entry2 = await sessions.upsert({
      email: 'jdrydn@github.io',
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      lastActiveAt: currentDate,
    });

    assert.ok(_.isPlainObject(entry2), 'Expected sessions.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: entry1.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      lastActiveAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry2, {
      email: 'jdrydn@github.io',
      accessToken: entry1.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      lastActiveAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should bulk-create some entries', async () => {
    const entries = await sessions.bulkCreate([
      {
        email: 'jdrydn1@github.io',
        ipAddress: '127.0.0.1',
        userAgent,
      },
      {
        email: 'jdrydn2@github.io',
        ipAddress: '127.0.0.1',
        userAgent,
      }
    ]);

    assert.ok(Array.isArray(entries), 'Expected sessions.bulkCreate to return an array');
    assert.ok(entries[0] && entries[0].accessToken, 'Expected sessions.bulkCreate [0] to return an accessToken');
    assert.ok(entries[1] && entries[1].accessToken, 'Expected sessions.bulkCreate [1] to return an accessToken');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn1@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn1@github.io' },
      accessToken: { S: entries[0].accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn2@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn2@github.io' },
      accessToken: { S: entries[1].accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entries, [
      {
        email: 'jdrydn1@github.io',
        accessToken: entries[0].accessToken,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        email: 'jdrydn2@github.io',
        accessToken: entries[1].accessToken,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should bulk-get some entries', async () => {
    const entries = await sessions.bulkGet([
      { email: 'jdrydn1@github.io', createdAt: currentDate },
      { email: 'jdrydn2@github.io', createdAt: currentDate },
    ]);

    assert.ok(Array.isArray(entries), 'Expected sessions.bulkGet to return an array');
    assert.ok(entries[0] && entries[0].accessToken, 'Expected sessions.bulkGet [0] to return an accessToken');
    assert.ok(entries[1] && entries[1].accessToken, 'Expected sessions.bulkGet [1] to return an accessToken');

    assert.deepStrictEqual(entries, [
      {
        email: 'jdrydn1@github.io',
        accessToken: entries[0].accessToken,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        email: 'jdrydn2@github.io',
        accessToken: entries[1].accessToken,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should bulk-delete some entries', async () => {
    const deleted = await sessions.bulkDelete([
      { email: 'jdrydn1@github.io', createdAt: currentDate },
      { email: 'jdrydn2@github.io', createdAt: currentDate },
    ]);

    assert.ok(deleted === true, 'Expected sessions.bulkDelete to return a boolean');

    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn1@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, null);
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn2@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, null);
  });

}));
