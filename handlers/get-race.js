const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handle = (event, context, callback) => {
  const params = {
    TableName: 'nlt-results',
    KeyConditionExpression: 'name = :hkey and sortKey BEGINS_WITH :rkey',
    ExpressionAttributeValues: {
      ':hkey': 'key',
      ':rkey': 2015
    }
  };

  let dynamicHtml = '<p>Hey Unknown!</p>';
  // check for GET params and use if available
  if (event.queryStringParameters && event.queryStringParameters.name) {
    dynamicHtml = `<p>Hey ${event.queryStringParameters.name}!</p>`;
  }

  const html = `
  <html>
    <style>
      h1 { color: #73757d; }
    </style>
    <body>
      ${results}
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
