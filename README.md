![Dynazord logo](./docs/logo.png)

[![NPM](https://badge.fury.io/js/dynazord.svg)](https://npm.im/dynazord)
[![CI](https://github.com/someimportantcompany/dynazord/workflows/Test/badge.svg?branch=master)](https://github.com/someimportantcompany/dynazord/actions?query=branch%3Amaster)
[![Coverage](https://coveralls.io/repos/github/someimportantcompany/dynazord/badge.svg)](https://coveralls.io/github/someimportantcompany/dynazord)

[DynamoDB](https://aws.amazon.com/dynamodb) [NodeJS](https://nodejs.org) [ORM](https://en.wikipedia.org/wiki/Object–relational_mapping), inspired by similar ORMs like [Mongoose](https://mongoosejs.com) & [Sequelize](https://sequelize.org).

```js
const dynazord = require('dynazord');

const users = dynazord.createModel({
  tableName: 'dynazord-test-users',
  keySchema: {
    hash: 'email',
  },
  properties: {
    email: {
      type: String,
      required: true,
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
      default: () => 'USER',
    },
  },
});

const user = await users.create({
  email: 'jdrydn@github.io',
  name: 'James D',
  avatar: 'https://github.com/jdrydn.png',
});
console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png'
//   role: 'USER' }

const user = await users.get({ email: 'jdrydn@github.io' });
console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png'
//   role: 'USER' }

const user = await users.update({ role: 'EDITOR' }, { email: 'jdrydn@github.io' });
console.log(user);
// { email: 'jdrydn@github.io',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png'
//   role: 'EDITOR' }

const user = await users.delete({ email: 'jdrydn@github.io' });
console.log(user);
// true
```

This library is designed to simplify interaction with DynamoDB, offering more traditional CRUD methods instead of learning DynamoDB's [`getItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#getItem-property)/[`putItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property) methods. You can also write functions to validate properties on objects & add other hooks to transform data to suit your needs.

### Features

- Create schemas for items in DynamoDB, with validation & hooks to transform data on read & write.
- Read/write methods supporting create, read, update, delete & upsert.
- Bulk read/write methods supporting create, read, update, delete & upsert.
- Transactional read/write methods supporting create, read, update, delete & upsert.
- Query & scan support, following DynamoDB principles.
- "OneTable" support, where models can share the same DynamoDB table underneath.

## Installation

```bash
$ npm install --save dynazord
```

## Documentation

- [Getting Started](./docs/1-Getting-Started.md)
- [Writing Models](./docs/2-Writing-Models.md)
- [Using Models](./docs/3-Using-Models.md)
- [Examples](./examples/)

## Development

- Documentation is stored in Git, alongside code, therefore as code changes so should the documentation!
- All major work should be in feature branches, include tests & finish with a PR into `master`.
- To run tests, fire up [`amazon/dynamodb-local`](https://hub.docker.com/r/amazon/dynamodb-local)
  ```
  docker run --rm -d --name dynamodb -p 8000:8000 amazon/dynamodb-local
  ```
  - Please take note of [the differences](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Differences) between the production AWS DynamoDB platform & local Docker container.

---

Any questions or suggestions please [open an issue](https://github.com/someimportantcompany/dynazord/issues).
