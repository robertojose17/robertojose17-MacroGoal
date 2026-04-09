// Stub for expo-blur — used by Metro extraNodeModules
// when the real native module is not linked. ZERO re-exports of the real package.
'use strict';

var React = require('react');
var RN = require('react-native');

var BlurView = function(props) {
  return React.createElement(RN.View, { style: props.style }, props.children);
};
BlurView.displayName = 'BlurView';

var BlurMask = function() { return null; };
BlurMask.displayName = 'BlurMask';

module.exports = {
  __esModule: true,
  BlurView: BlurView,
  BlurMask: BlurMask,
  default: BlurView,
};
