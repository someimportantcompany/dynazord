# dynazord

<!-- Deliberately named lowercase so GitHub sorts it to the bottom of the directory 💪 -->

Yet another [DynamoDB](https://aws.amazon.com/dynamodb) [NodeJS](https://nodejs.org) [ORM](https://en.wikipedia.org/wiki/Object–relational_mapping), inspired by similar ORMs like [Mongoose](https://mongoosejs.com) & [Sequelize](https://sequelize.org).

## Table Of Contents

- [Getting Started](./Getting-Started.md)
- [Writing Models](./Writing-Models.md)
- [Using Models](./Using-Models.md)
- [Examples](../examples/)

## Alternatives

- [AWS's DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html) is a decent alternative, although it doesn't handle any validation (schema or any kind).
- [dynamoose](https://www.npmjs.com/package/dynamoose) is another modelling tool for Amazon's DynamoDB (inspired by [Mongoose](https://mongoosejs.com)).

## Development

- Documentation is stored in Git, alongside code, therefore as code changes so should the documentation!
- This also means that documentation for older tags/versions is available at all times, and will be linked [from the repo's README](../README.md).
- All major work should be in feature branches, include tests & finish with a PR into `master`.
- To run tests, fire up [`amazon/dynamodb-local`](https://hub.docker.com/r/amazon/dynamodb-local)
  ```
  docker run --rm -d --name dynamodb -p 8000:8000 amazon/dynamodb-local
  ```
  - If you've not read through them, take note of [the differences](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html#DynamoDBLocal.Differences) between the production AWS DynamoDB platform & local Docker container.

---

_Any product names, logos, and brands are property of their respective owners, used for identification purposes only & does not imply endorsement._
