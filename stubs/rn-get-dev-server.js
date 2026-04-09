'use strict';
// Stub for rn-get-dev-server.
// Some callers do: require('rn-get-dev-server')()
// Others do:       require('rn-get-dev-server').getDevServer()
// Support both by making the export a function that also has a .getDevServer property.
function getDevServer() {
  return { bundleLoadedFromServer: false, hotLoadingEnabled: false, url: '' };
}
getDevServer.getDevServer = getDevServer;
module.exports = getDevServer;
