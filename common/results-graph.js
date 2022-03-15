module.exports = function (race, bestResults, maxLaps) {
  return `
    <div style="margin-top: 50px; overflow-x: auto;">
      <div class="ct-chart" style=""></div>
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
  `;
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

function _startDrivers(results) {
  const startDrivers = [];
  for (const result of results) {
    startDrivers[result.rankedLaps[0].position - 1] = result.name;
  }
  return startDrivers;
}

function _xTicks(race) {
  const ticks = [];
  for (let ms = 0; ms <= race.length; ms += 15000) {
    ticks.push(ms);
  }

  return ticks;
}
