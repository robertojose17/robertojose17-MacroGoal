'use strict';
// Stub for react-native-chart-kit — used by Metro extraNodeModules when the
// real package (which depends on react-native-svg) is not safe to bundle.
var React = require('react');
var RN = require('react-native');
var View = RN.View;

function makeChart(name) {
  function Chart() { return React.createElement(View, null); }
  Chart.displayName = name;
  return Chart;
}

module.exports = {
  default: makeChart('LineChart'),
  LineChart: makeChart('LineChart'),
  BarChart: makeChart('BarChart'),
  StackedBarChart: makeChart('StackedBarChart'),
  PieChart: makeChart('PieChart'),
  ProgressChart: makeChart('ProgressChart'),
  ContributionGraph: makeChart('ContributionGraph'),
  AbstractChart: makeChart('AbstractChart'),
};
