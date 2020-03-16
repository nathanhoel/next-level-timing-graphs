module.exports = `function InitChartistRight(Chartist) {
  var axisDefaults = {
    axisClass: 'ct-axis-title',
    offset: {
      x: 0,
      y: 0
    },
    textAnchor: 'middle',
    flipText: false
  };

  var defaultOptions = {
    axisY: Chartist.extend({}, axisDefaults)
  };

  //this will stop the title text being slightly cut off at the bottom.
  //TODO - implement a cleaner fix.
  defaultOptions.axisY.offset.y = -1;

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.ctAxisRight = function (options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function ctAxisRight(chart) {

      chart.on('created', function (data) {
        if (!data.axisY) {
          throw new Error('ctAxisTitle plugin can only be used on charts that have at least one axis');
        }

        //console.log(data);

        //position axis Y title
        if (data.axisY) {

          let space = data.axisY.axisLength / data.axisY.ticks.length;
          let xPos = data.axisY.chartRect.x2 + 10; //data.options.chartPadding.right + data.axisX.axisLength; // options.axisY.offset.x + 45;
          let yPos = data.axisY.chartRect.y2 + space * 1.20; // data.options.chartPadding.top + /*data.options.axisX.offset; +*/ space * 1.20;

          for (let i = 0; i < data.axisY.ticks.length - 1; ++i) {
            let title = new Chartist.Svg("text");
            let driver = options.axisY.rightDrivers[i];
            title.addClass(options.axisY.axisClass);
            title.text(driver);
            title.attr({
              x: xPos,
              y: yPos + space * i,
              style: "line-height: 1;font-size: 1rem;text-anchor: start;"
            });

            data.svg.append(title, true);
          }

          xPos = data.axisY.chartRect.x1 - 10;

          for (let i = 0; i < data.axisY.ticks.length - 1; ++i) {
            let title = new Chartist.Svg("text");
            let driver = options.axisY.leftDrivers[i];
            title.addClass(options.axisY.axisClass);
            title.text(driver);

            title.attr({
              x: xPos,
              y: yPos + space * i,
              style: "line-height: 1;font-size: 1rem;text-anchor: end;",
            });

            data.svg.append(title, true);
          }
        }
      });
    };
  };
}`;
