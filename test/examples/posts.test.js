const _ = require('lodash');
const assert = require('assert');
const mockdate = require('mockdate');
const rewire = require('rewire');
const { dynamodb, assertItem, deleteThenCreateTable } = require('../utils');
const { v4: uuid } = require('uuid');

describe('examples', () => describe('posts', () => {
  const dynazord = require('dynazord');
  const posts = rewire('../../examples/posts');

  const currentDate = new Date();
  const link1 = 'https://www.theverge.com/22158504/best-games-2020-ps5-xbox-nintendo-tlou2-animal-crossing-miles-morales';
  const link2 = 'https://www.theverge.com/22176305/best-movies-2020-first-cow-lovers-rock-bill-and-ted';

  const ids = [];

  before(async () => {
    await deleteThenCreateTable(dynamodb, posts.__get__('createTable'));
    mockdate.set(currentDate);
  });

  after(() => {
    mockdate.reset();
  });

  it('should fail to create an entry without required fields', async () => {
    try {
      await posts.create({});
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[blogID]: Expected required field to be set');
      assert.strictEqual(err.key, 'blogID');
    }
  });

  it('should fail to create an entry with an invalid enum value', async () => {
    try {
      await posts.create({
        title: 'Hello, world!',
        blogID: 'news.ycombinator.com',
        content: [ { html: '<p>Hello, world!</p>' } ],
        status: 'DRAFT',
      });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, '[blogID]: Expected value to be one of: jdrydn.com, theverge.com');
      assert.strictEqual(err.value, 'news.ycombinator.com');
    }
  });

  it('should create a new entry', async () => {
    const entry = await posts.create({
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
    });

    assert.ok(_.isPlainObject(entry), 'Expected posts.create to return a plain object');
    assert.ok(typeof entry.id === 'string' && entry.id.length, 'Expected posts.create to return an ID');
    const { id } = entry;

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      blogID: { S: 'jdrydn.com' },
      title: { S: 'Hello, world!' },
      slug: { S: 'hello-world' },
      content: { L: [ { M: { html: { S: '<p>Hello, world!</p>' } } } ] },
      status: { S: 'DRAFT' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    ids.push(entry.id);
  });

  it('should get the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected posts.create to have succeeded');

    const entry = await posts.get({ id });

    assert.ok(_.isPlainObject(entry), 'Expected posts.get to return a plain object');
    assert.deepStrictEqual(entry, {
      id: entry.id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should scan for the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected posts.create to have succeeded');

    const results = await posts.scan({ title: 'Hello, world!' });
    assert.ok(Array.isArray(results) && results.length === 1, 'Expected posts.scan to return results');
    assert.ok(_.isPlainObject(results[0]) && results[0].id, 'Expected posts.scan to return an entry');

    assert.deepStrictEqual(results[0], {
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should update the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected posts.create to have succeeded');

    const entry = await posts.update({
      content: [ { html: '<p>Hello, world!</p>' }, { embed: { title: 'Hello, world!' } } ],
      status: 'PUBLISHED',
    }, {
      id,
    });

    assert.ok(_.isPlainObject(entry), 'Expected posts.update to return a plain object');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: entry.id } },
    }, {
      id: { S: id },
      blogID: { S: 'jdrydn.com' },
      title: { S: 'Hello, world!' },
      slug: { S: 'hello-world' },
      content: {
        L: [
          { M: { html: { S: '<p>Hello, world!</p>' } } },
          { M: { embed: { M: { title: { S: 'Hello, world!' } } } } },
        ],
      },
      status: { S: 'PUBLISHED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry, {
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' }, { embed: { title: 'Hello, world!' } } ],
      status: 'PUBLISHED',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should increment the entry\'s page views', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected posts.create to have succeeded');

    const updated = await posts.updateProperty({
      expression: 'SET #pageViews = if_not_exists(#pageViews, :start) + :diff',
      names: { '#pageViews': 'pageViews' },
      values: { ':start': 0, ':diff': 1 },
    }, {
      id,
    });

    assert.deepStrictEqual(updated, { pageViews: 1 }, 'Expected posts.updateProperty to return the new values');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      blogID: { S: 'jdrydn.com' },
      title: { S: 'Hello, world!' },
      slug: { S: 'hello-world' },
      content: {
        L: [
          { M: { html: { S: '<p>Hello, world!</p>' } } },
          { M: { embed: { M: { title: { S: 'Hello, world!' } } } } },
        ],
      },
      pageViews: { N: '1' },
      status: { S: 'PUBLISHED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
  });

  it('should delete the entry', async () => {
    const [ id ] = ids;
    assert.ok(typeof id === 'string' && id.length, 'Expected posts.create to have succeeded');

    const deleted = await posts.delete({ id });
    assert.ok(deleted === true, 'Expected posts.delete to return a boolean');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id } },
    }, null);

    ids.splice(0, ids.length);
    assert.ok(ids.length === 0, 'Expected ids to be an empty array');
  });

  it('should upsert the entry', async () => {
    const id = uuid();

    const entry1 = await posts.upsert({
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
    });

    assert.ok(_.isPlainObject(entry1), 'Expected posts.upsert to return a plain object');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      blogID: { S: 'jdrydn.com' },
      title: { S: 'Hello, world!' },
      slug: { S: 'hello-world' },
      content: { L: [ { M: { html: { S: '<p>Hello, world!</p>' } } } ] },
      status: { S: 'DRAFT' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry1, {
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'DRAFT',
      createdAt: currentDate,
      updatedAt: currentDate,
    });

    const entry2 = await posts.upsert({
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'PUBLISHED',
    });

    assert.ok(_.isPlainObject(entry2), 'Expected posts.upsert to return a plain object');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id } },
    }, {
      id: { S: id },
      blogID: { S: 'jdrydn.com' },
      title: { S: 'Hello, world!' },
      slug: { S: 'hello-world' },
      content: { L: [ { M: { html: { S: '<p>Hello, world!</p>' } } } ] },
      status: { S: 'PUBLISHED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entry2, {
      id,
      title: 'Hello, world!',
      blogID: 'jdrydn.com',
      slug: 'hello-world',
      content: [ { html: '<p>Hello, world!</p>' } ],
      status: 'PUBLISHED',
      createdAt: currentDate,
      updatedAt: currentDate,
    });
  });

  it('should bulk-create some entries', async () => {
    const entries = await posts.bulkCreate([
      {
        title: 'The best games of 2020',
        blogID: 'theverge.com',
        content: [ { embed: { link: link1 } } ],
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
        status: 'PUBLISHED',
      },
      {
        title: 'The best movies of 2020',
        blogID: 'theverge.com',
        content: [ { embed: { link: link2 } } ],
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
        status: 'PUBLISHED',
      }
    ]);

    assert.ok(Array.isArray(entries), 'Expected posts.bulkCreate to return an array');
    const [ { id: id1 }, { id: id2 } ] = entries;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id1 } },
    }, {
      id: { S: id1 },
      title: { S: 'The best games of 2020' },
      blogID: { S: 'theverge.com' },
      publishedAt: { N: '1608390000000' },
      slug: { S: 'the-best-games-of-2020' },
      content: { L: [ { M: { embed: { M: { link: { S: link1 } } } } } ] },
      status: { S: 'PUBLISHED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id2 } },
    }, {
      id: { S: id2 },
      title: { S: 'The best movies of 2020' },
      blogID: { S: 'theverge.com' },
      publishedAt: { N: '1608386400000' },
      slug: { S: 'the-best-movies-of-2020' },
      content: { L: [ { M: { embed: { M: { link: { S: link2 } } } } } ] },
      status: { S: 'PUBLISHED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entries, [
      {
        id: id1,
        title: 'The best games of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
        slug: 'the-best-games-of-2020',
        content: [ { embed: { link: link1 } } ],
        status: 'PUBLISHED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        id: id2,
        title: 'The best movies of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
        slug: 'the-best-movies-of-2020',
        content: [ { embed: { link: link2 } } ],
        status: 'PUBLISHED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);

    entries.forEach(({ id }) => ids.push(id));
  });

  it('should bulk-get some entries', async () => {
    const [ id1, id2 ] = ids;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    const entries = await posts.bulkGet([ { id: id1 }, { id: id2 } ]);
    assert.ok(Array.isArray(entries), 'Expected posts.bulkGet to return an array');

    assert.deepStrictEqual(entries, [
      {
        id: id1,
        title: 'The best games of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
        slug: 'the-best-games-of-2020',
        content: [ { embed: { link: link1 } } ],
        status: 'PUBLISHED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        id: id2,
        title: 'The best movies of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
        slug: 'the-best-movies-of-2020',
        content: [ { embed: { link: link2 } } ],
        status: 'PUBLISHED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should query entries by secondary index', async () => {
    const [ id1, id2 ] = ids;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    const entries = await posts.query({ blogID: 'theverge.com' }, { indexName: 'blogPostsByTime' });
    assert.ok(Array.isArray(entries), 'Expected posts.bulkGet to return an array');

    assert.deepStrictEqual(entries, [
      {
        id: id2,
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
      },
      {
        id: id1,
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
      },
    ]);
  });

  it('should query entries by secondary index (reverse)', async () => {
    const [ id1, id2 ] = ids;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    const { gt } = dynazord.operators;
    const entries = await posts.query({
      blogID: 'theverge.com',
      publishedAt: { [gt]: new Date('2020-12-19T10:00:00.000Z') },
    }, {
      indexName: 'blogPostsByTime',
      scanIndexForward: false,
    });
    assert.ok(Array.isArray(entries), 'Expected posts.bulkGet to return an array');

    assert.deepStrictEqual(entries, [
      {
        id: id1,
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
      },
      {
        id: id2,
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
      },
    ]);
  });

  it('should bulk-update some entries', async () => {
    const [ id1, id2 ] = ids;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    const entries = await posts.bulkUpdate({ status: 'DELETED' }, [ { id: id1 }, { id: id2 } ]);
    assert.ok(Array.isArray(entries), 'Expected posts.bulkUpdate to return an array');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id1 } },
    }, {
      id: { S: id1 },
      title: { S: 'The best games of 2020' },
      blogID: { S: 'theverge.com' },
      publishedAt: { N: '1608390000000' },
      slug: { S: 'the-best-games-of-2020' },
      content: { L: [ { M: { embed: { M: { link: { S: link1 } } } } } ] },
      status: { S: 'DELETED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });
    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id2 } },
    }, {
      id: { S: id2 },
      title: { S: 'The best movies of 2020' },
      blogID: { S: 'theverge.com' },
      publishedAt: { N: '1608386400000' },
      slug: { S: 'the-best-movies-of-2020' },
      content: { L: [ { M: { embed: { M: { link: { S: link2 } } } } } ] },
      status: { S: 'DELETED' },
      createdAt: { S: currentDate.toISOString() },
      updatedAt: { S: currentDate.toISOString() },
    });

    assert.deepStrictEqual(entries, [
      {
        id: id1,
        title: 'The best games of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T15:00:00.000Z'),
        slug: 'the-best-games-of-2020',
        content: [ { embed: { link: link1 } } ],
        status: 'DELETED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        id: id2,
        title: 'The best movies of 2020',
        blogID: 'theverge.com',
        publishedAt: new Date('2020-12-19T14:00:00.000Z'),
        slug: 'the-best-movies-of-2020',
        content: [ { embed: { link: link2 } } ],
        status: 'DELETED',
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ]);
  });

  it('should bulk-delete some entries', async () => {
    const [ id1, id2 ] = ids;
    assert(typeof id1 === 'string' && id1.length, 'Expected id1 to be a string');
    assert(typeof id2 === 'string' && id2.length, 'Expected id2 to be a string');

    const deleted = await posts.bulkDelete([ { id: id1 }, { id: id2 } ]);
    assert.ok(deleted === true, 'Expected posts.bulkDelete to return a boolean');

    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id1 } },
    }, null);
    await assertItem(dynamodb, {
      TableName: posts.tableName,
      Key: { id: { S: id2 } },
    }, null);
  });

}));
