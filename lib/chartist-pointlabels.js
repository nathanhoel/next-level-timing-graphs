module.exports = `function InitChartistPointLabels(Chartist) {
  var defaultOptions = {
    labelClass: 'ct-label',
    labelOffset: {
      x: 0,
      y: 2.8
    },
    textAnchor: 'middle',
    labelInterpolationFnc: Chartist.noop
  };

  Chartist.plugins = Chartist.plugins || {};
  Chartist.plugins.ctPointLabels = function (options) {

    options = Chartist.extend({}, defaultOptions, options);

    return function ctPointLabels(chart) {
      if (chart instanceof Chartist.Line) {
        chart.on('draw', function (data) {

          if (data.type === 'point') {
            data.group.elem('text', {
              x: data.x + options.labelOffset.x,
              y: data.y + options.labelOffset.y,
              style: 'line-height:1; font-size:0.50rem; fill:white; pointer-events: none; text-anchor:' + options.textAnchor
            }, options.labelClass).text(options.labelInterpolationFnc(data.meta));
          }
        });
      }
    };
  };
}
`;
