'use strict';
function getDevServer() {
  return { bundleLoadedFromServer: false, hotLoadingEnabled: false, url: '' };
}
module.exports = getDevServer;
