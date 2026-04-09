'use strict';
/* eslint-disable react/prop-types */
// Stub for expo-glass-effect — native module not linked in Expo Go.
var React = require('react');
var RN = require('react-native');

function GlassView(props) {
  return React.createElement(RN.View, props, props.children);
}

module.exports = {
  default: GlassView,
  GlassView: GlassView,
};
