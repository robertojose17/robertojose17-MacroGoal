// cache bust
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

const STUBS = {
  'react-native-reanimated': path.resolve(__dirname, 'stubs/react-native-reanimated.js'),
  'react-native-gesture-handler': path.resolve(__dirname, 'stubs/react-native-gesture-handler.js'),
  'react-native-maps': path.resolve(__dirname, 'stubs/react-native-maps.js'),
  'react-native-svg': path.resolve(__dirname, 'stubs/react-native-svg.js'),
  'react-native-purchases': path.resolve(__dirname, 'stubs/react-native-purchases.js'),
  'react-native-google-mobile-ads': path.resolve(__dirname, 'stubs/react-native-google-mobile-ads.js'),
  'react-native-view-shot': path.resolve(__dirname, 'stubs/react-native-view-shot.js'),
  'react-native-webview': path.resolve(__dirname, 'stubs/react-native-webview.js'),
  'react-native-css-interop': path.resolve(__dirname, 'stubs/react-native-css-interop.js'),
  'react-native-worklets-core': path.resolve(__dirname, 'stubs/react-native-worklets.js'),
  'react-native-worklets': path.resolve(__dirname, 'stubs/react-native-worklets.js'),
  'react-native-edge-to-edge': path.resolve(__dirname, 'stubs/react-native-edge-to-edge.js'),
  'react-native-calendars': path.resolve(__dirname, 'stubs/react-native-calendars.js'),
  'react-native-chart-kit': path.resolve(__dirname, 'stubs/react-native-chart-kit.js'),
  'expo-in-app-purchases': path.resolve(__dirname, 'stubs/expo-in-app-purchases.js'),
  '@bacons/apple-targets': path.resolve(__dirname, 'stubs/bacons-apple-targets.js'),
  'expo-glass-effect': path.resolve(__dirname, 'stubs/expo-glass-effect.js'),
  'react-devtools-core': path.resolve(__dirname, 'stubs/react-devtools-core.js'),
  'rn-get-dev-server': path.resolve(__dirname, 'stubs/rn-get-dev-server.js'),
  'expo-updates': path.resolve(__dirname, 'stubs/expo-updates.js'),
  '@react-native-community/datetimepicker': path.resolve(__dirname, 'stubs/datetimepicker.js'),
  '@expo/metro-runtime': path.resolve(__dirname, 'stubs/expo-metro-runtime.js'),
  'expo-speech-recognition': path.resolve(__dirname, 'stubs/expo-speech-recognition.js'),
};

config.resolver.extraNodeModules = STUBS;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(STUBS, moduleName)) {
    return { filePath: STUBS[moduleName], type: 'sourceFile' };
  }
  // Intercept any local path that includes expo-speech-recognition
  if (moduleName.includes('expo-speech-recognition')) {
    return { filePath: path.resolve(__dirname, 'stubs/expo-speech-recognition.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Optimize for faster bundling
config.transformer = config.transformer || {};
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: { keep_fnames: true },
  output: { ascii_only: true, quote_style: 3, wrap_iife: true },
  sourceMap: { includeSources: false },
  toplevel: false,
  compress: { reduce_funcs: false },
};

module.exports = config;
