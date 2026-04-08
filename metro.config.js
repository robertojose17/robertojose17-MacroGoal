const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// NOTE: Do NOT enable unstable_enablePackageExports — it breaks native module
// resolution for packages like react-native-reanimated, react-native-gesture-handler,
// and react-native-safe-area-context that rely on Metro's classic resolver to pick
// the correct platform-specific entry points. Leaving this false (the default).
// config.resolver.unstable_enablePackageExports = false;

// ─── Stub out native packages that are not linked in the preview build ────────
// These packages are listed in package.json (so TypeScript can resolve their
// types) but their native modules are NOT compiled into the app binary.
// Without these mappings Metro would bundle the real package and the app would
// crash at runtime with "Native module not found" or a silent blank screen.
const STUB_DIR = path.join(__dirname, 'stubs');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-reanimated':        path.join(STUB_DIR, 'react-native-reanimated.js'),
  'react-native-gesture-handler':   path.join(STUB_DIR, 'react-native-gesture-handler.js'),
  'react-native-purchases':         path.join(STUB_DIR, 'react-native-purchases.js'),
  'react-native-google-mobile-ads': path.join(STUB_DIR, 'react-native-google-mobile-ads.js'),
  'react-native-maps':              path.join(STUB_DIR, 'react-native-maps.js'),
  'react-native-view-shot':         path.join(STUB_DIR, 'react-native-view-shot.js'),
  'react-native-webview':           path.join(STUB_DIR, 'react-native-webview.js'),
  'react-native-css-interop':       path.join(STUB_DIR, 'react-native-css-interop.js'),
  'react-native-edge-to-edge':      path.join(STUB_DIR, 'react-native-edge-to-edge.js'),
  'react-native-worklets-core':     path.join(STUB_DIR, 'react-native-worklets.js'),
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
