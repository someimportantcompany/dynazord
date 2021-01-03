const _kebabCase = require('lodash/kebabCase');
const assert = require('http-assert');
const dynazord = require('dynazord');
const isUUID = require('validator/lib/isUUID');
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
  //       { AttributeName: 'publishedAt', KeyType: 'RANGE' },
  //     ],
  //   },
  // ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    // { AttributeName: 'blogID', AttributeType: 'S' },
    // { AttributeName: 'publishedAt', AttributeType: 'N' },
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
      validate: {
        notNull: true,
        notEmpty: true,
        isUUID: value => isUUID(value, 4),
      },
    },
    blogID: {
      type: String,
      required: true,
      enum: [ 'jdrydn.com', 'theverge.com' ],
    },
    title: {
      type: String,
      required: true,
      validate: {
        notNull: true,
        notEmpty: true,
      },
    },
    description: {
      type: String,
    },
    slug: {
      type: String,
      required: true,
      default: () => 'EXAMPLE-SLUG',
      validate: {
        notNull: true,
        notEmpty: true,
      },
    },
    content: {
      type: Array,
      required: true,
      properties: {
        type: Object,
        required: true,
        properties: {
          html: {
            type: String,
            validate: {
              notEmpty: true,
            },
          },
          image: {
            type: Buffer,
            validate: {
              notEmpty: true,
            },
          },
          embed: {
            type: Object,
            // Can contain infinite properties
            validate: {
              notEmpty: true,
            },
          },
        },
        validate: {
          notEmpty: true,
        },
      },
      validate: {
        notEmpty: true,
      },
    },
    publishedAt: {
      type: Date,
      // Optionally set the underlying format to a Number to assist with sorting
      format: Number,
      validate: {
        isBefore: '2099-12-31T23:59:59.00Z',
        isAfter: '2000-01-01T00:00:00.00Z',
      }
    },
    status: {
      type: String,
      enum: [ 'PUBLISHED', 'DRAFT', 'SCHEDULED', 'DELETED' ],
      required: true,
    },
  },
  hooks: {
    beforeValidate(post, opts) {
      if (post.title && (!post.slug || post.slug === 'EXAMPLE-SLUG')) {
        post.slug = _kebabCase(post.title);
      }
    },
    beforeBulkCreate(entries) {
      entries.forEach((post, i) => {
        if (post.title && (!post.slug || post.slug === 'EXAMPLE-SLUG')) {
          entries[i].slug = _kebabCase(post.title);
        }
      });
    },
    afterValidate: {
      async isSlugUnique(post, opts) {
        const { id, slug } = post;
        if (slug) {
          // Lookup if this slug has been used before
          const existing = await this.find({ slug });
          // And if it exists on another post, throw an error
          assert(!existing || existing.id !== id, 400, new Error('Expected slug to be unique'), { slug });
        }
      },
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = posts;
