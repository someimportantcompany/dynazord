<div align="center" style="margin-bottom: 50px">
  <h1>dynazord</h1>
  <a href="https://npm.im/dynazord"><img alt="NPM" src="https://badge.fury.io/js/dynazord.svg"/></a>
  <a href="https://github.com/jdrydn/dynazord/actions?query=branch%3Amaster"><img alt="CI" src="https://github.com/jdrydn/dynazord/workflows/Test/badge.svg?branch=master"/></a>
  <!-- <a href="https://coveralls.io/github/jdrydn/dynazord?branch=master"><img alt="Coverage" src="https://coveralls.io/repos/github/jdrydn/dynazord/badge.svg?branch=master"/></a> -->
  <a href="./docs/"><img alt="Docs" src="https://img.shields.io/static/v1?label=Read&message=Documentation&color=blue&logo=read-the-docs"/></a>
</div>

Yet another [DynamoDB](https://aws.amazon.com/dynamodb) [NodeJS](https://nodejs.org) [ORM](https://en.wikipedia.org/wiki/Object–relational_mapping), inspired by similar ORMs like [Mongoose](https://mongoosejs.com) & [Sequelize](https://sequelize.org).

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

This library is designed to simplify interaction with DynamoDB, offering more traditional CRUD methods instead of learning DynamoDB's [`getItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#getItem-property)/[`putItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property) methods. You can also write functions to validate properties on objects.

## Installation

```
npm install --save dynazord
```

## Documentation

- [Getting Started](./docs/Getting-Started.md)
- [Writing Models](./docs/Writing-Models.md)
- [Using Models](./docs/Using-Models.md)
- [Examples](./examples/)
- [Alternatives](./docs/#alternatives)

| Version | Links |
| ---- | ---- |
| [`v0.1.0`](https://github.com/jdrydn/dynazord/tree/master) (master) | [Documentation](https://github.com/jdrydn/dynazord/tree/master/docs) |
