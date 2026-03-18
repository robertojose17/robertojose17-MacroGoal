
import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';

export type SpeechInputState = 'idle' | 'recording' | 'processing' | 'error';

export interface UseSpeechInputResult {
  state: SpeechInputState;
  isListening: boolean;
  isAvailable: boolean;
  interimText: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
}

// ─── Web implementation ───────────────────────────────────────────────────────

function useWebSpeechInput(
  onTranscript: (text: string, isFinal: boolean) => void
): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      : null;

  const isAvailable = !!SpeechRecognitionCtor;

  const startListening = useCallback(async () => {
    if (!SpeechRecognitionCtor) return;
    console.log('[useSpeechInput] Web: startListening');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[useSpeechInput] Web: recognition started');
      setState('recording');
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        console.log('[useSpeechInput] Web: interim result:', interim);
        setInterimText(interim);
        onTranscript(interim, false);
      }
      if (finalText) {
        console.log('[useSpeechInput] Web: final result:', finalText);
        setInterimText('');
        onTranscript(finalText, true);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[useSpeechInput] Web: recognition error:', event.error);
      if (event.error === 'not-allowed') {
        Alert.alert(
          'Microphone Permission Denied',
          'Please allow microphone access in your browser settings to use voice input.'
        );
      }
      setState('error');
      setInterimText('');
    };

    recognition.onend = () => {
      console.log('[useSpeechInput] Web: recognition ended');
      setState('idle');
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionCtor, onTranscript]);

  const stopListening = useCallback(async () => {
    console.log('[useSpeechInput] Web: stopListening');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('idle');
    setInterimText('');
  }, []);

  return {
    state,
    isListening: state === 'recording',
    isAvailable,
    interimText,
    startListening,
    stopListening,
  };
}

// ─── Native implementation (iOS / Android) ───────────────────────────────────

function useNativeSpeechInput(
  onTranscript: (text: string, isFinal: boolean) => void
): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [interimText, setInterimText] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const recordingRef = useRef<any>(null);

  // Lazy-load expo-av and expo-speech-recognition to avoid web crashes
  const AudioModule = useRef<any>(null);
  const SpeechModule = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        AudioModule.current = require('expo-av');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        SpeechModule.current = require('../modules/expo-speech-recognition/src/index');
        const available = await SpeechModule.current.isAvailableAsync();
        if (!cancelled) {
          setIsAvailable(available);
          console.log('[useSpeechInput] Native: speech recognition available:', available);
        }
      } catch (e) {
        console.warn('[useSpeechInput] Native: failed to load modules:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startListening = useCallback(async () => {
    console.log('[useSpeechInput] Native: startListening');
    if (!AudioModule.current || !SpeechModule.current) {
      Alert.alert('Not Available', 'Speech recognition is not available on this device.');
      return;
    }

    // Request permissions
    const { Audio } = AudioModule.current;
    const permResult = await Audio.requestPermissionsAsync();
    console.log('[useSpeechInput] Native: mic permission:', permResult.status);
    if (permResult.status !== 'granted') {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow microphone access to use voice input.'
      );
      return;
    }

    try {
      setState('recording');
      setInterimText('');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      console.log('[useSpeechInput] Native: recording started');
    } catch (e: any) {
      console.error('[useSpeechInput] Native: error starting recording:', e);
      setState('error');
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, []);

  const stopListening = useCallback(async () => {
    console.log('[useSpeechInput] Native: stopListening');
    if (!recordingRef.current || !SpeechModule.current) {
      setState('idle');
      return;
    }

    setState('processing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      console.log('[useSpeechInput] Native: recording stopped, URI:', uri);

      if (!uri) {
        setState('idle');
        return;
      }

      const result = await SpeechModule.current.transcribeAsync(uri, 'en-US');
      console.log('[useSpeechInput] Native: transcription result:', result.text);

      if (result.text) {
        onTranscript(result.text, true);
      }

      // Reset audio mode
      const { Audio } = AudioModule.current;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (e: any) {
      console.error('[useSpeechInput] Native: error stopping/transcribing:', e);
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
    } finally {
      setState('idle');
      setInterimText('');
    }
  }, [onTranscript]);

  return {
    state,
    isListening: state === 'recording',
    isAvailable,
    interimText,
    startListening,
    stopListening,
  };
}

// ─── Public hook — picks the right implementation ────────────────────────────

export function useSpeechInput(
  onTranscript: (text: string, isFinal: boolean) => void
): UseSpeechInputResult {
  // Rules of hooks: always call both, but only use the relevant one.
  // We work around this by calling the correct one based on Platform.OS at module
  // evaluation time (constant), which is safe.
  const webResult = useWebSpeechInput(onTranscript);
  const nativeResult = useNativeSpeechInput(onTranscript);

  if (Platform.OS === 'web') {
    return webResult;
  }
  return nativeResult;
}
