// Stub for react-native-view-shot — used by Metro extraNodeModules
// when the real native module is not linked. ZERO re-exports of the real package.
'use strict';

var React = require('react');
var RN = require('react-native');

module.exports = {
  default: RN.View,
  ViewShot: RN.View,
  captureRef: async function() { return ''; },
  captureScreen: async function() { return ''; },
};
