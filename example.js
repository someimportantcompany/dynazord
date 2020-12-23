require('dotenv/config');
const dynamodel = require('../dynamodel');
const logger = require('../lib/logger');
const { STRING, DATE } = dynamodel.fieldTypes;

const users = dynamodel.createModel({
  tableName: 'dynamodel-test-users',
  keySchema: {
    hash: 'email',
  },
  properties: {
    email: {
      type: STRING,
      required: true,
    },
    name: {
      type: STRING,
      required: true,
    },
    avatar: {
      type: STRING,
    },
    lastSignedIn: {
      type: DATE,
    },
  },
  options: {
    createdAtTimestamp: true,
    updatedAtTimestamp: true,
  },
});

if (!module.parent) {
  /* eslint-disable no-console */
  (async () => {
    try {
      logger.info({ users });

      const user = await users.create({
        email: 'james@jdrydn.com',
      });

      logger.info(user);
    } catch (err) {
      logger.error(err);
    }
  })();
}
