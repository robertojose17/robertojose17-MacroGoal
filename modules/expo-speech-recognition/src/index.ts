
import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';
import { Platform } from 'react-native';

// Try to get the native module — may be null in Expo Go / managed workflow
const ExpoSpeechRecognition = NativeModulesProxy.ExpoSpeechRecognition ?? null;

export type TranscriptionResult = {
  text: string;
  confidence: number;
  isFinal: boolean;
};

export type TranscriptionError = {
  code: string;
  message: string;
};

/**
 * Request speech recognition permissions.
 * iOS: Requests SFSpeechRecognizer permission via native module if available.
 * Android: RECORD_AUDIO is handled by expo-audio.
 * Falls back gracefully when native module is unavailable.
 */
export async function requestPermissionsAsync(): Promise<{ granted: boolean }> {
  if (!ExpoSpeechRecognition) {
    // Native module not available — permissions are handled by expo-audio
    console.log('[ExpoSpeechRecognition] Native module not available, skipping speech permission request');
    return { granted: true };
  }

  try {
    const result = await ExpoSpeechRecognition.requestPermissionsAsync();
    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error requesting permissions:', error);
    // Return granted:true so the audio recording flow can still proceed
    return { granted: true };
  }
}

/**
 * Check if speech recognition is available on this device.
 * Returns true by default so the mic button is always shown and usable.
 */
export async function isAvailableAsync(): Promise<boolean> {
  // Always return true — the mic button should always be visible.
  // If the native module is unavailable, we fall back to audio recording + server transcription.
  return true;
}

/**
 * Transcribe audio from a file URI.
 * Uses native module if available, otherwise throws a descriptive error.
 * @param audioUri - Local file URI of the audio file
 * @param language - Language code (e.g., "en-US")
 * @returns Transcription result with text and confidence
 */
export async function transcribeAsync(
  audioUri: string,
  language: string = 'en-US'
): Promise<TranscriptionResult> {
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
  } catch (error: any) {
    console.error('[ExpoSpeechRecognition] Transcription error:', error);
    throw error;
  }
}

/**
 * Get supported languages for speech recognition.
 */
export async function getSupportedLanguagesAsync(): Promise<string[]> {
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
