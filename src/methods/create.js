const { assert, isPlainObject, marshall } = require('../utils');

module.exports = async function createDocument(create) {
  const { client, log, tableName: TableName, keySchema, properties, options } = this;
  assert(client && typeof client.putItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof TableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(options), new TypeError('Expected options to be a plain object'));
  assert(isPlainObject(create), new TypeError('Expected argument to be a plain object'));

  const { hash, range } = keySchema;
  assert(create[hash], new Error(`Missing ${hash} property from argument`));
  assert(!range || create[range], new Error(`Missing ${range} property from argument`));

  const missingProps = Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.required === true && !property.hasOwnProperty('default') && !create.hasOwnProperty(key);
  });
  assert(missingProps.length === 0, new Error('Expected all required fields to be set'), {
    code: 'DYNAMODEL_MISSING_REQUIRED_FIELDS',
    fields: missingProps,
  });

  const additionalProps = Object.keys(create).filter(key => !properties.hasOwnProperty(key));
  assert(additionalProps.length === 0, new Error('Unexpected properties on argument'), {
    code: 'DYNAMODEL_FOUND_ADDITIONAL_FIELDS',
    fields: additionalProps,
  });

  const fillDefaultProps = Object.keys(properties).filter(key => {
    const { [key]: property } = properties;
    return property.hasOwnProperty('default') && !create.hasOwnProperty(key);
  });
  await Promise.all(fillDefaultProps.map(async key => {
    const { [key]: { default: defaultValue } } = properties;
    create[key] = typeof defaultValue === 'function' ? (await defaultValue()) : defaultValue;
  }));

  if (options.createdAtTimestamp === true) {
    create.createdAt = new Date();
  }
  if (options.updatedAtTimestamp === true) {
    create.updatedAt = new Date();
  }

  const params = {
    // Specify the name & item to be created
    TableName,
    Item: marshall(create),
    // Specify a condition to ensure this doesn't write an item that already exists
    ConditionExpression: hash && range
      ? `attribute_not_exists(${hash}) && attribute_not_exists(${range})`
      : `attribute_not_exists(${hash})`,
    // Reject all return values
    ReturnValues: 'NONE',
  };

  log.debug({ putItem: params });

  await client.putItem(params).promise();

  return create;
};
