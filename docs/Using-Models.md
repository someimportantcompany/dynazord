---
title: Using Models
nav_order: 4
---

# Using Models

So, you've [wrote your model](./Writing-Models), and now it's time to use it!

**Important reminder:** All models work with native JS object, **instead of documents** as you'd expect from a more traditional ORM. Hence you'll find the documentation refers to **items**, not documents.

1. TOC
{:toc}

```js
const dynazord = require('dynazord');

const users = dynazord.createModel({
  tableName: 'dynazord-example-users',
  keySchema: 'email',
  properties: {
    email: {
      type: String,
      required: true,
      validate: {
        notNull: true,
      },
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: [ 'ADMIN', 'MODERATOR', 'EDITOR', 'USER' ],
      default: 'USER',
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

const sessions = dynazord.createModel({
  tableName: 'dynazord-example-sessions',
  // "Primary" index of email + accessToken
  keySchema: { hash: 'email', range: 'accessToken' },
  secondaryIndexes: {
    // "Secondary" index called "sessionsByTime" of email + createdAt
    sessionsByTime: { hash: 'email', range: 'createdAt' },
  },
  properties: {
    email: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
      default: () => uuid(),
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      // This sets the underlying `createdAt` property to a number format underneath
      format: Number,
    },
    lastActiveAt: {
      type: Date,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});
```

## Singular CRUD

### `model.create(item[, opts])`

- Creates a new item, throwing an error if the hash/range combination already exists.
- `item` must contain the hash/range properties.

```js
const user = await users.create({
  email: 'jdrydn@github.io',
  name: 'James D',
  avatar: 'https://github.com/jdrydn.png',
});

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }

const session = await users.create({
  email: 'jdrydn@github.io',
  ipAddress: '127.0.0.1',
  userAgent: 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15',
});

console.log(session);
// { email: 'jdrydn@github.io',
//   accessToken: '7897d78d-8616-4d63-a0ba-43fb896e6842',
//   ipAddress: '127.0.0.1',
//   userAgent: 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `hooks` | Boolean to execute hooks, defaults to `true` |

### `model.get(key[, opts])`

- Fetches an item by hash/range combination, throwing an error if the hash/range combination does not exists.

```js
const user = await users.get({ email: 'jdrydn@github.io' });

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, sets the following:

| Option | Description |
| ---- | ---- |
| `attributesToGet` | An array of properties to build a ProjectedExpression underneath. |
| `consistentRead` | A boolean to [determine consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html). |

### `model.update(data, key[, opts])`

- Update an item, throwing an error if the hash/range combination does not exists.

```js
const user = await users.update({ role: 'EDITOR' }, { email: 'jdrydn@github.io' });

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png',
//   role: 'EDITOR',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `hooks` | Boolean to execute hooks, defaults to `true` |

### `model.delete(key[, opts])`

```js
const user = await users.delete({ email: 'jdrydn@github.io' });

console.log(user);
// true
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `hooks` | Boolean to execute hooks, defaults to `true` |

### `model.upsert(item[, opts])`

- Inserts/updates an item, overwriting properties that you provide.
- Just like [create](#modelcreateitem-opts), `item` must contain the hash/range properties.

```js
const user = await users.upsert({
  email: 'jdrydn@github.io',
  name: 'James D',
  avatar: 'https://github.com/jdrydn.png',
  role: 'EDITOR',
});

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png',
//   role: 'EDITOR',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `hooks` | Boolean to execute hooks, defaults to `true` |

## Bulk CRUD

### `model.bulkCreate(items[, opts])`

- Creates up to 25 items, throwing an error if a [primary key](./Writing-Models.md#primary-index) already exists.
- Each item must include the [primary key](./Writing-Models.md#primary-index) properties.
- Applied in a transaction, so if one fails they all fail.
- This method uses [`DynamoDB.transactWriteItems`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#transactWriteItems-property) underneath, so you are also bound by `transactWriteItems` limitations too.

```js
const users = await users.bulkCreate([
  { email: 'jdrydn1@github.io', name: 'James 1' },
  { email: 'jdrydn2@github.io', name: 'James 2' },
]);

console.log(users);
// [ { email: 'jdrydn@github.io',
//     name: 'James 1',
//     role: 'USER',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] },
//   { email: 'jdrydn2@github.io',
//     name: 'James 2',
//     role: 'USER',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] } ]
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.bulkGet(keys[, opts])`

- Fetch up to 25 items at a time, specified by their [primary key](./Writing-Models.md#primary-index), returning `null` if they do not exist.
- Applied in a transaction, so if one fails they all fail.
- This method uses [`DynamoDB.transactGetItems`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#transactGetItems-property) underneath, so you are also bound by `transactGetItems` limitations too.

```js
const users = await users.bulkGet([
  { email: 'jdrydn1@github.io' },
  { email: 'jdrydn2@github.io' },
]);

console.log(users);
// [ { email: 'jdrydn@github.io',
//     name: 'James 1',
//     role: 'USER',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] },
//   { email: 'jdrydn2@github.io',
//     name: 'James 2',
//     role: 'USER',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] } ]
```

### `model.bulkUpdate(data, keys[, opts])`

- Apply the same update to up to 25 items at a time, specified by their [primary key](./Writing-Models.md#primary-index).
- Applied in a transaction, so if one fails they all fail.
- This method uses [`DynamoDB.transactWriteItems`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#transactWriteItems-property) underneath, so you are also bound by `transactWriteItems` limitations too.

```js
const users = await users.bulkUpdate({
  avatar: 'https://http.cat/409',
}, [
  { email: 'jdrydn1@github.io' },
  { email: 'jdrydn2@github.io' },
]);

console.log(users);
// [ { email: 'jdrydn@github.io',
//     name: 'James 1',
//     role: 'USER',
//     avatar: 'https://http.cat/409',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] },
//   { email: 'jdrydn2@github.io',
//     name: 'James 2',
//     role: 'USER',
//     avatar: 'https://http.cat/409',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] } ]
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.bulkDelete(keys[, opts])`

- Delete up to 25 items at a time, specified by their [primary key](./Writing-Models.md#primary-index).
- Applied in a transaction, so if one fails they all fail.
- This method uses [`DynamoDB.transactWriteItems`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#transactWriteItems-property) underneath, so you are also bound by `transactWriteItems` limitations too.

```js
const users = await users.bulkDelete([
  { email: 'jdrydn1@github.io' },
  { email: 'jdrydn2@github.io' },
]);

console.log(users);
// true
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.bulkUpsert(items[, opts])`

- Create-or-update up to 25 items at a time, regardless of if their [primary key](./Writing-Models.md#primary-index) already exists.
- Each item must include the [primary key](./Writing-Models.md#primary-index) properties.
- Applied in a transaction, so if one fails they all fail.
- This method uses [`DynamoDB.transactWriteItems`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#transactWriteItems-property) underneath, so you are also bound by `transactWriteItems` limitations too.

```js
const users = await users.bulkUpsert([
  { email: 'jdrydn1@github.io', name: 'James 1', avatar: 'https://http.cat/307' },
  { email: 'jdrydn2@github.io', name: 'James 2' },
]);

console.log(users);
// [ { email: 'jdrydn@github.io',
//     name: 'James 1',
//     role: 'USER',
//     avatar: 'https://http.cat/307',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] },
//   { email: 'jdrydn2@github.io',
//     name: 'James 2',
//     role: 'USER',
//     createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] } ]
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

## Query & Scans

There are two concepts to understand when looking up values in DynamoDB: [`query`](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html) & [`scan`](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html). The essential difference is a `query` searches for items using indexes) whereas a `scan` reads every item in a table to find results.

### `model.query(key[, opts])`

- Searches across the DynamoDB table using the [primary index](./Writing-Models.md#primary-index) (by default) or [secondary indexes](./Writing-Models.md#secondary-indexes) (if `indexName` is specified).
- You must provide the `hash` key with a single value, optionally you can include the `range` key with a comparison to refine the results.
- You can optionally provide `opts.filter` to add [filter expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.FilterExpression) to a query.

```js
const { gt } = dynazord.operators;
const results = await posts.query({
  blogID: 'theverge.com',
  publishedAt: { [gt]: new Date('2020-01-01') },
}, {
  // Optionally set the index name
  indexName: 'blogPublishedAt',
  // Optionally filter unwanted entries
  filter: { status: 'ACTIVE' },
  // Optionally reverse the sort order to get latest posts first
  scanIndexForward: false,
  // And optionally fetch 10 results maximum
  limit: 10,
});
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `attributesToGet` | An array of properties to build a ProjectedExpression underneath. |
| `consistentRead` | A boolean to [determine consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html). |
| `filter` | A [filter expression](#filter-expressions) to restrict results. |
| `exclusiveStartKey` | An optional object to specify a start-key for pagination. |
| `indexName` | An optional string to specify the index you'd like to query with. |
| `limit` | An optional number to specify the number of results you want to be returned. |
| `scanIndexForward` | A boolean to specify the order for index traversal, if `true` (default) sorts in ascending & `false` sorts in descending. |

#### Key Conditions

Key conditions are a subset of [filter expressions](#filter-expressions), allowing you to immediately query for a subset of items using the [primary index](./Writing-Models.md#primary-index) (by default) or [secondary indexes](./Writing-Models.md#secondary-indexes) (if `indexName` is specified):

```js
// Specify just the hash key (partition key)
{ blogID: 'theverge.com' }

// Specify the hash key (partition key) & the range key (sort key)
{ blogID: 'theverge.com', publishedAt: { [gt]: new Date('2020-01-01') } }
```

Supported operators (exported as `dynazord.operators`) for key conditions are:

| Symbol | Operator |
| ---- | ---- |
| `eq` | Equals |
| `lt` | Less-Than |
| `lte` | Less-Than-Or-Equals |
| `gt` | Greater-Than |
| `gte` | Greater-Than-Or-Equals |

### `model.scan(filter[, opts])`

```js
const { gt } = dynazord.operators;
const results = await posts.scan({
  blogID: 'theverge.com',
  publishedAt: { [gt]: new Date('2020-01-01') },
  status: 'ACTIVE',
}, {
  // Optionally set the index name
  indexName: 'blogPublishedAt',
  // And optionally fetch 10 results maximum
  limit: 10,
});
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `attributesToGet` | An array of properties to build a ProjectedExpression underneath. |
| `consistentRead` | A boolean to [determine consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html). |
| `exclusiveStartKey` | An optional object to specify a start-key for pagination. |
| `indexName` | An optional string to specify the index you'd like to scan with. |
| `limit` | An optional number to specify the number of results you want to be returned. |
| `scanIndexForward` | A boolean to specify the order for index traversal, if `true` (default) sorts in ascending & `false` sorts in descending. |

### Filter Expressions

Filter expressions are objects that define filter statements.

```js
const { or, gt, lt } = dynazord.operators;

{ blogID: 'theverge.com' }
// blogID = "theverge.com"

{ blogID: 'theverge.com', publishedAt: { [gt]: new Date('2020-01-01') } }
// blogID = "theverge.com" AND publishedAt > 1577836800000

{ blogID: 'theverge.com', publishedAt: { [gt]: new Date('2019-01-01'), [lt]: new Date('2020-01-01') } }
// blogID = "theverge.com" AND publishedAt > 1546300800000 AND publishedAt < 1577836800000

{ [or]: [ { blogID: 'carthrottle.com' }, { blogID: 'wtf1.com' } ], publishedAt: { [lt]: new Date('2020-01-01') } }
// (blogID = "carthrottle.com" OR blogID = "wtf1.com") AND publishedAt < 1577836800000
```

Supported operators (exported as `dynazord.operators`) for filter conditions are:

| Symbol | Operator |
| ---- | ---- |
| `and` | And |
| `or` | Or |
| `not` | Not |
| `eq` | Equals |
| `lt` | Less-Than |
| `lte` | Less-Than-Or-Equals |
| `gt` | Greater-Than |
| `gte` | Greater-Than-Or-Equals |
| `in` | In |

`and`, `or` & `not` support nested expressions. `lt`/`lte` & `gt`/`gte` can be used together, but the rest are exclusive.

### Pagination

You can iterate through pages by taking `results.lastEvaluatedKey` & passing it as `exclusiveStartKey` to future [`query`](#modelquerykey-opts)/[`scan`](#modelscanfilter-opts) calls:

```js
const page1 = await posts.query({ blogID: 'theverge.com' }, {
  // Optionally set the index name
  indexName: 'blogPublishedAt',
  // Optionally filter unwanted entries
  filter: { status: 'ACTIVE' },
  // Optionally reverse the sort order to get latest posts first
  scanIndexForward: false,
  // And optionally fetch 10 results at a time
  limit: 10,
});

console.log(page1);
// [ { id: '73da08d1-3c23-4819-b37c-cde4c7fcca65',
//     blogID: 'theverge.com'
//     publishedAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     ...: ... },
//   { ...: ... },
//   { ...: ... },
//   count: 10,
//   scannedCount: 18,
//   lastEvaluatedKey: Buffer<...> ]

const page2 = await posts.query({ blogID: 'theverge.com' }, {
  // Optionally set the index name
  indexName: 'blogPublishedAt',
  // Optionally filter unwanted entries
  filter: { status: 'ACTIVE' },
  // Optionally reverse the sort order to get latest posts first
  scanIndexForward: false,
  // And optionally fetch 10 results at a time
  limit: 10,
  // Passing through lastEvaluatedKey
  exclusiveStartKey: page1.lastEvaluatedKey,
});

console.log(page1);
// [ { id: '73da08d1-3c23-4819-b37c-cde4c7fcca65',
//     blogID: 'theverge.com'
//     publishedAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//     ...: ... },
//   { ...: ... },
//   { ...: ... },
//   count: 8,
//   scannedCount: 18,
//   lastEvaluatedKey: undefined ]
```

You can also use `lastEvaluatedKey` to work out if there are more items to fetch.

## Transactions

DynamoDB supports transactions - in fact plenty of the bulk methods use transactions underneath - so of course models support transactions too!

```js
const [ user, session ] = await dynazord.transaction([
  users.transaction.upsert({,
    email: 'jdrydn@github.io',
    name: 'James',
  }),
  sessions.transaction.create({
    email: 'jdrydn@github.io',
    ipAddress: '127.0.0.1',
    userAgent: 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15',
  }),
]);

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }

console.log(session);
// { email: 'jdrydn@github.io',
//   accessToken: '7897d78d-8616-4d63-a0ba-43fb896e6842',
//   ipAddress: '127.0.0.1',
//   userAgent: 'Safari (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

- Executes up to 25 transaction statements with `dynazord.transaction` at a time, across all your models.
- This doesn't support models that are created with explicit `dynamodb` clients passed to it.
- You cannot mix reads & writes - you can read up to 25 items or write up to 25 items, not both.

### `model.transaction.create(item[, opts])`

Create an item within a transaction.

```js
const [ user ] = await dynazord.transaction([
  users.transaction.create({
    email: 'jdrydn@github.io',
    name: 'James',
  }),
]);

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.transaction.get(key[, opts])`

Get an item within a transaction.

```js
const [ user ] = await dynazord.transaction([
  users.transaction.get({
    email: 'jdrydn@github.io',
  }),
]);

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.transaction.update(data, key[, opts])`

Update an item within a transaction.

```js
const [ user ] = await dynazord.transaction([
  users.transaction.update({
    avatar: 'https://http.cat/410',
  }, {
    email: 'jdrydn@github.io',
  }),
]);

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://http.cat/410',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.transaction.delete(key[, opts])`

Delete an item within a transaction.

```js
const [ user ] = await dynazord.transaction([
  users.transaction.update({
    avatar: 'https://http.cat/410',
  }, {
    email: 'jdrydn@github.io',
  }),
]);

console.log(user);
// true
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

### `model.transaction.upsert(item[, opts])`

Create-or-update an item within a transaction.

```js
const [ user ] = await dynazord.transaction([
  users.transaction.upsert({
    email: 'jdrydn@github.io',
    name: 'James',
  }),
]);

console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   role: 'USER',
//   createdAt: [Date YYYY-MM-DDTHH:mm:ss.Z],
//   updatedAt: [Date YYYY-MM-DDTHH:mm:ss.Z] }
```

`opts` is an optional object, passed to hooks & sets the following:

| Option | Description |
| ---- | ---- |
| `bulkHooks` | Boolean to execute bulk-hooks, defaults to `true` |
| `hooks` | Boolean to execute hooks, defaults to `false` |

## Further Reading

- [Working with Queries in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html)
- [Working with Scans in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html)
- [When to use (and when not to use) DynamoDB Filter Expressions](https://www.alexdebrie.com/posts/dynamodb-filter-expressions/)
- [Improving data access with secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html)

---

Next, check out some [examples](../examples/).
