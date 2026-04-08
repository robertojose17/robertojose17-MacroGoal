const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// MUST be false — true breaks package.exports resolution for many Expo packages
// and causes silent blank-screen crashes on iOS cold start.
config.resolver.unstable_enablePackageExports = false;

// Wire all native-only packages to their stubs so Metro never tries to bundle
// the real native modules (which are not linked in Expo Go / preview builds).
config.resolver.extraNodeModules = {
  'react-native-purchases':          path.resolve(__dirname, 'stubs/react-native-purchases.js'),
  'react-native-google-mobile-ads':  path.resolve(__dirname, 'stubs/react-native-google-mobile-ads.js'),
  'react-native-view-shot':          path.resolve(__dirname, 'stubs/react-native-view-shot.js'),
  'react-native-webview':            path.resolve(__dirname, 'stubs/react-native-webview.js'),
  'react-native-maps':               path.resolve(__dirname, 'stubs/react-native-maps.js'),
  'react-native-css-interop':        path.resolve(__dirname, 'stubs/react-native-css-interop.js'),
  'react-native-worklets-core':      path.resolve(__dirname, 'stubs/react-native-worklets.js'),
  'react-native-reanimated':         path.resolve(__dirname, 'stubs/react-native-reanimated.js'),
  'react-native-gesture-handler':    path.resolve(__dirname, 'stubs/react-native-gesture-handler.js'),
  'react-native-edge-to-edge':       path.resolve(__dirname, 'stubs/react-native-edge-to-edge.js'),
  'react-native-svg':                path.resolve(__dirname, 'stubs/react-native-svg.js'),
  'react-native-calendars':          path.resolve(__dirname, 'stubs/react-native-calendars.js'),
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
