import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

export type SpeechInputState = 'idle' | 'recording' | 'processing' | 'error';

export interface UseSpeechInputResult {
  isListening: boolean;
  isProcessing: boolean;
  isAvailable: boolean;
  state: SpeechInputState;
  startListening: (onTranscript: (text: string, isFinal: boolean) => void) => Promise<void>;
  stopListening: () => Promise<void>;
  errorMessage: string | null;
}

// ─── Web implementation ───────────────────────────────────────────────────────
function useWebSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const isAvailable =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(async (onTranscript: (text: string, isFinal: boolean) => void) => {
    if (!isAvailable) return;
    onTranscriptRef.current = onTranscript;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) onTranscriptRef.current?.(final, true);
      else if (interim) onTranscriptRef.current?.(interim, false);
    };
    recognition.onerror = (e: any) => {
      setErrorMessage(e.error);
      setState('error');
    };
    recognition.onend = () => setState('idle');
    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
  }, [isAvailable]);

  const stopListening = useCallback(async () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  return {
    isListening: state === 'recording',
    isProcessing: state === 'processing',
    isAvailable,
    state,
    startListening,
    stopListening,
    errorMessage,
  };
}

// ─── Native implementation (iOS / Android) ───────────────────────────────────
function useNativeSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [isAvailable, setIsAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordingRef = useRef<any>(null);
  const onTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);
  const AudioModule = useRef<any>(null);
  const SpeechModule = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      // expo-audio replaces expo-av in SDK 54
      AudioModule.current = require('expo-audio');
      SpeechModule.current = require('../modules/expo-speech-recognition/src/index');
      SpeechModule.current.isAvailableAsync?.().then((available: boolean) => {
        setIsAvailable(available);
      }).catch(() => setIsAvailable(false));
    } catch {
      setIsAvailable(false);
    }
  }, []);

  const startListening = useCallback(async (onTranscript: (text: string, isFinal: boolean) => void) => {
    if (!AudioModule.current) return;
    onTranscriptRef.current = onTranscript;
    try {
      const { requestRecordingPermissionsAsync, RecordingPresets, Recording } = AudioModule.current;
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setErrorMessage('Microphone permission denied');
        setState('error');
        return;
      }
      const recording = new Recording();
      await recording.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setState('recording');
    } catch (e: any) {
      setErrorMessage(e.message);
      setState('error');
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!recordingRef.current) return;
    setState('processing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri && SpeechModule.current) {
        const result = await SpeechModule.current.transcribeAsync(uri, 'en-US');
        if (result?.text) {
          onTranscriptRef.current?.(result.text, true);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setState('error');
    } finally {
      setState('idle');
    }
  }, []);

  return {
    isListening: state === 'recording',
    isProcessing: state === 'processing',
    isAvailable,
    state,
    startListening,
    stopListening,
    errorMessage,
  };
}

// ─── Public hook ─────────────────────────────────────────────────────────────
export function useSpeechInput(): UseSpeechInputResult {
  const web = useWebSpeechInput();
  const native = useNativeSpeechInput();
  return Platform.OS === 'web' ? web : native;
}
