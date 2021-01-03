# Using Models

So, you've [wrote your model](./Writing-Models), and now it's time to use it!

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
```

## Singular action

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
```

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

### `model.delete(key[, opts])`

```js
const user = await users.delete({ email: 'jdrydn@github.io' });
console.log(user);
// true
```

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

## Bulk actions

### `model.bulkCreate(items[, opts])`

- Creates new items, throwing an error if a hash/range combination already exists.
- Each `items` object must contain the hash/range properties.
- `bulkCreate` can create a maximum of 25 items at a time.
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

### `model.bulkGet(keys[, opts])`

- Fetches items by hash/range combinations, returning `null` if the hash/range combination does not exists.
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

### `model.bulkDelete(keys[, opts])`

```js
const users = await users.bulkGet([
  { email: 'jdrydn1@github.io' },
  { email: 'jdrydn2@github.io' },
]);
console.log(users);
// true
```
