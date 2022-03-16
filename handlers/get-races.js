const AWS = require('aws-sdk');
const headTag = require('../common/head-tag');
const header = require('../common/header');
const getRacesTable = require('../common/races-table');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-races`;

module.exports.handle = async function (event, context, callback) {
  const races = (await dynamoDb.query({
    TableName: TABLE_NAME,
    IndexName: 'typeIndex',
    KeyConditionExpression: 'type = :hkey',
    ExpressionAttributeValues: {
      ':hkey': 'time-trial',
    }
  }).promise()).Items;

  const html = `
  <html>
    ${headTag}
    <body>
      ${header}

      <div id="title">
        <h5>Time Trials</h5>
      </div>

      ${getRacesTable(races)}

    </body>
  </html>`;

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: html,
  };

  callback(null, response);
};
