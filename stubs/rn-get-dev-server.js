'use strict';
// Stub for rn-get-dev-server.
// The real package's default export IS the function itself (not an object).
// Callers do: const getDevServer = require('rn-get-dev-server'); getDevServer();
// So module.exports must be the function directly — no __esModule flag, no wrapping.
function getDevServer() {
  return { bundleLoadedFromServer: false, hotLoadingEnabled: false, url: '' };
}
module.exports = getDevServer;
module.exports.getDevServer = getDevServer;
