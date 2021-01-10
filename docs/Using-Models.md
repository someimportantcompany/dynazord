# Using Models

So, you've [wrote your model](./Writing-Models.md), and now it's time to use it!

**Important reminder:** All models work with native JS object, **instead of documents** as you'd expect from a more traditional ORM. Hence you'll find the documentation refers to **items**, not documents.

| Table of Contents |
| ---- |
| [Singular CRUD](#singular-crud) |
| [`model.create(item[, opts])`](#modelcreateitem-opts) |
| [`model.get(key[, opts])`](#modelgetkey-opts) |
| [`model.update(data, key[, opts])`](#modelupdatedata-key-opts) |
| [`model.upsert(item[, opts])`](#modelupsertitem-opts) |
| [Bulk CRUD](#bulk-crud) |
| [`model.bulkCreate(items[, opts])`](#modelbulkcreateitems-opts) |
| [`model.bulkGet(keys[, opts])`](#modelbulkgetkeys-opts) |
| [`model.bulkUpdate(data, keys[, opts])`](#modelbulkupdatedata-keys-opts) |
| [`model.bulkDelete(keys[, opts])`](#modelbulkdeletekeys-opts) |
| [`model.bulkUpsert(items[, opts])`](#modelbulkupsertitems-opts) |
| [Query & Scans](#query--scans) |
| [`model.query(key[, opts])`](#modelquerykey-opts) |
| [`model.scan(filter[, opts])`](#modelscanfilter-opts) |
| [Transactions](#transactions) |
| [`model.transaction.create(item[, opts])`](#modeltransactioncreateitem-opts) |
| [`model.transaction.get(key[, opts])`](#modeltransactiongetkey-opts) |
| [`model.transaction.update(data, key[, opts])`](#modeltransactionupdatedata-key-opts) |
| [`model.transaction.delete(key[, opts])`](#modeltransactiondeletekey-opts) |
| [`model.transaction.upsert(item[, opts])`](#modeltransactionupsertitem-opts) |
| [Further Reading](#further-reading) |

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

### `model.scan(filter[, opts])`

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

### Filter Expressions

### Pagination

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
