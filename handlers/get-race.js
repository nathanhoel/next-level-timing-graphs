const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-nlt-results`;

module.exports.handle = async function (event, context, callback) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'race = :hkey',
    ExpressionAttributeValues: {
      ':hkey': event.pathParameters.id,
    }
  };

  const result = await dynamoDb.query(params).promise();
  const results = result.Items;

  const html = `
  <html>
    <style>
      h1 { color: #73757d; }
    </style>
    <body>
      ${JSON.parse(results)}
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
