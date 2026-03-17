'use strict';

const { NativeModulesProxy } = require('expo-modules-core');

const ExpoSpeechRecognition = NativeModulesProxy.ExpoSpeechRecognition;

async function requestPermissionsAsync() {
  if (!ExpoSpeechRecognition) {
    console.warn('[ExpoSpeechRecognition] Native module not available');
    return { granted: false };
  }
  try {
    const result = await ExpoSpeechRecognition.requestPermissionsAsync();
    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error requesting permissions:', error);
    return { granted: false };
  }
}

async function isAvailableAsync() {
  if (!ExpoSpeechRecognition) {
    return false;
  }
  try {
    const result = await ExpoSpeechRecognition.isAvailableAsync();
    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error checking availability:', error);
    return false;
  }
}

async function transcribeAsync(audioUri, language = 'en-US') {
  if (!ExpoSpeechRecognition) {
    throw new Error('Speech recognition is not available on this platform');
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
    return [];
  }
  try {
    const languages = await ExpoSpeechRecognition.getSupportedLanguagesAsync();
    return languages;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error getting supported languages:', error);
    return [];
  }
}

module.exports = {
  requestPermissionsAsync,
  isAvailableAsync,
  transcribeAsync,
  getSupportedLanguagesAsync,
};
