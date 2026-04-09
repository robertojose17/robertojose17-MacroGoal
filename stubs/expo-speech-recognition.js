'use strict';
module.exports = {
  default: {},
  ExpoSpeechRecognitionModule: {
    start: () => {},
    stop: () => {},
    abort: () => {},
    requestPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
    getStateAsync: async () => 'inactive',
    getSupportedLocales: async () => ({ locales: [] }),
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
  },
  ExpoSpeechRecognitionModuleEmitter: {
    addListener: () => ({ remove: () => {} }),
    removeAllListeners: () => {},
  },
  useSpeechRecognitionEvent: () => {},
};
