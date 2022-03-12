const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');

describe('examples', () => describe('single-table-design', () => {
  const dynazord = require('dynazord');
  const models = rewire('../../examples/single-table-design');

  const currentDate = new Date();
  const userID = '01FXX320Z0TMH84ECTWXY6S4WD';
  const userAgent = 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15';

  before(async () => {
    await deleteThenCreateTable(dynamodb, models.__get__('createTable'));
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  describe('users', () => {
    const { users } = models;

    it('should fail to create an entry without required fields', async () => {
      try {
        await users.create({});
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, '[email]: Expected required field to be set');
        assert.strictEqual(err.key, 'email');
      }
    });

    it('should create a new entry', async () => {
      const entry = await users.create({
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
      });

      assert.ok(_.isPlainObject(entry), 'Expected users.create to return a plain object');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      assert.deepStrictEqual(entry, {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should throw an error when creating another entry with the same hash/range key', async () => {
      try {
        await users.create({
          id: userID,
          email: 'jdrydn@github.io',
          name: 'James',
        });
        assert.fail('Should have errored');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, 'The conditional request failed');
        // @TODO Rewrite these error messages into something more suitable!
      }

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });
    });

    it('should get the entry', async () => {
      const entry = await users.get({ id: userID });

      assert.ok(_.isPlainObject(entry), 'Expected users.get to return a plain object');
      assert.deepStrictEqual(entry, {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should scan for the entry', async () => {
      const results = await users.scan({ name: 'James' });
      assert.ok(Array.isArray(results) && results.length === 1, 'Expected users.scan to return results');
      assert.ok(_.isPlainObject(results[0]) && results[0].email, 'Expected users.scan to return an entry');

      assert.deepStrictEqual(results[0], {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should scan for the entry (AND)', async () => {
      const { and } = dynazord.operators;
      const results = await users.scan({ [and]: [ { email: 'jdrydn@github.io' }, { name: 'James' } ] });
      assert.ok(Array.isArray(results) && results.length === 1, 'Expected users.scan to return results');
      assert.ok(_.isPlainObject(results[0]) && results[0].email, 'Expected users.scan to return an entry');

      assert.deepStrictEqual(results[0], {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should scan for the entry (OR)', async () => {
      const { or } = dynazord.operators;
      const results = await users.scan({ [or]: [ { email: 'jdrydn@github.io' }, { email: 'jdrydn2@github.io' } ] });
      assert.ok(Array.isArray(results) && results.length === 1, 'Expected users.scan to return results');
      assert.ok(_.isPlainObject(results[0]) && results[0].email, 'Expected users.scan to return an entry');

      assert.deepStrictEqual(results[0], {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should scan for the entry (NOT)', async () => {
      const { not } = dynazord.operators;

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      const results = await users.scan({ [not]: [ { email: 'jdrydn1@github.io' } ] });
      assert.ok(Array.isArray(results) && results.length === 1, 'Expected users.scan to return results');
      assert.ok(_.isPlainObject(results[0]) && results[0].email, 'Expected users.scan to return an entry');

      assert.deepStrictEqual(results[0], {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should update the entry', async () => {
      const entry = await users.update({
        avatarUrl: 'https://github.com/jdrydn.png',
      }, {
        id: userID,
      });

      assert.ok(_.isPlainObject(entry), 'Expected users.update to return a plain object');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        avatarUrl: { S: 'https://github.com/jdrydn.png' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      assert.deepStrictEqual(entry, {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        avatarUrl: 'https://github.com/jdrydn.png',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should fail to update the entry\'s avatar URL', async () => {
      try {
        await users.update({
          avatarUrl: 'data:application/vnd.microsoft.portable-executable,MEGAMAN.EXE',
        }, {
          id: userID,
        });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, '[avatarUrl]: Expected value to be a base64-image or URL');
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.value, 'data:application/vnd.microsoft.portable-executable,MEGAMAN.EXE');
      }
    });

    it('should delete the entry', async () => {
      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        avatarUrl: { S: 'https://github.com/jdrydn.png' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      const deleted = await users.delete({ id: userID });
      assert.ok(deleted === true, 'Expected users.delete to return a boolean');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, null);
    });

    it('should upsert the entry', async () => {
      const entry1 = await users.upsert({
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
      });

      assert.ok(_.isPlainObject(entry1), 'Expected users.update to return a plain object');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      assert.deepStrictEqual(entry1, {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      const entry2 = await users.upsert({
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        avatarUrl: 'https://github.com/jdrydn.png',
      });

      assert.ok(_.isPlainObject(entry2), 'Expected users.update to return a plain object');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn@github.io' },
        id: { S: userID },
        email: { S: 'jdrydn@github.io' },
        name: { S: 'James' },
        avatarUrl: { S: 'https://github.com/jdrydn.png' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      assert.deepStrictEqual(entry2, {
        pk: 'USER',
        sk: `USER:${userID}`,
        gs1pk: 'USER-EMAILS',
        gs1sk: 'EMAIL:jdrydn@github.io',
        id: userID,
        email: 'jdrydn@github.io',
        name: 'James',
        avatarUrl: 'https://github.com/jdrydn.png',
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    const userID1 = '01FXZWXX20391GXEBBQ0FNV7WG';
    const userID2 = '01FXZX2E1CG54K14XQCYXJSVWP';

    it('should bulk-create some entries', async () => {
      const entries = await users.bulkCreate([
        {
          id: userID1,
          email: 'jdrydn1@github.io',
          name: 'James',
        },
        {
          id: userID2,
          email: 'jdrydn2@github.io',
          name: 'James 2',
        }
      ]);

      assert.ok(Array.isArray(entries), 'Expected users.bulkCreate to return an array');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID1}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID1}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn1@github.io' },
        id: { S: userID1 },
        email: { S: 'jdrydn1@github.io' },
        name: { S: 'James' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });
      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID2}` } },
      }, {
        pk: { S: 'USER' },
        sk: { S: `USER:${userID2}` },
        gs1pk: { S: 'USER-EMAILS' },
        gs1sk: { S: 'EMAIL:jdrydn2@github.io' },
        id: { S: userID2 },
        email: { S: 'jdrydn2@github.io' },
        name: { S: 'James 2' },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      assert.deepStrictEqual(entries, [
        {
          pk: 'USER',
          sk: `USER:${userID1}`,
          gs1pk: 'USER-EMAILS',
          gs1sk: 'EMAIL:jdrydn1@github.io',
          id: userID1,
          email: 'jdrydn1@github.io',
          name: 'James',
          createdAt: currentDate,
          updatedAt: currentDate,
        },
        {
          pk: 'USER',
          sk: `USER:${userID2}`,
          gs1pk: 'USER-EMAILS',
          gs1sk: 'EMAIL:jdrydn2@github.io',
          id: userID2,
          email: 'jdrydn2@github.io',
          name: 'James 2',
          createdAt: currentDate,
          updatedAt: currentDate,
        },
      ]);
    });

    it('should bulk-get some entries', async () => {
      const entries = await users.bulkGet([
        { id: userID1 },
        { id: userID2 },
      ]);

      assert.ok(Array.isArray(entries), 'Expected users.bulkGet to return an array');

      assert.deepStrictEqual(entries, [
        {
          pk: 'USER',
          sk: `USER:${userID1}`,
          gs1pk: 'USER-EMAILS',
          gs1sk: 'EMAIL:jdrydn1@github.io',
          id: userID1,
          email: 'jdrydn1@github.io',
          name: 'James',
          createdAt: currentDate,
          updatedAt: currentDate,
        },
        {
          pk: 'USER',
          sk: `USER:${userID2}`,
          gs1pk: 'USER-EMAILS',
          gs1sk: 'EMAIL:jdrydn2@github.io',
          id: userID2,
          email: 'jdrydn2@github.io',
          name: 'James 2',
          createdAt: currentDate,
          updatedAt: currentDate,
        },
      ]);
    });

    it('should bulk-delete some entries', async () => {
      const deleted = await users.bulkDelete([
        { id: userID1 },
        { id: userID2 },
      ]);

      assert.ok(deleted === true, 'Expected users.bulkDelete to return a boolean');

      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID1}` } },
      }, null);
      await assertItem(dynamodb, {
        TableName: users.tableName,
        Key: { pk: { S: 'USER' }, sk: { S: `USER:${userID2}` } },
      }, null);
    });
  });

  describe('sessions', () => {
    const { sessions } = models;
    const sessionID = '01FXZXH7DBH0JNV4J7QG83H9E9';

    it('should fail to create an entry without required fields', async () => {
      try {
        await sessions.create({});
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.strictEqual(err.message, '[userID]: Expected required field to be set');
        assert.strictEqual(err.key, 'userID');
      }
    });

    it('should create a new entry', async () => {
      const entry = await sessions.create({
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
      });

      assert.deepStrictEqual(entry, {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, {
        pk: { S: `USER:${userID}` },
        sk: { S: `SESSION:${sessionID}` },
        gs1pk: { S: 'USER-SESSIONS' },
        gs1sk: { S: `SESSION:${sessionID}` },
        userID: { S: userID },
        id: { S: sessionID },
        ipAddress: { S: '127.0.0.1' },
        userAgent: { S: userAgent },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });
    });

    it('should get the entry', async () => {
      const entry = await sessions.get({ userID, id: sessionID });

      assert.deepStrictEqual(entry, {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should scan for the entry', async () => {
      const results = await sessions.scan({ userAgent });
      assert.ok(Array.isArray(results) && results.length === 1, 'Expected posts.scan to return results');

      assert.deepStrictEqual(results[0], {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    });

    it('should update the entry', async () => {
      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, {
        pk: { S: `USER:${userID}` },
        sk: { S: `SESSION:${sessionID}` },
        gs1pk: { S: 'USER-SESSIONS' },
        gs1sk: { S: `SESSION:${sessionID}` },
        userID: { S: userID },
        id: { S: sessionID },
        ipAddress: { S: '127.0.0.1' },
        userAgent: { S: userAgent },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      const entry = await sessions.update({
        lastActiveAt: new Date(),
      }, {
        userID,
        id: sessionID,
      });

      assert.deepStrictEqual(entry, {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        lastActiveAt: currentDate,
        updatedAt: currentDate,
      });

      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, {
        pk: { S: `USER:${userID}` },
        sk: { S: `SESSION:${sessionID}` },
        gs1pk: { S: 'USER-SESSIONS' },
        gs1sk: { S: `SESSION:${sessionID}` },
        userID: { S: userID },
        id: { S: sessionID },
        ipAddress: { S: '127.0.0.1' },
        userAgent: { S: userAgent },
        createdAt: { S: currentDate.toISOString() },
        lastActiveAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });
    });

    it('should delete the entry', async () => {
      const deleted = await sessions.delete({ userID, id: sessionID });
      assert.ok(deleted === true, 'Expected sessions.delete to return a boolean');

      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, null);
    });

    it('should upsert the entry', async () => {
      const entry1 = await sessions.upsert({
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
      });

      assert.deepStrictEqual(entry1, {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, {
        pk: { S: `USER:${userID}` },
        sk: { S: `SESSION:${sessionID}` },
        gs1pk: { S: 'USER-SESSIONS' },
        gs1sk: { S: `SESSION:${sessionID}` },
        userID: { S: userID },
        id: { S: sessionID },
        ipAddress: { S: '127.0.0.1' },
        userAgent: { S: userAgent },
        createdAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });

      const entry2 = await sessions.upsert({
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        lastActiveAt: currentDate,
      });

      assert.deepStrictEqual(entry2, {
        pk: `USER:${userID}`,
        sk: `SESSION:${sessionID}`,
        gs1pk: 'USER-SESSIONS',
        gs1sk: `SESSION:${sessionID}`,
        userID,
        id: sessionID,
        ipAddress: '127.0.0.1',
        userAgent,
        createdAt: currentDate,
        lastActiveAt: currentDate,
        updatedAt: currentDate,
      });

      await assertItem(dynamodb, {
        TableName: sessions.tableName,
        Key: { pk: { S: `USER:${userID}` }, sk: { S: `SESSION:${sessionID}` } },
      }, {
        pk: { S: `USER:${userID}` },
        sk: { S: `SESSION:${sessionID}` },
        gs1pk: { S: 'USER-SESSIONS' },
        gs1sk: { S: `SESSION:${sessionID}` },
        userID: { S: userID },
        id: { S: sessionID },
        ipAddress: { S: '127.0.0.1' },
        userAgent: { S: userAgent },
        createdAt: { S: currentDate.toISOString() },
        lastActiveAt: { S: currentDate.toISOString() },
        updatedAt: { S: currentDate.toISOString() },
      });
    });

  });
}));
