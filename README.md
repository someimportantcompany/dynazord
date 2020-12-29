<div align="center">
  <h1>dynazord</h1>
  <a href="https://npm.im/dynazord"><img alt="NPM" src="https://badge.fury.io/js/dynazord.svg"/></a>
  <a href="https://github.com/jdrydn/dynazord/actions?query=branch%3Amaster"><img alt="CI" src="https://github.com/jdrydn/dynazord/workflows/Test/badge.svg?branch=master"/></a>
  <!-- <a href="https://coveralls.io/github/jdrydn/dynazord?branch=master"><img alt="Coverage" src="https://coveralls.io/repos/github/jdrydn/dynazord/badge.svg?branch=master"/></a> -->
  <a href="./docs"><img alt="Docs" src="https://img.shields.io/static/v1?label=Read&message=Documentation&color=blue&logo=read-the-docs"/></a>
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
  email: 'james@jdrydn.com',
  name: 'James D',
  avatar: 'https://github.com/jdrydn.png',
});

console.log(user);
// { email: 'james@jdrydn.com',
//   name: 'James D',
//   avatar: 'https://github.com/jdrydn.png'
//   role: 'USER' }
```

This library is designed to simplify interaction with DynamoDB, offering more traditional CRUD methods instead of learning DynamoDB's [`getItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#getItem-property)/[`putItem`](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#putItem-property) methods. You can also write functions to validate properties on objects.

## Installation

```
npm install --save dynazord
```

## Documentation

- [Documentation](./docs/index.md)
- [Getting Started](./docs/Getting-Started.md)

## Development

| Version | Links |
| ---- | ---- |
| [`v0.0.1`](https://github.com/jdrydn/dynazord/tree/master) (master) | [Documentation](https://github.com/jdrydn/dynazord/tree/master/docs) |

- All major work should be in feature branches, include tests & finish with a PR into `master`.
- To run tests, fire up [`amazon/dynamodb-local`](https://hub.docker.com/r/amazon/dynamodb-local)
  ```
  docker run --name dynamodb --rm -d -p 8000:8000 amazon/dynamodb-local
  ```
  - Take note of [the differences](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Differences).
