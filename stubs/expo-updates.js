'use strict';
const noop = async () => ({});
const noopSync = () => {};
module.exports = {
  checkForUpdateAsync: noop,
  fetchUpdateAsync: noop,
  reloadAsync: noop,
  useUpdates: () => ({
    isUpdateAvailable: false,
    isUpdatePending: false,
    downloadedUpdate: null,
    isChecking: false,
    isDownloading: false,
    currentlyRunning: { isEmbeddedLaunch: true, isEmergencyLaunch: false },
  }),
  UpdateEventType: { ERROR: 'error', NO_UPDATE_AVAILABLE: 'noUpdateAvailable', UPDATE_AVAILABLE: 'updateAvailable' },
  addListener: noopSync,
  removeListeners: noopSync,
  default: {
    checkForUpdateAsync: noop,
    fetchUpdateAsync: noop,
    reloadAsync: noop,
  },
};
