import { useState, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function useSpeechInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event?.results?.[0]?.transcript;
    if (transcript) {
      console.log('[useSpeechInput] Transcript received:', transcript);
      onResult(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[useSpeechInput] Recognition ended');
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[useSpeechInput] Speech error:', event?.error, event?.message);
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    console.log('[useSpeechInput] Requesting speech permission...');
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        console.log('[useSpeechInput] Speech permission denied');
        return;
      }
      console.log('[useSpeechInput] Starting speech recognition');
      setIsListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (e) {
      console.warn('[useSpeechInput] Failed to start speech recognition:', e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    console.log('[useSpeechInput] Stopping speech recognition');
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.warn('[useSpeechInput] Failed to stop speech recognition:', e);
    }
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
