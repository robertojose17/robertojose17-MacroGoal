'use strict';

const { NativeModulesProxy } = require('expo-modules-core');

// Try to get the native module — may be null in Expo Go / managed workflow
const ExpoSpeechRecognition = NativeModulesProxy.ExpoSpeechRecognition ?? null;

async function requestPermissionsAsync() {
  if (!ExpoSpeechRecognition) {
    console.log('[ExpoSpeechRecognition] Native module not available, skipping speech permission request');
    return { granted: true };
  }
  try {
    const result = await ExpoSpeechRecognition.requestPermissionsAsync();
    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error requesting permissions:', error);
    return { granted: true };
  }
}

async function isAvailableAsync() {
  // Always return true — mic button must always be visible and usable.
  return true;
}

async function transcribeAsync(audioUri, language = 'en-US') {
  if (!ExpoSpeechRecognition) {
    console.warn('[ExpoSpeechRecognition] Native transcription module not available');
    throw new Error('NATIVE_MODULE_UNAVAILABLE');
  }
  try {
    console.log('[ExpoSpeechRecognition] Starting transcription...');
    console.log('[ExpoSpeechRecognition] Audio URI:', audioUri);
    console.log('[ExpoSpeechRecognition] Language:', language);

    const result = await ExpoSpeechRecognition.transcribeAsync(audioUri, language);

    console.log('[ExpoSpeechRecognition] Transcription successful');
    console.log('[ExpoSpeechRecognition] Text:', result.text);
    console.log('[ExpoSpeechRecognition] Confidence:', result.confidence);

    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Transcription error:', error);
    throw error;
  }
}

async function getSupportedLanguagesAsync() {
  if (!ExpoSpeechRecognition) {
    return ['en-US'];
  }
  try {
    const languages = await ExpoSpeechRecognition.getSupportedLanguagesAsync();
    return languages;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error getting supported languages:', error);
    return ['en-US'];
  }
}

module.exports = {
  requestPermissionsAsync,
  isAvailableAsync,
  transcribeAsync,
  getSupportedLanguagesAsync,
};
