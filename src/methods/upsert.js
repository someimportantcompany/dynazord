const { assert, isPlainObject, marshall, unmarshall } = require('../utils');
const { assertRequiredCreateProps, appendCreateDefaultProps } = require('../helpers/create');
const { formatReadData, formatWriteData, validateData } = require('../helpers/data');
const { stringifyUpsertStatement } = require('../helpers/upsert');

module.exports = async function upsertDocument(upsert) {
  const { client, tableName, keySchema, properties, log } = this;
  assert(client && typeof client.updateItem === 'function', new TypeError('Expected client to be a DynamoDB client'));
  assert(typeof tableName === 'string', new TypeError('Invalid tableName to be a string'));
  assert(isPlainObject(keySchema), new TypeError('Expected keySchema to be a plain object'));
  assert(isPlainObject(properties), new TypeError('Expected properties to be a plain object'));

  assert(isPlainObject(upsert), new TypeError('Expected update to be a plain object'));

  const { hash, range } = keySchema;
  const { [hash]: hashProp, [range]: rangeProp } = properties;
  assert(hashProp.hasOwnProperty('default') || upsert.hasOwnProperty(hash),
    new Error(`Missing ${hash} hash property from argument`));
  assert(!range || rangeProp.hasOwnProperty('default') || upsert.hasOwnProperty(range),
    new Error(`Missing ${range} range property from argument`));

  const specifiedUpsertKeys = Object.keys(upsert);

  await assertRequiredCreateProps.call(this, properties, upsert);
  await appendCreateDefaultProps.call(this, properties, upsert);
  await validateData.call(this, properties, upsert);
  await formatWriteData.call(this, properties, upsert, { fieldHook: 'onUpsert' });

  const { [hash]: hashValue, [range || 'null']: rangeValue, ...upsertValues } = upsert;
  const where = {
    [hash]: hashValue,
    ...(range ? { [range]: rangeValue } : {}),
  };

  const { expression, names, values } = stringifyUpsertStatement.call(this, upsertValues, specifiedUpsertKeys) || {};
  assert(typeof expression === 'string', new TypeError('Expected update expression to be a string'));
  assert(isPlainObject(names), new TypeError('Expected update names to be a plain object'));
  assert(isPlainObject(values), new TypeError('Expected update values to be a plain object'));

  const params = {
    TableName: tableName,
    Key: marshall(where),
    UpdateExpression: expression,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: marshall(values),
    ReturnValues: 'ALL_NEW', // Return all the attributes
  };

  log.debug({ updateItem: params });
  const result = await client.updateItem(params).promise();
  log.debug({ updateItem: result });

  const item = result && isPlainObject(result.Attributes) ? unmarshall(result.Attributes) : null;

  assert(item, new Error('Document not found'), {
    code: 'DOCUMENT_NOT_FOUND',
    key: JSON.stringify(where),
  });

  await formatReadData(properties, item);
  return item;
};
