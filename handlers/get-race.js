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
      <div style="width: 80%;">
        <div class="ct-chart"></div>
      </div>
      <script>
        var chart = new Chartist.Line('.ct-chart', {

          series: [
            [{x: 1, y: 1}, {x:1.24, y: 1}, {x: 2.6, y:1}, {x:3.9, y: 2}, {x:5.6, y: 2}, {x:6.2, y: 1}],
            [{x: 1, y: 2}, {x:1.54, y: 2}, {x: 2.71, y:2}, {x:3.77, y: 1}, {x:5.23, y: 1}, {x:6.24, y: 2}],
            [{x: 1, y: 3}, {x:1.54, y: 2}, {x: 2.71, y:2}, {x:3.77, y: 1}, {x:5.23, y: 1}, {x:6.24, y: 2}],
          ]
        }, {
          fullWidth: true,
          height: '75px',
          lineSmooth: false,
          onlyInteger: false,
          chartPadding: {
            right: 10
          },
          low: 1,
          axisX: {
            type: Chartist.FixedScaleAxis,
            ticks: [1,2,3,4,5,6,7,8,9],
            onlyInteger: true
          },
          axisY: {
            onlyInteger: true,
            showGrid: true,
            low: 0,
            showLabel: true,
            divisor: 3
          },
          chartPadding: {
            top: 10,
            right: 90,
            bottom: 0,
            left: 50
          },
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
