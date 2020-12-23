/* eslint-disable no-console */
const AWS = require('aws-sdk');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const yaml = require('js-yaml');

(async () => {
  const dynamodb = new AWS.DynamoDB({
    endpoint: process.env.AWS_DYNAMODB_ENDPOINT || undefined,
  });

  const tables = glob.sync('../examples/*.yml', { cwd: __dirname }).reduce((result, filename) => {
    const contents = fs.readFileSync(path.resolve(__dirname, filename), 'utf8')
      .replace(/\$\{self:service\}-\$\{self:provider\.stage\}/, 'dev')
      .replace(/\$\{self:provider\.stage\}/, 'local');
    const { Resources: res } = yaml.safeLoad(contents, { filename });
    return result.concat(Object.keys(res).filter(k => res[k].Type === 'AWS::DynamoDB::Table').map(k => res[k]));
  }, []);

  await tables.reduce((p, params) => p.then(async () => {
    const { Properties: { TableName, TimeToLiveSpecification, ...Properties } } = params;
    try {
      console.log('Creating', TableName, Properties);
      await dynamodb.createTable({ TableName, ...Properties }).promise();

      if (TimeToLiveSpecification) {
        console.log('Adding TTL', TableName, TimeToLiveSpecification);
        await dynamodb.updateTimeToLive({ TableName, TimeToLiveSpecification }).promise();
      }
    } catch (err) {
      err.message = `[${TableName}]: ${err.message}`;
      throw err;
    }
  }), Promise.resolve());

  console.log('\nFinished!');
})();
