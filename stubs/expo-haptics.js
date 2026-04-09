// Stub for expo-haptics — used by Metro extraNodeModules
// when the real native module is not linked.
'use strict';

var impactAsync = function() { return Promise.resolve(); };
var notificationAsync = function() { return Promise.resolve(); };
var selectionAsync = function() { return Promise.resolve(); };

var ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid', Soft: 'soft' };
var NotificationFeedbackType = { Success: 'success', Warning: 'warning', Error: 'error' };

module.exports = {
  __esModule: true,
  impactAsync: impactAsync,
  notificationAsync: notificationAsync,
  selectionAsync: selectionAsync,
  ImpactFeedbackStyle: ImpactFeedbackStyle,
  NotificationFeedbackType: NotificationFeedbackType,
};
