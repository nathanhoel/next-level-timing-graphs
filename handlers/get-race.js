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
  const allResults = result.Items;

  const bestResults = _getDriverBestResults(allResults);
  _accumalteLaps(bestResults);
  _rankLaps(bestResults);

  const html = `
  <html>
    <head>
      <link rel="stylesheet" href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
      <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
    </head>
    <body>
      ${JSON.stringify(bestResults)}
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

function _getDriverBestResults(results) {
  const bestResults = [];
  for (let i = 0; i < results.length; i++) {
    (i === 0 || results[i].name !== results[i - 1].name) && bestResults.push(results[i]);
  }
  return bestResults;
}

function _accumalteLaps(results) {
  for (const result of results) {
    const accumaltedLaps = [];
    for (let i = 0; i < result.laps.length; i++) {
      accumaltedLaps[i] = (accumaltedLaps[i - 1] || 0) + result.laps[i];
    }
    result.accumaltedLaps = accumaltedLaps;
  }
}

function _rankLaps(results) {
  const maxLaps = Math.max.apply(Math, array.map(result => result.laps.length));
  for (const result of results) {
    result.rankedLaps = [];
  }

  for (let i = 0; i < maxLaps; i++) {
    const thisLapForAllDrivers = [];
    for (const result of results) {
      const time = result.accumaltedLaps[i];
      if (!time) {
        continue;
      }

      const rankedLap = { time };
      result.rankedLaps.push(rankedLap);
      thisLapForAllDrivers.push(rankedLap);
    }

    thisLapForAllDrivers.sort((a, b) => a.time - b.time);
    for (let i = 0; i < thisLapForAllDrivers.length; i++) {
      thisLapForAllDrivers[i].position = i + 1;
    }
  }
}
