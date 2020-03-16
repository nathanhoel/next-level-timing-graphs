const AWS = require('aws-sdk');
const chartistPointLabels = require('../lib/chartist-pointlabels');
const chartistRight = require('../lib/chartist-right');

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
  _sortByPlace(bestResults);

  const hasLapZero = !!bestResults[0].startTime;
  const maxLaps = Math.max.apply(Math, bestResults.map(result => result.laps.length));

  const html = `
  <html>
    <head>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
      <link rel="stylesheet" href="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css">
      <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/chartist-plugin-tooltips@0.0.17/dist/chartist-plugin-tooltip.min.css">
      <script src="//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js"></script>
      <script src="//cdn.jsdelivr.net/npm/chartist-plugin-tooltips@0.0.17/dist/chartist-plugin-tooltip.min.js"></script>
      <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n" crossorigin="anonymous"></script>
      <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js" integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo" crossorigin="anonymous"></script>
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js" integrity="sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6" crossorigin="anonymous"></script>

      <script>
        ${chartistPointLabels}
        InitChartistPointLabels(Chartist);

        ${chartistRight}
        InitChartistRight(Chartist);
      </script>
      <style>
        body {
          font-family: Montserrat,sans-serif;
        }

        .ct-axis-title {
          font-size: 0.7em;
          font-weight: 600;
          fill: #666666;
        }

        .ct-label.ct-horizontal.ct-end {
          margin-left: -20px;
        }

        .ct-label {
          font-size: 0.9em;
        }

        .total-laps {
          border-right: solid 1px #DDDDDD;
        }
      </style>
    </head>
    <body>
      <div style="margin: 40px; width: 90%;">
        <table class="table table-striped">
          <thead>
            <tr>
              <th scope="col" style="width: 5%"></th>
              <th scope="col" style="width: 45%">Driver</th>
              <th scope="col" style="width: 20%">Lap / Time</th>
              <th scope="col" style="width: 15%">Fastest</th>
              <th scope="col" style="width: 15%">Average</th>
            </tr>
          </thead>
          <tbody>
            ${bestResults.map((result, index) => _resultRow(result, index + 1)).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin: 40px; width: 90%; overflow-x: auto;">
        <div class="ct-chart" style=""></div>
      </div>
      <script>
        var chart = new Chartist.Line('.ct-chart', {
          series: ${JSON.stringify(_series(bestResults))}
        }, {
          width: '${65 * maxLaps}px',
          height: '${30 * bestResults.length}px',
          lineSmooth: false,
          onlyInteger: false,
          low: 0,
          chartPadding: {
            right: 10
          },
          axisX: {
            type: Chartist.FixedScaleAxis,
            ticks: ${JSON.stringify(_xTicks(race))},
            labelInterpolationFnc: function(value) {
              const minutes = Math.floor(value / 60000).toString().padStart(2, '0');
              const seconds = Math.floor((value % 60000) / 1000).toString().padStart(2, '0');
              return minutes + ':' + seconds;
            }
          },
          axisY: {
            type: Chartist.FixedScaleAxis,
            ticks: ${JSON.stringify([...Array(bestResults.length + 1).keys()])},
            onlyInteger: true,
            showGrid: true,
            showLabel: false,
            low: 0,
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
              labelInterpolationFnc: (meta) => {
                return meta.lapNum;
              }
            }),
            Chartist.plugins.tooltip({
              tooltipFnc: meta => {
                const x = Chartist.deserialize(meta).lapTime;
                const minutes = Math.floor(x / 60000).toString().padStart(2, '0');
                const seconds = Math.floor((x % 60000) / 1000).toString().padStart(2, '0');
                const ms = (x % 1000).toString().padStart(3, '0');
                return minutes + ':' + seconds + '.' + ms;
              },
              anchorToPoint: false,
              appendToBody: true,
              pointClass: 'ct-slice-pie',
            }),
            Chartist.plugins.ctAxisRight({
              axisY: {
                axisTitle: 'Goals',
                axisClass: 'ct-axis-title',
                offset: {
                  x: 0,
                  y: 0
                },
                textAnchor: 'middle',
                flipTitle: false,
                leftDrivers: ${JSON.stringify(_startDrivers(bestResults))},
                rightDrivers: ${JSON.stringify(_endDrivers(bestResults))},
              }
            }),
          ],
        });

        chart.on('draw', function(data) {
          if(data.type === 'point') {
            var dot = new Chartist.Svg('circle', {
              cx: data.x,
              cy: data.y,
              r: 6.5,
              'ct:meta': Chartist.serialize(data.meta),
            }, 'ct-slice-pie');

            data.element.replace(dot);
          }
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

      const rankedLap = { time, lapTime: result.laps[lapNum], lapNum: !!result.startTime ? lapNum : lapNum + 1 };
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
        result.rankedLaps.unshift({ time: 0, lapTime: 0, lapNum: '', position: result.rankedLaps[0].position });
      }
    }
  }
}

function _sortByPlace(results) {
  results.sort((a, b) => a.rankedLaps[a.rankedLaps.length - 1].position - b.rankedLaps[b.rankedLaps.length - 1].position);
}

function _startDrivers(results) {
  const startDrivers = [];
  for (const result of results) {
    startDrivers[result.rankedLaps[0].position - 1] = result.name;
  }
  return startDrivers;
}

function _endDrivers(results) {
  const endDrivers = [];
  for (const result of results) {
    endDrivers[result.rankedLaps[result.rankedLaps.length - 1].position - 1] = result.name;
  }
  return endDrivers;
}

function _series(results) {
  const numDrivers = results.length;
  const series = [];
  for (const result of results) {
    const set = result.rankedLaps.map((lap, i) => ({ x: lap.time, meta: { lapTime: lap.lapTime || 0, lapNum: lap.lapNum }, y: numDrivers - lap.position + 1 }));
    series.push(set);
  }

  return series;
}

function _xTicks(race) {
  const ticks = [];
  for (let ms = 0; ms <= race.length; ms += 15000) {
    ticks.push(ms);
  }

  return ticks;
}


function _resultRow(result, place) {
  return `
    <tr>
      <td>${place}</td>
      <th scope="row">${result.name}</th>
      <td class="total-laps">${result.totalLaps}L ${_msToTimeFormat(result.totalTime)}</td >
      <td>${_msToTimeFormat(result.fastestLap)}</td>
      <td>${_msToTimeFormat(Math.floor(result.totalTime - (result.startTime || 0) / result.totalLaps))}</td>
    </tr>
  `;
}

function _msToTimeFormat(ms, displayMs = true) {
  const minutesLabel = Math.floor(ms / 60000).toString().padStart(2, '0');
  const secondsLabel = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const msLabel = (ms % 1000).toString().padEnd(3, '0');
  let label = minutesLabel + ':' + secondsLabel;
  if (displayMs) {
    label += '.' + msLabel
  }

  return label;
}
