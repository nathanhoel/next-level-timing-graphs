const chartistPointLabels = require('../lib/chartist-pointlabels');
const chartistRight = require('../lib/chartist-right');

module.exports = `
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

    #title {
      margin-top: 20px;
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
`;
