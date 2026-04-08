'use strict';
const React = require('react');
const { View, ScrollView, FlatList, TouchableOpacity } = require('react-native');
function GestureHandlerRootView(props) {
  return React.createElement(View, { style: props.style }, props.children);
}
module.exports = {
  default: {},
  GestureHandlerRootView: GestureHandlerRootView,
  GestureDetector: function(props) { return props.children; },
  Gesture: { Pan: function() { return {}; }, Tap: function() { return {}; }, Simultaneous: function() { return {}; }, Race: function() { return {}; } },
  PanGestureHandler: function(props) { return props.children; },
  TapGestureHandler: function(props) { return props.children; },
  ScrollView: ScrollView,
  FlatList: FlatList,
  TouchableOpacity: TouchableOpacity,
  State: {},
  Directions: {},
};
