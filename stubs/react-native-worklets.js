'use strict';
// Stub for react-native-worklets AND react-native-worklets-core.
// Both package names are mapped to this file in metro.config.js extraNodeModules.
module.exports = {
  default: {},
  useWorklet: function() {},
  runOnJS: function(fn) { return fn; },
  runOnUI: function(fn) { return fn; },
  makeShareable: function(v) { return v; },
  makeRemote: function(v) { return v; },
  createRunOnJS: function(fn) { return fn; },
  createRunOnUI: function(fn) { return fn; },
  WorkletsModule: {},
};
