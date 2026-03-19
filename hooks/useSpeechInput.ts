import { useState, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function useSpeechInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results?.[0]?.transcript) {
      console.log('[useSpeechInput] Transcript received:', event.results[0].transcript);
      onResult(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[useSpeechInput] Recognition ended');
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[useSpeechInput] Speech error:', event.error, event.message);
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    console.log('[useSpeechInput] Requesting speech permission...');
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      console.log('[useSpeechInput] Speech permission denied');
      return;
    }
    console.log('[useSpeechInput] Starting speech recognition');
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'es-ES',
      interimResults: true,
      continuous: false,
    });
  }, []);

  const stopListening = useCallback(() => {
    console.log('[useSpeechInput] Stopping speech recognition');
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, toggleListening };
}
