const assert = require('http-assert');
const dynazord = require('dynazord');
const isHash = require('validator/lib/isHash');
const { customAlphabet } = require('nanoid');

// @link https://zelark.github.io/nano-id-cc/
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 15);
// @NOTE This alphabet, this length, at 1000 IDs per second will need ~125 years for 1% probability of collision

const VALID_EXTS = {
  // Common image formats
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.png': 'image/png',

  // Common document formats
  '.pdf': 'application/pdf',
};

const posts = dynazord.createModel({
  tableName: 'dynazord-example-posts',
  keySchema: {
    hash: 'email',
  },
  properties: {
    id: {
      type: String,
      required: true,
      default: () => nanoid(),
    },
    filename: {
      type: String,
      required: true,
      validate: {
        notNull: true,
        hasValidExtension(value) {
          assert(typeof value === 'string' && value.includes('.'), new Error('Expected a filename with an extension'));
          const ext = value.split('.').pop();
          assert(Object.keys(VALID_EXTS).incldues(`.${ext}`), new Error('Expected filename to have a valid extension'), { ext });
        },
      },
    },
    filemime: {
      type: String,
      required: true,
      validate: {
        notNull: true,
        hasValidMimetype(value) {
          assert(typeof value === 'string' && value.includes('/'), new Error('Expected a filemime'));
          assert(Object.values(VALID_EXTS).incldues(value), new Error('Expected filename to have a valid extension'), { value });
        },
      },
    },
    filesize: {
      type: Number,
      required: true,
    },
    filesha1: {
      type: String,
      validate: {
        notNull: true,
        isValidHash(value) {
          assert(isHash(value, 'sha1'), new Error('Expected value to be a SHA1 string'));
        },
      }
    },
    content: {
      type: Buffer,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

module.exports = posts;
