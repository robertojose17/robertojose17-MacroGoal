// Stub for expo-image-picker — used by Metro extraNodeModules
// when the real native module is not linked.
'use strict';

var launchImageLibraryAsync = function() { return Promise.resolve({ canceled: true, assets: [] }); };
var launchCameraAsync = function() { return Promise.resolve({ canceled: true, assets: [] }); };
var requestMediaLibraryPermissionsAsync = function() { return Promise.resolve({ granted: false, status: 'denied' }); };
var requestCameraPermissionsAsync = function() { return Promise.resolve({ granted: false, status: 'denied' }); };
var getMediaLibraryPermissionsAsync = function() { return Promise.resolve({ granted: false, status: 'undetermined' }); };
var getCameraPermissionsAsync = function() { return Promise.resolve({ granted: false, status: 'undetermined' }); };

var MediaTypeOptions = { All: 'All', Videos: 'Videos', Images: 'Images' };
var UIImagePickerPresentationStyle = {
  AUTOMATIC: 'automatic',
  FULL_SCREEN: 'fullScreen',
  PAGE_SHEET: 'pageSheet',
  FORM_SHEET: 'formSheet',
  CURRENT_CONTEXT: 'currentContext',
  OVER_FULL_SCREEN: 'overFullScreen',
  OVER_CURRENT_CONTEXT: 'overCurrentContext',
  POPOVER: 'popover',
  NONE: 'none',
  BLUR_OVER_FULL_SCREEN: 'blurOverFullScreen',
};
var PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' };

module.exports = {
  __esModule: true,
  launchImageLibraryAsync: launchImageLibraryAsync,
  launchCameraAsync: launchCameraAsync,
  requestMediaLibraryPermissionsAsync: requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync: requestCameraPermissionsAsync,
  getMediaLibraryPermissionsAsync: getMediaLibraryPermissionsAsync,
  getCameraPermissionsAsync: getCameraPermissionsAsync,
  MediaTypeOptions: MediaTypeOptions,
  UIImagePickerPresentationStyle: UIImagePickerPresentationStyle,
  PermissionStatus: PermissionStatus,
};
