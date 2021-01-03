const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');

describe('examples', () => describe('users', () => {
  const users = rewire('../../examples/users');
  const currentDate = new Date();

  before(async () => {
    const createTable = users.__get__('createTable');
    await deleteThenCreateTable(dynamodb, createTable);
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

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

  it('should fail to create an entry with an invalid enum value', async () => {
    try {
      await users.create({
        email: 'jdrydn@github.io',
        name: 'James',
        role: 'HACKER',
      });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[role]: Expected value to be one of: ADMIN, MODERATOR, EDITOR, USER');
      assert.strictEqual(err.value, 'HACKER');
    }
  });

  it('should create a new entry', async () => {
    const entry = await users.create({
      email: 'jdrydn@github.io',
      name: 'James',
    });

    assert.ok(_.isPlainObject(entry), 'Expected users.create to return a plain object');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      role: { S: 'USER' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should get the entry', async () => {
    const entry = await users.get({ email: 'jdrydn@github.io' });

    assert.ok(_.isPlainObject(entry), 'Expected users.get to return a plain object');
    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update the entry', async () => {
    const entry = await users.update({
      avatarUrl: 'https://github.com/jdrydn.png',
      role: 'MODERATOR',
    }, {
      email: 'jdrydn@github.io',
    });

    assert.ok(_.isPlainObject(entry), 'Expected users.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      avatarUrl: { S: 'https://github.com/jdrydn.png' },
      role: { S: 'MODERATOR' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      email: 'jdrydn@github.io',
      name: 'James',
      avatarUrl: 'https://github.com/jdrydn.png',
      role: 'MODERATOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should fail to update the entry\'s avatar URL', async () => {
    try {
      await users.update({
        avatarUrl: 'data:application/vnd.microsoft.portable-executable,MEGAMAN.EXE',
      }, {
        email: 'jdrydn@github.io',
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
    const deleted = await users.delete({ email: 'jdrydn@github.io' });
    assert.ok(deleted === true, 'Expected users.delete to return a boolean');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, null);
  });

  it('should upsert the entry', async () => {
    const entry1 = await users.upsert({
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
    });

    assert.ok(_.isPlainObject(entry1), 'Expected users.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      role: { S: 'MODERATOR' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry1, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const entry2 = await users.upsert({
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      avatarUrl: 'https://github.com/jdrydn.png',
    });

    assert.ok(_.isPlainObject(entry2), 'Expected users.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      role: { S: 'MODERATOR' },
      avatarUrl: { S: 'https://github.com/jdrydn.png' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry2, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      avatarUrl: 'https://github.com/jdrydn.png',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should bulk-create some entries', async () => {
    const entries = await users.bulkCreate([
      {
        email: 'jdrydn1@github.io',
        name: 'James',
        role: 'ADMIN',
      },
      {
        email: 'jdrydn2@github.io',
        name: 'James 2',
        role: 'USER',
      }
    ]);

    assert.ok(Array.isArray(entries), 'Expected users.bulkCreate to return an array');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn1@github.io' } },
    }, {
      email: { S: 'jdrydn1@github.io' },
      name: { S: 'James' },
      role: { S: 'ADMIN' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn2@github.io' } },
    }, {
      email: { S: 'jdrydn2@github.io' },
      name: { S: 'James 2' },
      role: { S: 'USER' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entries, [
      {
        email: 'jdrydn1@github.io',
        name: 'James',
        role: 'ADMIN',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        email: 'jdrydn2@github.io',
        name: 'James 2',
        role: 'USER',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should bulk-get some entries', async () => {
    const entries = await users.bulkGet([
      { email: 'jdrydn1@github.io' },
      { email: 'jdrydn2@github.io' }
    ]);

    assert.ok(Array.isArray(entries), 'Expected users.bulkGet to return an array');

    assert.deepStrictEqual(entries, [
      {
        email: 'jdrydn1@github.io',
        name: 'James',
        role: 'ADMIN',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        email: 'jdrydn2@github.io',
        name: 'James 2',
        role: 'USER',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should bulk-delete some entries', async () => {
    const deleted = await users.bulkDelete([
      { email: 'jdrydn1@github.io' },
      { email: 'jdrydn2@github.io' }
    ]);

    assert.ok(deleted === true, 'Expected users.bulkDelete to return a boolean');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn1@github.io' } },
    }, null);
    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn2@github.io' } },
    }, null);
  });

}));
