# Getting Started

To kick things off, install _dynazord_ as you would any other:

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

_dynazord_ interacts with the AWS-SDK, by default it creates a new `AWS.DynamoDB` instance when you create a model. Check out AWS's "[Setting credentials in Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html)" documentation for more details.

Alternatively you can pass a preconfigured `dynamodb` instance:

```js
const AWS = require('aws-sdk');
const dynazord = require('dynazord');

// Create a DynamoDB instance in another AWS region:
const dynamodb = new AWS.DynamoDB({ region: 'eu-west-2' });
const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { /* * */ },
  properties: { /* * */ },
  dynamodb,
});

// Or create a DynamoDB instance to a local endpoint (such as dynamodb-local or localstack):
const dynamodb = new AWS.DynamoDB({ endpoint: 'http://localhost:8000' });
const entries = dynazord.createModel({
  tableName: 'dynazord-example-entries',
  keySchema: { /* * */ },
  properties: { /* * */ },
  dynamodb,
});
```

---

Next, [start writing models](./Writing-Models.md).
