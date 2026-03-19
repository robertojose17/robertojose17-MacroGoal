import { Platform } from 'react-native';

// Use requireNativeModule for proper Expo Modules Core integration
let NativeModule: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    NativeModule = requireNativeModule('ExpoSpeechRecognition');
  } catch {
    // Native module not available (Expo Go, web, or module not linked)
    NativeModule = null;
  }
}

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
 * Check if speech recognition is available on this device.
 */
export async function isAvailableAsync(): Promise<boolean> {
  if (!NativeModule) {
    console.warn('[ExpoSpeechRecognition] Native module not available');
    return false;
  }
  try {
    const result = await NativeModule.isAvailableAsync();
    return result === true;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error checking availability:', error);
    return false;
  }
}

/**
 * Request speech recognition permissions.
 * iOS: Requests SFSpeechRecognizer permission.
 * Android: Checks RECORD_AUDIO permission (must be granted via expo-audio plugin).
 */
export async function requestPermissionsAsync(): Promise<{ granted: boolean }> {
  if (!NativeModule) {
    console.warn('[ExpoSpeechRecognition] Native module not available');
    return { granted: false };
  }
  try {
    const result = await NativeModule.requestPermissionsAsync();
    return result;
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error requesting permissions:', error);
    return { granted: false };
  }
}

/**
 * Transcribe audio from a file URI using the device's built-in speech recognition.
 * @param audioUri - Local file URI of the audio file (e.g. file:///path/to/audio.m4a)
 * @param language - Language code (e.g. "en-US")
 */
export async function transcribeAsync(
  audioUri: string,
  language: string = 'en-US'
): Promise<TranscriptionResult> {
  if (!NativeModule) {
    throw new Error('Speech recognition native module is not available on this platform/build');
  }
  try {
    console.log('[ExpoSpeechRecognition] Starting transcription for URI:', audioUri);
    const result = await NativeModule.transcribeAsync(audioUri, language);
    console.log('[ExpoSpeechRecognition] Transcription result:', result?.text);
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
  if (!NativeModule) {
    return [];
  }
  try {
    return await NativeModule.getSupportedLanguagesAsync();
  } catch (error) {
    console.error('[ExpoSpeechRecognition] Error getting supported languages:', error);
    return [];
  }
}
