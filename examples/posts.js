const dynazord = require('dynazord');
const { v4: uuid } = require('uuid');

const createTable = {
  TableName: 'dynazord-example-posts',
  BillingMode: 'PAY_PER_REQUEST',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' },
  ],
  // GlobalSecondaryIndexes: [
  //   {
  //     IndexName: 'blogPostsByTime',
  //     KeySchema: [
  //       { AttributeName: 'blog', KeyType: 'HASH' },
  //       { AttributeName: 'createdAt', KeyType: 'RANGE' },
  //     ],
  //   },
  // ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'blogID', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'S' },
  ],
};

const posts = dynazord.createModel({
  tableName: 'dynazord-example-posts',
  keySchema: {
    hash: 'id',
  },
  // secondaryIndexes: {
  //   blogPostsByTime: {
  //     hash: 'blog',
  //     range: 'publishedAt',
  //   },
  // },
  properties: {
    id: {
      type: String,
      required: true,
      default: () => uuid(),
    },
    blogID: {
      type: String,
      required: true,
      enum: [ 'jdrydn.com', 'theverge.com' ],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    publishedAt: {
      type: Date,
      // Optionally set the underlying format to a Number to assist with sorting
      format: Number,
    },
    status: {
      type: String,
      enum: [ 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'DELETED' ],
      required: true,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = {
  posts,
  createTable,
};
