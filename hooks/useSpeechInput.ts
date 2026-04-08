import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

// expo-speech-recognition is a native-only local module — no web support.
// Lazy require so Metro never statically bundles it on web/Expo Go.
const getRequestPermissionsAsync = (): (() => Promise<{ granted: boolean }>) | null => {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition').requestPermissionsAsync;
  } catch {
    return null;
  }
};

// NOTE: This hook uses the local expo-speech-recognition module which supports
// file-based transcription only (not live streaming). Live recognition events
// (useSpeechRecognitionEvent) are not available in this module.

export function useSpeechInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(async () => {
    console.log('[useSpeechInput] Requesting speech permission...');
    try {
      const requestPermissionsAsync = getRequestPermissionsAsync();
      if (!requestPermissionsAsync) {
        console.log('[useSpeechInput] Speech recognition not available on this platform');
        return;
      }
      const { granted } = await requestPermissionsAsync();
      if (!granted) {
        console.log('[useSpeechInput] Speech permission denied');
        return;
      }
      // Live streaming recognition is not supported by this module.
      // This hook is a no-op for live input — use expo-audio for recording
      // and then call transcribeAsync(uri) to get a transcript.
      console.log('[useSpeechInput] Speech permission granted (live recognition not available in this build)');
    } catch (e) {
      console.warn('[useSpeechInput] Failed to request speech permission:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log('[useSpeechInput] stopListening called');
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    console.log('[useSpeechInput] toggleListening called, isListening:', isListening);
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, toggleListening };
}
