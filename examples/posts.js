const dynazord = require('dynazord');
const { v4: uuid } = require('uuid');

const posts = dynazord.createModel({
  tableName: 'dynazord-example-posts',
  keySchema: {
    hash: 'email',
  },
  secondaryIndexes: {
    blogPostsByTime: {
      hash: 'blog',
      range: 'createdAt',
    },
  },
  properties: {
    id: {
      type: String,
      required: true,
      default: () => uuid(),
    },
    blog: {
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
    createdAt: {
      type: Date,
      // Optionally set the underlying format for the automated createdAt property
      format: Number,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = posts;
