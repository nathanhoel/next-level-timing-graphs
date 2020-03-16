const AWS = require('aws-sdk');
const chartistPointLabels = require('../lib/chartist-pointlabels');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = `${process.env.STAGE}-nlt-results`;

module.exports.handle = async function (event, context, callback) {
  const race = {
    id: event.pathParameters.id,
    length: 180000,
  };

  const result = await dynamoDb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'race = :hkey',
    ExpressionAttributeValues: {
      ':hkey': race.id,
    }
  }).promise();
  const allResults = result.Items;

  const bestResults = _getDriverBestResults(allResults);
  _accumalteLaps(bestResults);
  _rankLaps(bestResults);

  const maxLaps = Math.max.apply(Math, bestResults.map(result => result.laps.length));

  const html = `
  <html>
    <head>
    <link rel="stylesheet" href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/chartist-plugin-tooltips@0.0.17/dist/chartist-plugin-tooltip.min.css">
      <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
      <script src="//cdn.jsdelivr.net/npm/chartist-plugin-tooltips@0.0.17/dist/chartist-plugin-tooltip.min.js"></script>
      <script>
        ${chartistPointLabels}
        InitChartistPointLabels(Chartist);
      </script>
    </head>
    <body>
      <div style="margin: 40px; width: 90%; overflow-x: auto;">
        <div class="ct-chart" style="margin-left: -20;"></div>
      </div>
      <script>
        var chart = new Chartist.Line('.ct-chart', {
          series: ${JSON.stringify(_series(bestResults))}
        }, {
          width: '${50 * maxLaps}px',
          height: '${25 * bestResults.length}px',
          lineSmooth: false,
          onlyInteger: false,
          low: 0,
          chartPadding: {
            right: 10
          },
          axisX: {
            type: Chartist.FixedScaleAxis,
            ticks: ${JSON.stringify(_ticks(race))},
            labelInterpolationFnc: function(value) {
              const minutes = Math.floor(value / 60000);
              const minutesFormat = minutes.toString().padStart(2, '0');
              if (value / 60000 > minutes) {
                return  minutesFormat + ':30';
              }

              return minutesFormat + ':00';
            }
          },
          axisY: {
            onlyInteger: true,
            showGrid: true,
            showLabel: true,
            divisor: 3
          },
          chartPadding: {
            top: 10,
            right: 90,
            bottom: 0,
            left: 50
          },
          plugins: [
            Chartist.plugins.ctPointLabels({
              textAnchor: 'middle',
              labelInterpolationFnc: (value) => {
                return (value == 0) ? "" : value;
              }
            }),
            Chartist.plugins.tooltip({
              tooltipFnc: x => {
                const minutes = Math.floor(x / 60000).toString().padStart(2, '0');
                const seconds = Math.floor((x % 60000) / 1000).toString().padStart(2, '0');
                const ms = (x % 1000).toString();
                return minutes + ':' + seconds + '.' + ms;
              },
              class: 'chartist-everlaps-tooltip',
              anchorToPoint: false,
              appendToBody: true,
            })
          ],
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
  const maxLaps = Math.max.apply(Math, results.map(result => result.laps.length));
  for (const result of results) {
    result.rankedLaps = [];
  }

  for (let lapNum = 0; lapNum < maxLaps; lapNum++) {
    const thisLapForAllDrivers = [];
    for (const result of results) {
      const time = result.accumaltedLaps[lapNum];
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

    // add a fake 0th lap
    if (lapNum === 0) {
      for (const result of results) {
        result.rankedLaps.unshift({ time: 0, position: result.rankedLaps[0].position });
      }
    }
  }
}

function _series(results) {
  const numDrivers = results.length;
  const series = [];
  for (const result of results) {
    const set = result.rankedLaps.map(lap => ({ x: lap.time, y: numDrivers - lap.position + 1 }));
    series.push(set);
  }

  return series;
}

function _ticks(race) {
  const ticks = [];
  for (let ms = 0; ms <= race.length + 30000; ms += 30000) {
    ticks.push(ms);
  }

  return ticks;
}
