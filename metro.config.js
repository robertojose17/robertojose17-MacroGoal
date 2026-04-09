// ios-fix-complete
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);
const stubsDir = path.resolve(__dirname, 'stubs');

// Map every stub file that exists
const stubMappings = {
  'react-native-reanimated': 'react-native-reanimated.js',
  'react-native-gesture-handler': 'react-native-gesture-handler.js',
  'react-native-maps': 'react-native-maps.js',
  'react-native-view-shot': 'react-native-view-shot.js',
  'react-native-webview': 'react-native-webview.js',
  'react-native-css-interop': 'react-native-css-interop.js',
  'react-native-edge-to-edge': 'react-native-edge-to-edge.js',
  'react-native-worklets-core': 'react-native-worklets.js',
  'react-native-purchases': 'react-native-purchases.js',
  'react-native-google-mobile-ads': 'react-native-google-mobile-ads.js',
  'react-native-svg': 'react-native-svg.js',
  'react-native-chart-kit': 'react-native-chart-kit.js',
  'react-native-calendars': 'react-native-calendars.js',
  'rn-get-dev-server': 'rn-get-dev-server.js',
  '@bacons/apple-targets': 'bacons-apple-targets.js',
  'expo-in-app-purchases': 'expo-in-app-purchases.js',
  '@react-native-community/datetimepicker': 'datetimepicker.js',
  'expo-glass-effect': 'expo-glass-effect.js',
  'ws': 'ws.js',
  '@supabase/realtime-js': 'supabase-realtime.js',
  'expo-camera': 'expo-camera.js',
  'expo-blur': 'expo-blur.js',
  'expo-linear-gradient': 'expo-linear-gradient.js',
  'expo-image-picker': 'expo-image-picker.js',
  'expo-haptics': 'expo-haptics.js',
  'expo-sharing': 'expo-sharing.js',
  'expo-audio': 'expo-audio.js',
  'expo-media-library': 'expo-media-library.js',
  'expo-file-system': 'expo-file-system.js',
  'expo-print': 'expo-print.js',
  'expo-secure-store': 'expo-secure-store.js',
};

config.resolver.extraNodeModules = {};

Object.entries(stubMappings).forEach(([pkg, file]) => {
  const fullPath = path.resolve(stubsDir, file);
  if (fs.existsSync(fullPath)) {
    config.resolver.extraNodeModules[pkg] = fullPath;
  }
});

const speechPath = path.resolve(__dirname, 'modules/expo-speech-recognition');
if (fs.existsSync(speechPath)) {
  config.resolver.extraNodeModules['expo-speech-recognition'] = speechPath;
}

const NODE_BUILTINS = new Set([
  'stream', 'events', 'http', 'https', 'net', 'tls', 'zlib', 'crypto',
  'buffer', 'url', 'querystring', 'path', 'os', 'fs', 'child_process',
  'worker_threads', 'cluster', 'dgram', 'dns', 'readline', 'repl', 'vm',
  'assert', 'util', 'string_decoder', 'punycode', 'domain', 'constants',
  'module', 'process', 'timers', 'perf_hooks', 'async_hooks', 'inspector',
  'trace_events', 'v8', 'wasi', 'http2', 'tty', 'sys',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'ios' || platform === 'android') {
    const bare = moduleName.startsWith('node:') ? moduleName.slice(5) : moduleName;
    if (NODE_BUILTINS.has(bare)) return { type: 'empty' };
    if (moduleName === 'bufferutil' || moduleName === 'utf-8-validate') return { type: 'empty' };
    if (moduleName.startsWith('ws/')) return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
