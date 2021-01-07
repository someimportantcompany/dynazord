const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');

describe('examples', () => describe('users + sessions', () => {
  const dynazord = require('dynazord');
  const users = rewire('../../examples/users');
  const sessions = rewire('../../examples/sessions');

  const currentDate = new Date();
  const userAgent = 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15';

  before(async () => {
    await deleteThenCreateTable(dynamodb, users.__get__('createTable'));
    await deleteThenCreateTable(dynamodb, sessions.__get__('createTable'));
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should create a user & a session in a single transaction', async () => {
    const results = await dynazord.transaction([
      users.transaction.create({ email: 'jdrydn@github.io', name: 'James' }),
      sessions.transaction.create({ email: 'jdrydn@github.io', ipAddress: '127.0.0.1', userAgent }),
    ]);

    assert.ok(Array.isArray(results), 'Expected transaction to return an array');
    const [ user, session ] = results;
    assert.ok(_.isPlainObject(user), 'Expected users.transaction.create to return a plain object');
    assert.ok(_.isPlainObject(session), 'Expected sessions.transaction.create to return a plain object');

    assert.ok(typeof session.accessToken === 'string', 'Expected sessions.transaction.create to return an access token');
    assert.ok(session.createdAt instanceof Date, 'Expected sessions.transaction.create to return a createdAt date');

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
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: session.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
    assert.deepStrictEqual(session, {
      email: 'jdrydn@github.io',
      accessToken: session.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should get a user & a session in a single transaction', async () => {
    const results = await dynazord.transaction([
      users.transaction.get({ email: 'jdrydn@github.io' }),
      sessions.transaction.get({ email: 'jdrydn@github.io', createdAt: currentDate }),
    ]);

    assert.ok(Array.isArray(results), 'Expected transaction to return an array');
    const [ user, session ] = results;
    assert.ok(_.isPlainObject(user), 'Expected users.transaction.get to return a plain object');
    assert.ok(_.isPlainObject(session), 'Expected sessions.transaction.get to return a plain object');

    assert.ok(typeof session.accessToken === 'string', 'Expected sessions.transaction.get to return an access token');

    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
    assert.deepStrictEqual(session, {
      email: 'jdrydn@github.io',
      accessToken: session.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update a user & a session in a single transaction', async () => {
    const results = await dynazord.transaction([
      users.transaction.update({ role: 'EDITOR' }, { email: 'jdrydn@github.io' }),
      sessions.transaction.update({ lastActiveAt: currentDate }, { email: 'jdrydn@github.io', createdAt: currentDate }),
    ]);

    assert.ok(Array.isArray(results), 'Expected transaction to return an array');
    const [ user, session ] = results;
    assert.ok(_.isPlainObject(user), 'Expected users.transaction.update to return a plain object');
    assert.ok(_.isPlainObject(session), 'Expected sessions.transaction.update to return a plain object');

    assert.ok(typeof session.accessToken === 'string', 'Expected sessions.transaction.update to return the access token');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      role: { S: 'EDITOR' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: session.accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      lastActiveAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(user, {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'EDITOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
    assert.deepStrictEqual(session, {
      email: 'jdrydn@github.io',
      accessToken: session.accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      lastActiveAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should delete a user & a session in a single transaction', async () => {
    const results = await dynazord.transaction([
      users.transaction.delete({ email: 'jdrydn@github.io' }),
      sessions.transaction.delete({ email: 'jdrydn@github.io', createdAt: currentDate }),
    ]);

    assert.ok(Array.isArray(results), 'Expected transaction to return an array');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, null);
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, null);

    assert.deepStrictEqual(results, [ null, null ]);
  });

  it('should upsert a user & a session in a single transaction', async () => {
    const results1 = await dynazord.transaction([
      users.transaction.upsert({ email: 'jdrydn@github.io', name: 'James' }),
      sessions.transaction.upsert({ email: 'jdrydn@github.io', ipAddress: '127.0.0.1', userAgent }),
    ]);

    assert.ok(Array.isArray(results1), 'Expected transaction to return an array');
    assert.ok(_.isPlainObject(results1[0]), 'Expected users.transaction.upsert to return a plain object');
    assert.ok(_.isPlainObject(results1[1]), 'Expected sessions.transaction.upsert to return a plain object');

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
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: results1[1].accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.ok(typeof results1[1].accessToken === 'string', 'Expected sessions.transaction.upsert to return a access token');
    assert.ok(results1[1].createdAt instanceof Date, 'Expected sessions.transaction.upsert to return a createdAt date');

    assert.deepStrictEqual(results1[0], {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'USER',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
    assert.deepStrictEqual(results1[1], {
      email: 'jdrydn@github.io',
      accessToken: results1[1].accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const results2 = await dynazord.transaction([
      users.transaction.upsert({ email: 'jdrydn@github.io', name: 'James', role: 'EDITOR' }),
      sessions.transaction.upsert({ email: 'jdrydn@github.io', ipAddress: '127.0.0.1', userAgent, lastActiveAt: currentDate }),
    ]);

    assert.ok(Array.isArray(results2), 'Expected transaction to return an array');
    assert.ok(_.isPlainObject(results2[0]), 'Expected users.transaction.upsert to return a plain object');
    assert.ok(_.isPlainObject(results2[1]), 'Expected sessions.transaction.upsert to return a plain object');

    await assertItem(dynamodb, {
      TableName: users.tableName,
      Key: { email: { S: 'jdrydn@github.io' } },
    }, {
      email: { S: 'jdrydn@github.io' },
      name: { S: 'James' },
      role: { S: 'EDITOR' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: sessions.tableName,
      Key: { email: { S: 'jdrydn@github.io' }, createdAt: { N: currentDate.getTime().toString() } },
    }, {
      email: { S: 'jdrydn@github.io' },
      accessToken: { S: results2[1].accessToken },
      ipAddress: { S: '127.0.0.1' },
      userAgent: { S: userAgent },
      createdAt: { N: currentDate.getTime().toString() },
      lastActiveAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.ok(typeof results2[1].accessToken === 'string', 'Expected sessions.transaction.upsert to return a access token');
    assert.ok(results2[1].createdAt instanceof Date, 'Expected sessions.transaction.upsert to return a createdAt date');

    assert.deepStrictEqual(results2[0], {
      email: 'jdrydn@github.io',
      name: 'James',
      role: 'EDITOR',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
    assert.deepStrictEqual(results2[1], {
      email: 'jdrydn@github.io',
      accessToken: results2[1].accessToken,
      ipAddress: '127.0.0.1',
      userAgent,
      createdAt: currentDate,
      lastActiveAt: currentDate,
      updatedAt: currentDate,
    });
  });

}));
