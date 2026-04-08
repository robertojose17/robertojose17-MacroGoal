const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub out native-only packages that are not linked in the Expo Go binary
config.resolver.extraNodeModules = {
  'react-native-google-mobile-ads': path.resolve(__dirname, 'stubs/react-native-google-mobile-ads.js'),
  'react-native-purchases': path.resolve(__dirname, 'stubs/react-native-purchases.js'),
  'react-native-view-shot': path.resolve(__dirname, 'stubs/react-native-view-shot.js'),
  'react-native-webview': path.resolve(__dirname, 'stubs/react-native-webview.js'),
  'react-native-edge-to-edge': path.resolve(__dirname, 'stubs/react-native-edge-to-edge.js'),
  'react-native-maps': path.resolve(__dirname, 'stubs/react-native-maps.js'),
  'react-native-css-interop': path.resolve(__dirname, 'stubs/react-native-css-interop.js'),
  'react-native-worklets': path.resolve(__dirname, 'stubs/react-native-worklets.js'),
  'react-native-reanimated': path.resolve(__dirname, 'stubs/react-native-reanimated.js'),
  'react-native-gesture-handler': path.resolve(__dirname, 'stubs/react-native-gesture-handler.js'),
};

module.exports = config;
