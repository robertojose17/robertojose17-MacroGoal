const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// ─── Stub mappings ────────────────────────────────────────────────────────────
// These native modules are NOT linked in the Expo Go / preview build.
// Metro resolves them to safe JS stubs so the bundle doesn't crash on import.
const stubsDir = path.join(__dirname, 'stubs');

config.resolver.extraNodeModules = {
  // Reanimated — babel plugin is intentionally removed (see babel.config.js)
  'react-native-reanimated': path.join(stubsDir, 'react-native-reanimated.js'),
  // Gesture handler
  'react-native-gesture-handler': path.join(stubsDir, 'react-native-gesture-handler.js'),
  // Worklets (reanimated dependency)
  'react-native-worklets': path.join(stubsDir, 'react-native-worklets.js'),
  'react-native-worklets-core': path.join(stubsDir, 'react-native-worklets.js'),
  // View shot (used by dashboard share feature)
  'react-native-view-shot': path.join(stubsDir, 'react-native-view-shot.js'),
  // Maps
  'react-native-maps': path.join(stubsDir, 'react-native-maps.js'),
  // Charts
  'react-native-chart-kit': path.join(stubsDir, 'react-native-chart-kit.js'),
  // Calendars
  'react-native-calendars': path.join(stubsDir, 'react-native-calendars.js'),
  // SVG
  'react-native-svg': path.join(stubsDir, 'react-native-svg.js'),
  // WebView
  'react-native-webview': path.join(stubsDir, 'react-native-webview.js'),
  // RevenueCat / purchases
  'react-native-purchases': path.join(stubsDir, 'react-native-purchases.js'),
  // Google Mobile Ads
  'react-native-google-mobile-ads': path.join(stubsDir, 'react-native-google-mobile-ads.js'),
  // CSS interop
  'react-native-css-interop': path.join(stubsDir, 'react-native-css-interop.js'),
  // Edge to edge
  'react-native-edge-to-edge': path.join(stubsDir, 'react-native-edge-to-edge.js'),
  // DateTimePicker
  '@react-native-community/datetimepicker': path.join(stubsDir, 'datetimepicker.js'),
  // Expo Glass Effect
  'expo-glass-effect': path.join(stubsDir, 'expo-glass-effect.js'),
  // Expo Metro Runtime — stub avoids HMRClient crash in embedded environments
  '@expo/metro-runtime': path.join(stubsDir, 'expo-metro-runtime.js'),
  // Expo Updates
  'expo-updates': path.join(stubsDir, 'expo-updates.js'),
  // Expo In-App Purchases (legacy)
  'expo-in-app-purchases': path.join(stubsDir, 'expo-in-app-purchases.js'),
  // Bacons Apple Targets
  '@bacons/apple-targets': path.join(stubsDir, 'bacons-apple-targets.js'),
  // React DevTools Core
  'react-devtools-core': path.join(stubsDir, 'react-devtools-core.js'),
  // rn-get-dev-server — must export a FUNCTION, not an object
  'rn-get-dev-server': path.join(stubsDir, 'rn-get-dev-server.js'),
};

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

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
