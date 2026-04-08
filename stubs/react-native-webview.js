// Stub for react-native-webview — used by Metro extraNodeModules
// when the real native module is not linked. ZERO re-exports of the real package.
'use strict';

var RN = require('react-native');

module.exports = {
  WebView: RN.View,
  default: RN.View,
};
