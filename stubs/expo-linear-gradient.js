// Stub for expo-linear-gradient — used by Metro extraNodeModules
// when the real native module is not linked.
'use strict';

var React = require('react');
var RN = require('react-native');

var LinearGradient = function(props) {
  return React.createElement(RN.View, { style: props.style }, props.children);
};
LinearGradient.displayName = 'LinearGradient';

module.exports = {
  __esModule: true,
  LinearGradient: LinearGradient,
  default: LinearGradient,
};
