// Stub for expo-sharing — used by Metro extraNodeModules
// when the real native module is not linked.
'use strict';

var shareAsync = function() { return Promise.resolve(); };
var isAvailableAsync = function() { return Promise.resolve(false); };

module.exports = {
  __esModule: true,
  shareAsync: shareAsync,
  isAvailableAsync: isAvailableAsync,
};
