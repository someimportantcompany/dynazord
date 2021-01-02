const _kebabCase = require('lodash/kebabCase');
const assert = require('http-assert');
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
    slug: {
      type: String,
      required: true,
      default: () => null,
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
  hooks: {
    beforeValidateCreate(post, opts) {
      if (post.title && !post.slug) {
        post.slug = _kebabCase(post.title);
      }
    },
    async afterValidate(post, opts) {
      const { id, slug } = post;
      if (slug) {
        // Lookup if this slug has been used before
        const existing = await this.find({ slug });
        // And if it exists on another post, throw an error
        assert(!existing || existing.id !== id, 400, new Error('Expected slug to be unique'), { slug });
      }
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = posts;
