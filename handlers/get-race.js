const AWS = require('aws-sdk');
const chartistPointLabels = require('../lib/chartist-pointlabels');
const chartistRight = require('../lib/chartist-right');
const { msToTimeFormat } = require('../lib/time');

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

  const maxLaps = Math.max.apply(Math, bestResults.map(result => result.laps.length));
  const fastestLap = Math.min.apply(Math, bestResults.map(result => result.fastestLap));
  const overallFastestLap = Math.min.apply(Math, bestResults.map(result => result.overallFastestLap));

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
          margin: 50px;
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

        .stat-break {
          border-right: solid 1px #DDDDDD;
        }

        .position-outer {
          position: relative;
          float: left;
          margin-right: 15px;
        }

        .position-border-box {
          position: absolute;
          width: 2em;
          height: 100%;
          border: solid 1px #666;
          border-radius: 4px;
          transform: skewX(-30deg);
        }

        .position-text {
          margin: 0 0.7em;
          font-weight: 400;
        }

        .driver-name {
          float: left;
        }

        .lap-table-position {
          float: left;
          margin-right: 10px;
          padding: 0 8px;
          border: solid 1px #BBB;
          background-color: #DDD;
          border-radius: 4px;
          color: #666;
        }

        .lap-table-time {
          float: left;
        }

        .personal-fastest-lap {
          color: #874ff4;
          font-weight: 700;
        }

        .fastest-lap {
          color: #5a389e;
          font-weight: 700;
        }

        text.ct-label {
          font-weight:1000;
        }
      </style>
    </head>
    <body>
      <div>
        <img src="https://hoel-file-dump.s3.amazonaws.com/BinSentry-Raceway.png" style="margin-left: auto; margin-right: auto; display: block; width: 400px;">
      </div>
      <div style="margin-top: 50px;">
        <table class="table table-striped">
          <thead>
            <tr>
              <th scope="col" style="width: 50%">Driver</th>
              <th scope="col" style="width: 20%">Lap / Time</th>
              <th scope="col" style="width: 10%">Fastest</th>
              <th scope="col" style="width: 10%">Average</th>
              <th scope="col" style="width: 10%">Overall Fastest</th>
            </tr>
          </thead>
          <tbody>
            ${bestResults.map((result, index) => _resultRow(result, index + 1, fastestLap, overallFastestLap)).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 50px; overflow-x: auto;">
        <div class="ct-chart" style=""></div>
      </div>

      <div style="margin-top: 50px; overflow-x: auto;">
        ${_lapTable(bestResults, fastestLap)}
      </div>

      <script>
        var chart = new Chartist.Line('.ct-chart', {
          series: ${JSON.stringify(_series(bestResults))}
        }, {
          width: '${Math.max(1500, 60 * maxLaps)}px',
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
            offset: 60,
          },
          chartPadding: {
            top: 10,
            right: 120,
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
                const seconds = Math.floor(x / 1000).toString().padStart(2, '0');
                const ms = (x % 1000).toString().padStart(3, '0');
                return seconds + '.' + ms;
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
                rightDrivers: ${JSON.stringify(bestResults.map(result => result.name))},
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
    if (i === 0 || results[i].name !== results[i - 1].name) {
      const bestResult = results[i];
      bestResult.overallFastestLap = bestResult.fastestLap;
      bestResults.push(results[i]);
    }

    const currentBestResult = bestResults[bestResults.length - 1];
    if (results[i].fastestLap < currentBestResult.overallFastestLap) {
      currentBestResult.overallFastestLap = results[i].fastestLap;
    }
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
  results.sort((a, b) => {
    if (a.totalLaps !== b.totalLaps) {
      return b.totalLaps - a.totalLaps;
    }

    return a.rankedLaps[a.rankedLaps.length - 1].position - b.rankedLaps[b.rankedLaps.length - 1].position
  });
}

function _startDrivers(results) {
  const startDrivers = [];
  for (const result of results) {
    startDrivers[result.rankedLaps[0].position - 1] = result.name;
  }
  return startDrivers;
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


function _resultRow(result, place, fastestLap, overallFastestLap) {
  return `
    <tr>
      <th scope="row">
        <div class="position-outer">
          <div class="position-border-box"></div>
          <span class="position-text">${place}</span>
        </div>
        <div class="driver-name">${result.name}</div>
      </th>
      <td class="stat-break">${result.totalLaps}L ${msToTimeFormat(result.totalTime, true)}</td >
      <td class="${fastestLap === result.fastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.fastestLap)}</td>
      <td class="stat-break">${msToTimeFormat(Math.floor((result.totalTime - (result.startTime || 0)) / result.totalLaps))}</td>
      <td class="${overallFastestLap === result.overallFastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(result.overallFastestLap)}</td>
    </tr>
  `;
}

function _lapTable(results, fastestLap) {
  const headers = results.map(result => `<th scope="col">${result.name}</th>`);
  const rows = results[0].rankedLaps
    .map((lap, index) => ({ lapNum: lap.lapNum, index }))
    .filter(lap => lap.lapNum !== '')
    .map(lap => _lapRow(results, lap, fastestLap));

  return `
    <table class="table table-striped">
      <thead>
        <tr>
          <th scope="col">Lap</th>
          ${headers.join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function _lapRow(results, { lapNum, index }, fastestLap) {
  const lapColumns = results.map(result => {
    const currentLap = result.rankedLaps[index];

    if (currentLap) {
      return `
        <td>
          <div class="lap-table-position">${currentLap.position}</div>
          <div class="lap-table-time ${currentLap.lapTime === result.fastestLap ? 'personal-fastest-lap' : ''} ${currentLap.lapTime === fastestLap ? 'fastest-lap' : ''}">${msToTimeFormat(currentLap.lapTime)}</div>
        </td>
      `;
    }

    return '<td></td>';
  });
  return `
    <tr>
      <th scope="row">${lapNum}</th>
      ${lapColumns.join('')}
    </tr>
  `;
}
