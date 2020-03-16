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
    <head>
      <link rel="stylesheet" href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
      <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
    </head>
    <body>
      <div class="ct-chart ct-perfect-fourth"></div>
      ${JSON.stringify(results)}

      <script>
        var chart = new Chartist.Line('.ct-chart', {
          labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          series: [
            [5, 5, 10, 8, 7, 5, 4, null, null, null, 10, 10, 7, 8, 6, 9],
            [10, 15, null, 12, null, 10, 12, 15, null, null, 12, null, 14, null, null, null],
            [null, null, null, null, 3, 4, 1, 3, 4,  6,  7,  9, 5, null, null, null],
            [{x:3, y: 3},{x: 4, y: 3}, {x: 5, y: undefined}, {x: 6, y: 4}, {x: 7, y: null}, {x: 8, y: 4}, {x: 9, y: 4}]
          ]
        }, {
          fullWidth: true,
          chartPadding: {
            right: 10
          },
          lineSmooth: Chartist.Interpolation.cardinal({
            fillHoles: true,
          }),
          low: 0
        });
      </script>
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
