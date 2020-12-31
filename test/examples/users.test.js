const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../fixtures/dynamodb');
const { users, createTable } = require('../../examples/users');

describe('examples', () => describe('users', () => {
  const currentDate = new Date();

  before(async () => {
    await deleteThenCreateTable(dynamodb, createTable);
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should create a new entry', async () => {
    const user = await users.create({
      email: 'jdrydn@github.io',
      name: 'James',
    });

    assert.ok(_.isPlainObject(user), 'Expected users.create to return a plain object');

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

    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should get the entry', async () => {
    const user = await users.get({ email: 'jdrydn@github.io' });

    assert.ok(_.isPlainObject(user), 'Expected users.get to return a plain object');
    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update the entry', async () => {
    const user = await users.update({
      avatarUrl: 'https://github.com/jdrydn.png',
      role: 'MODERATOR',
    }, {
      email: 'jdrydn@github.io',
    });

    assert.ok(_.isPlainObject(user), 'Expected users.update to return a plain object');

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

    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      avatarUrl: 'https://github.com/jdrydn.png',
      role: 'MODERATOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
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
    const user1 = await users.upsert({
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
    });

    assert.ok(_.isPlainObject(user1), 'Expected users.update to return a plain object');

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

    assert.deepStrictEqual(user1, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const user2 = await users.upsert({
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      avatarUrl: 'https://github.com/jdrydn.png',
    });

    assert.ok(_.isPlainObject(user2), 'Expected users.update to return a plain object');

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

    assert.deepStrictEqual(user2, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'MODERATOR',
      avatarUrl: 'https://github.com/jdrydn.png',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

}));
