# Getting Started

To kick things off, install _dynazord_ as you would any other dependency:

```sh
$ npm install --save dynazord
# or
$ yarn add dynazord
```

## Import

Import or require _dynazord_ into your project:

```js
const dynazord = require('dynazord');
// or
import dynazord from 'dynazord';
```

## Configure

_dynazord_ interacts with the AWS-SDK, by default it creates a new `AWS.DynamoDB` instance when you create a model. Check out AWS's "[Setting credentials in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html)" documentation for more details. Since underneath DynamoDB is a handful of HTTPS calls, you can theoretically create as many instances as you like.

Alternatively you can pass a preconfigured `dynamodb` instance to save on memory:

```js
const AWS = require('aws-sdk');
const dynazord = require('dynazord');

// Perhaps the table for this model exists in another AWS region:
const dynamodb = new AWS.DynamoDB({ region: 'eu-west-2' });
const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { /* * */ },
  properties: { /* * */ },
  dynamodb,
});

// Or perhaps you want to test your model against a local DynamoDB instance (such as dynamodb-local or localstack):
const dynamodb = new AWS.DynamoDB({ endpoint: 'http://localhost:8000' });
const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { /* * */ },
  properties: { /* * */ },
  dynamodb,
});
```

Or you can set a `dynamodb` instance for **all future** `createModel` calls:

```js
const dynamodb = new AWS.DynamoDB({ endpoint: 'http://localhost:8000' });
dynazord.setDynamoDB(dynamodb);

const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { /* * */ },
  properties: { /* * */ },
  // And this will use the dynamodb instance specified
});

// This is mostly useful for tests, so you can point your models to your local DynamoDB instance
// without littering your codebase with if-tests-then statements!
```

---

Next, [start writing models](./Writing-Models.md).
