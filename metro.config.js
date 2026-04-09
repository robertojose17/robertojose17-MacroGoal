const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// CRITICAL: Must be false (or omitted) for iOS native module resolution.
// When true, Metro uses package.json "exports" field which breaks many native packages.
config.resolver.unstable_enablePackageExports = false;

// Use turborepo to restore the cache when possible
config.cacheStores = [
    new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
  ];

// ─── Stub out native-incompatible modules ────────────────────────────────────
// These packages require native linking that is not present in the preview build.
// Without stubs, Metro bundles the real packages which crash iOS before
// AppRegistry.registerComponent ever runs (blank screen / "main not registered").
const STUBS = path.join(__dirname, 'stubs');

config.resolver.extraNodeModules = {
  // UI / animation
  'react-native-reanimated':          path.join(STUBS, 'react-native-reanimated.js'),
  'react-native-gesture-handler':     path.join(STUBS, 'react-native-gesture-handler.js'),
  'react-native-maps':                path.join(STUBS, 'react-native-maps.js'),
  'react-native-svg':                 path.join(STUBS, 'react-native-svg.js'),
  'react-native-view-shot':           path.join(STUBS, 'react-native-view-shot.js'),
  'react-native-webview':             path.join(STUBS, 'react-native-webview.js'),
  'react-native-worklets':            path.join(STUBS, 'react-native-worklets.js'),
  'react-native-css-interop':         path.join(STUBS, 'react-native-css-interop.js'),
  'react-native-edge-to-edge':        path.join(STUBS, 'react-native-edge-to-edge.js'),
  'react-native-chart-kit':           path.join(STUBS, 'react-native-chart-kit.js'),
  'react-native-calendars':           path.join(STUBS, 'react-native-calendars.js'),

  // Monetisation / ads
  'react-native-purchases':           path.join(STUBS, 'react-native-purchases.js'),
  'react-native-google-mobile-ads':   path.join(STUBS, 'react-native-google-mobile-ads.js'),

  // Expo modules that require native linking
  'expo-blur':                        path.join(STUBS, 'expo-blur.js'),
  'expo-camera':                      path.join(STUBS, 'expo-camera.js'),
  'expo-linear-gradient':             path.join(STUBS, 'expo-linear-gradient.js'),
  'expo-image-picker':                path.join(STUBS, 'expo-image-picker.js'),
  'expo-haptics':                     path.join(STUBS, 'expo-haptics.js'),
  'expo-sharing':                     path.join(STUBS, 'expo-sharing.js'),
  'expo-secure-store':                path.join(STUBS, 'expo-secure-store.js'),
  'expo-audio':                       path.join(STUBS, 'expo-audio.js'),
  'expo-file-system':                 path.join(STUBS, 'expo-file-system.js'),
  'expo-media-library':               path.join(STUBS, 'expo-media-library.js'),
  'expo-print':                       path.join(STUBS, 'expo-print.js'),
  'expo-updates':                     path.join(STUBS, 'expo-updates.js'),
  'expo-in-app-purchases':            path.join(STUBS, 'expo-in-app-purchases.js'),
  'expo-speech-recognition':          path.join(STUBS, 'expo-speech-recognition.js'),
  'expo-glass-effect':                path.join(STUBS, 'expo-glass-effect.js'),

  // Network / realtime
  'ws':                               path.join(STUBS, 'ws.js'),
  '@supabase/realtime-js':            path.join(STUBS, 'supabase-realtime.js'),

  // Misc
  '@bacons/apple-targets':            path.join(STUBS, 'bacons-apple-targets.js'),
  '@react-native-community/datetimepicker': path.join(STUBS, 'datetimepicker.js'),
  'react-devtools-core':              path.join(STUBS, 'react-devtools-core.js'),
  'rn-get-dev-server':                path.join(STUBS, 'rn-get-dev-server.js'),
};

// ─── Resolve node: built-in aliases ──────────────────────────────────────────
// Some packages (e.g. @supabase/supabase-js) import node built-ins with the
// "node:" prefix (e.g. "node:buffer", "node:stream"). Metro doesn't understand
// this prefix on React Native, so we strip it and let Metro resolve the bare name
// (which is already polyfilled by React Native's module system).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Explicitly stub rn-get-dev-server — extraNodeModules is bypassed by this
  // custom resolver, so we must intercept it here before falling through.
  if (moduleName === 'rn-get-dev-server') {
    return { type: 'sourceFile', filePath: path.join(STUBS, 'rn-get-dev-server.js') };
  }
  if (moduleName.startsWith('node:')) {
    const bare = moduleName.slice(5); // strip "node:" prefix
    // Try to resolve the bare name; if it fails, return an empty module
    try {
      return (originalResolveRequest || context.resolveRequest)(
        context,
        bare,
        platform,
      );
    } catch (_e) {
      // Return an empty module for unknown node built-ins
      return { type: 'empty' };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Custom server middleware to receive console.log messages from the app
const LOG_FILE_PATH = path.join(__dirname, '.natively', 'app_console.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {

    // DEBUG: log all metro bundle requests
    if (req.url.includes('index.bundle') || req.url.includes('.bundle')) {
      console.log('[METRO] Request:', req.method, req.url);
    }

    // Extract pathname without query params for matching
    const pathname = req.url.split('?')[0];

    // Handle log receiving endpoint
    if (pathname === '/natively-logs' && req.method === 'POST') {
      console.log('[NATIVELY-LOGS] Received POST request');
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const logData = JSON.parse(body);
          const timestamp = logData.timestamp || new Date().toISOString();
          const level = (logData.level || 'log').toUpperCase();
          const message = logData.message || '';
          const source = logData.source || '';
          const platform = logData.platform || '';

          const platformInfo = platform ? `[${platform}] ` : '';
          const sourceInfo = source ? `[${source}] ` : '';
          const logLine = `[${timestamp}] ${platformInfo}[${level}] ${sourceInfo}${message}\n`;

          console.log('[NATIVELY-LOGS] Writing log:', logLine.trim());

          // Rotate log file if too large
          try {
            if (fs.existsSync(LOG_FILE_PATH) && fs.statSync(LOG_FILE_PATH).size > MAX_LOG_SIZE) {
              const content = fs.readFileSync(LOG_FILE_PATH, 'utf8');
              const lines = content.split('\n');
              fs.writeFileSync(LOG_FILE_PATH, lines.slice(lines.length / 2).join('\n'));
            }
          } catch (e) {
            // Ignore rotation errors
          }

          fs.appendFileSync(LOG_FILE_PATH, logLine);

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end('{"status":"ok"}');
        } catch (e) {
          console.error('[NATIVELY-LOGS] Error processing log:', e.message);
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Handle CORS preflight for log endpoint
    if (pathname === '/natively-logs' && req.method === 'OPTIONS') {
      console.log('[NATIVELY-LOGS] Received OPTIONS preflight request');
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    // Pass through to default Metro middleware
    return middleware(req, res, next);
  };
};

module.exports = config;
