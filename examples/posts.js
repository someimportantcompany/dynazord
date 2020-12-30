const dynazord = require('dynazord');
const { v4: uuid } = require('uuid');

const posts = dynazord.createModel({
  tableName: 'dynazord-example-posts',
  keySchema: {
    hash: 'id',
  },
  secondaryIndexes: {
    blogPostsByTime: {
      hash: 'blog',
      range: 'publishedAt',
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

module.exports = posts;
