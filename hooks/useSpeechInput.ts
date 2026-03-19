import { useState, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';

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

// ─── Web implementation (Web Speech API) ─────────────────────────────────────
function useWebSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const isAvailable =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(
    async (onTranscript: (text: string, isFinal: boolean) => void) => {
      if (!isAvailable) {
        setErrorMessage('Speech recognition is not supported in this browser');
        setState('error');
        return;
      }
      console.log('[useSpeechInput] Web: starting speech recognition');
      onTranscriptRef.current = onTranscript;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        if (final) {
          console.log('[useSpeechInput] Web: final transcript:', final);
          onTranscriptRef.current?.(final, true);
        } else if (interim) {
          console.log('[useSpeechInput] Web: interim transcript:', interim);
          onTranscriptRef.current?.(interim, false);
        }
      };

      recognition.onerror = (e: any) => {
        console.error('[useSpeechInput] Web: speech recognition error:', e.error);
        setErrorMessage(e.error);
        setState('error');
      };

      recognition.onend = () => {
        console.log('[useSpeechInput] Web: speech recognition ended');
        setState('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setState('recording');
    },
    [isAvailable]
  );

  const stopListening = useCallback(async () => {
    console.log('[useSpeechInput] Web: stopping speech recognition');
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
// Uses expo-audio (SDK 54) for recording + ExpoSpeechRecognition for transcription.
// Both modules are lazy-loaded so this file is safe to import on web.
function useNativeSpeechInput(): UseSpeechInputResult {
  const [state, setState] = useState<SpeechInputState>('idle');
  const [isAvailable] = useState(true); // audio recording is always available on native
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<any>(null);
  const onTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const startListening = useCallback(
    async (onTranscript: (text: string, isFinal: boolean) => void) => {
      console.log('[useSpeechInput] Native: startListening called');
      onTranscriptRef.current = onTranscript;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AudioModule = require('expo-audio');

      try {
        // 1. Request microphone permission
        console.log('[useSpeechInput] Native: requesting microphone permission');
        const permResult = await AudioModule.requestRecordingPermissionsAsync();
        console.log('[useSpeechInput] Native: permission result:', permResult);

        if (!permResult.granted) {
          console.warn('[useSpeechInput] Native: microphone permission denied');
          setErrorMessage('Microphone permission denied');
          setState('error');
          Alert.alert(
            'Microphone Permission Required',
            'Please allow microphone access in Settings to use voice input.',
            [{ text: 'OK' }]
          );
          return;
        }

        // 2. Configure audio session for recording (iOS)
        try {
          await AudioModule.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
          console.log('[useSpeechInput] Native: audio mode set for recording');
        } catch (modeErr) {
          console.warn('[useSpeechInput] Native: setAudioModeAsync failed (non-fatal):', modeErr);
        }

        // 3. Create recorder using SDK 54 expo-audio API
        // expo-audio SDK 54 exposes AudioRecorder as a class (imperative API)
        const recordingOptions = {
          android: {
            extension: '.m4a',
            outputFormat: 'mpeg4',
            audioEncoder: 'aac',
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: 'mpeg4AAC',
            audioQuality: 96,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        };

        // Try SDK 54 hook-based recorder first, fall back to legacy Recording class
        let recorder: any = null;

        if (AudioModule.RecordingPresets?.HIGH_QUALITY) {
          // Use HIGH_QUALITY preset if available
          const preset = AudioModule.RecordingPresets.HIGH_QUALITY;
          if (AudioModule.AudioRecorder) {
            recorder = new AudioModule.AudioRecorder(preset);
          } else if (AudioModule.Recording) {
            recorder = new AudioModule.Recording();
            await recorder.prepareToRecordAsync(preset);
            await recorder.startAsync();
            recorderRef.current = recorder;
            setState('recording');
            console.log('[useSpeechInput] Native: recording started (legacy API)');
            return;
          }
        }

        if (!recorder && AudioModule.Recording) {
          // Legacy expo-av style Recording class
          recorder = new AudioModule.Recording();
          await recorder.prepareToRecordAsync(recordingOptions);
          await recorder.startAsync();
          recorderRef.current = recorder;
          setState('recording');
          console.log('[useSpeechInput] Native: recording started (legacy Recording)');
          return;
        }

        if (recorder && typeof recorder.prepareToRecordAsync === 'function') {
          await recorder.prepareToRecordAsync();
          if (typeof recorder.record === 'function') {
            await recorder.record();
          } else if (typeof recorder.startAsync === 'function') {
            await recorder.startAsync();
          }
          recorderRef.current = recorder;
          setState('recording');
          console.log('[useSpeechInput] Native: recording started');
        } else {
          throw new Error('No compatible recorder API found in expo-audio');
        }
      } catch (e: any) {
        console.error('[useSpeechInput] Native: error starting recording:', e);
        setErrorMessage(e?.message ?? 'Failed to start recording');
        setState('error');
      }
    },
    []
  );

  const stopListening = useCallback(async () => {
    console.log('[useSpeechInput] Native: stopListening called');
    const recorder = recorderRef.current;
    if (!recorder) {
      console.warn('[useSpeechInput] Native: no active recorder');
      setState('idle');
      return;
    }

    setState('processing');
    recorderRef.current = null;

    try {
      // Stop recording and get URI
      let uri: string | null = null;

      if (typeof recorder.stop === 'function') {
        // SDK 54 AudioRecorder API
        await recorder.stop();
        uri = recorder.uri ?? null;
        console.log('[useSpeechInput] Native: recording stopped (SDK 54), URI:', uri);
      } else if (typeof recorder.stopAndUnloadAsync === 'function') {
        // Legacy Recording API
        await recorder.stopAndUnloadAsync();
        uri = recorder.getURI?.() ?? null;
        console.log('[useSpeechInput] Native: recording stopped (legacy), URI:', uri);
      }

      // Reset audio session
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AudioModule = require('expo-audio');
        await AudioModule.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {
        // Non-fatal
      }

      if (!uri) {
        console.warn('[useSpeechInput] Native: no audio URI after recording');
        setState('idle');
        return;
      }

      // Attempt transcription via ExpoSpeechRecognition native module
      let transcribed = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SpeechModule = require('../modules/expo-speech-recognition/src/index');
        const available = await SpeechModule.isAvailableAsync();
        console.log('[useSpeechInput] Native: speech recognition available:', available);

        if (available) {
          // Request speech recognition permission (iOS needs SFSpeechRecognizer auth)
          const speechPerm = await SpeechModule.requestPermissionsAsync();
          console.log('[useSpeechInput] Native: speech permission:', speechPerm);

          if (speechPerm.granted) {
            console.log('[useSpeechInput] Native: transcribing URI:', uri);
            const result = await SpeechModule.transcribeAsync(uri, 'en-US');
            if (result?.text) {
              console.log('[useSpeechInput] Native: transcription:', result.text);
              onTranscriptRef.current?.(result.text, true);
              transcribed = true;
            } else {
              console.warn('[useSpeechInput] Native: empty transcription result');
            }
          } else {
            console.warn('[useSpeechInput] Native: speech recognition permission denied');
          }
        }
      } catch (transcribeErr) {
        console.warn('[useSpeechInput] Native: transcription error:', transcribeErr);
      }

      if (!transcribed) {
        console.warn('[useSpeechInput] Native: speech-to-text unavailable on this build');
        Alert.alert(
          'Voice Input Unavailable',
          'Speech-to-text requires a custom native build. Please type your meal description instead.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      console.error('[useSpeechInput] Native: error stopping recording:', e);
      setErrorMessage(e?.message ?? 'Failed to process recording');
      setState('error');
      return;
    }

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

// ─── Public hook ─────────────────────────────────────────────────────────────
export function useSpeechInput(): UseSpeechInputResult {
  const web = useWebSpeechInput();
  const native = useNativeSpeechInput();
  return Platform.OS === 'web' ? web : native;
}
