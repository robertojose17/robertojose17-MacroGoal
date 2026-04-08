// Auto-generated shim — native build not compiled, safe JS fallback for Metro bundling.
'use strict';

async function requestPermissionsAsync() {
  console.warn('[ExpoSpeechRecognition] Native module not available (shim)');
  return { granted: false };
}

async function isAvailableAsync() {
  return false;
}

async function transcribeAsync(_audioUri, _language) {
  throw new Error('Speech recognition is not available on this platform');
}

async function getSupportedLanguagesAsync() {
  return [];
}

module.exports = {
  requestPermissionsAsync,
  isAvailableAsync,
  transcribeAsync,
  getSupportedLanguagesAsync,
};
