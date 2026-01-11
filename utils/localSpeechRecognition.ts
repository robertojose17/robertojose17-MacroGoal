
/**
 * Local Speech Recognition Utility
 * 
 * This module provides on-device speech-to-text functionality using @react-native-voice/voice.
 * It uses platform-specific implementations:
 * 
 * - iOS: Speech framework (SFSpeechRecognizer)
 * - Android: SpeechRecognizer API
 * - Web: Not supported (mic button hidden)
 * 
 * FEATURES:
 * - Real-time speech recognition (no file recording needed)
 * - Works reliably on both iOS and Android
 * - Free and on-device
 * - No API keys required
 * 
 * SETUP:
 * 1. Install: npm install @react-native-voice/voice
 * 2. iOS: Add to Info.plist:
 *    <key>NSSpeechRecognitionUsageDescription</key>
 *    <string>We need access to speech recognition to transcribe your voice input</string>
 *    <key>NSMicrophoneUsageDescription</key>
 *    <string>We need access to your microphone to record audio</string>
 * 3. Android: Permissions are automatically handled
 * 4. Build: npx expo run:ios or npx expo run:android
 */

import { Platform } from 'react-native';

// Platform-specific implementations
let platformImplementation: {
  startSpeechRecognition: (
    onSuccess: (text: string) => void,
    onError: (error: string) => void
  ) => Promise<void>;
  stopSpeechRecognition: () => Promise<void>;
  transcribeAudioLocally: (
    audioUri: string,
    onSuccess: (text: string) => void,
    onError: (error: string) => void
  ) => Promise<void>;
  isLocalSTTSupported: () => boolean;
  requestSpeechRecognitionPermissions: () => Promise<boolean>;
  cleanupSpeechRecognition: () => Promise<void>;
};

if (Platform.OS === 'web') {
  // Dynamic import for web platform
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  platformImplementation = require('./localSpeechRecognition.web') as typeof platformImplementation;
} else {
  // Dynamic import for native platforms
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  platformImplementation = require('./localSpeechRecognition.native') as typeof platformImplementation;
}

export const startSpeechRecognition = platformImplementation.startSpeechRecognition;
export const stopSpeechRecognition = platformImplementation.stopSpeechRecognition;
export const transcribeAudioLocally = platformImplementation.transcribeAudioLocally;
export const isLocalSTTSupported = platformImplementation.isLocalSTTSupported;
export const requestSpeechRecognitionPermissions = platformImplementation.requestSpeechRecognitionPermissions;
export const cleanupSpeechRecognition = platformImplementation.cleanupSpeechRecognition;

/**
 * Check if the microphone button should be shown
 * Only show on mobile platforms where STT could potentially work
 */
export function shouldShowMicButton(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
