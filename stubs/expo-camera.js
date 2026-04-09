// Stub for expo-camera — used by Metro extraNodeModules
// when the real native module is not linked. ZERO re-exports of the real package.
'use strict';

var React = require('react');
var RN = require('react-native');

var CameraView = function(props) {
  return React.createElement(RN.View, props);
};
CameraView.displayName = 'CameraView';

module.exports = {
  __esModule: true,
  CameraView: CameraView,
  Camera: CameraView,
  useCameraPermissions: function() {
    return [{ granted: false, status: 'undetermined' }, function() { return Promise.resolve({ granted: false, status: 'undetermined' }); }];
  },
  useMicrophonePermissions: function() {
    return [{ granted: false, status: 'undetermined' }, function() { return Promise.resolve({ granted: false, status: 'undetermined' }); }];
  },
  requestCameraPermissionsAsync: function() { return Promise.resolve({ granted: false, status: 'undetermined' }); },
  getCameraPermissionsAsync: function() { return Promise.resolve({ granted: false, status: 'undetermined' }); },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  CameraType: { front: 'front', back: 'back' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto', torch: 'torch' },
  default: CameraView,
};
