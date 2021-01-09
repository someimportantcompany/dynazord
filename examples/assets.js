const assert = require('http-assert');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const dynazord = require('dynazord');
const formatDate = require('date-fns/format');
const isHash = require('validator/lib/isHash');
const { customAlphabet } = require('nanoid');
const { v4: uuid } = require('uuid');

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

const createTable = {
  TableName: 'dynazord-example-assets',
  BillingMode: 'PAY_PER_REQUEST',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
  ],
};

const assets = dynazord.createModel({
  tableName: 'dynazord-example-assets',
  keySchema: 'id',
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
        hasValidExtension(filename) {
          assert(typeof filename === 'string' && filename.includes('.'), new Error('Expected a filename with an extension'));
          const ext = filename.split('.').pop();
          assert(Object.keys(VALID_EXTS).includes(`.${ext}`), new Error('Expected filename to have a valid extension'), { ext });
        },
      },
    },
    filemime: {
      type: String,
      required: true,
      validate: {
        notNull: true,
        hasValidMimetype(filemime) {
          assert(typeof filemime === 'string' && filemime.includes('/'), new Error('Expected a filemime'));
          assert(Object.values(VALID_EXTS).includes(filemime), new Error('Expected filename to have a valid extension'), { filemime });
        },
      },
    },
    filesize: {
      type: Number,
    },
    filesha1: {
      type: String,
      validate: {
        notNull: true,
        isValidHash(filesha1) {
          assert(isHash(filesha1, 'sha1'), new Error('Expected value to be a SHA1 string'));
        },
      }
    },
    content: {
      type: Buffer,
    },
  },
  hooks: {
    afterValidate(asset, opts) {
      if (asset.content) {
        const sha1 = crypto.createHash('sha1').update(asset.content).digest('hex');
        assert(!asset.filesha1 || asset.filesha1 === sha1, 400, new Error('Invalid sha1 for uploaded content'));
        asset.filesha1 = sha1;
      }
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

assets.getUploadUrl = function getUploadUrl({ filename, filemime }) {
  const s3 = new AWS.S3();

  const params = {
    Bucket: 'dynazord-example-assets',
    Key: `uploads/${formatDate(new Date(), 'yyyy-MM')}/${uuid()}/${filename}`,
    ContentType: filemime,
  };

  const signedUrl = s3.getSignedUrl('putObject', params);
  assert(typeof signedUrl === 'string' && signedUrl.startsWith('https://'),
    new Error('Expected signedUrl to be a HTTPS string'));

  return signedUrl;
};

module.exports = assets;
