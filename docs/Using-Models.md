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

### `model.create(item)`

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

### `model.get(key, [opts])`

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

### `model.update(data, key)`

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

### `model.delete(key)`

```js
const user = await users.delete({ email: 'jdrydn@github.io' });
console.log(user);
// true
```

## Bulk actions

### `model.bulkCreate(items[, opts])`

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

### `model.bulkGet(keys)`

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

### `model.bulkDelete(keys)`

```js
const users = await users.bulkGet([
  { email: 'jdrydn1@github.io' },
  { email: 'jdrydn2@github.io' },
]);
console.log(users);
// true
```
