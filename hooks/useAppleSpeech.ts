import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

// Only import Voice on native platforms
let Voice: any = null;
if (Platform.OS !== 'web') {
  try {
    Voice = require('@react-native-voice/voice').default;
  } catch (e) {
    console.warn('[useAppleSpeech] Failed to load @react-native-voice/voice:', e);
  }
}

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseAppleSpeechResult {
  speechState: SpeechState;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  cancelListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useAppleSpeech(): UseAppleSpeechResult {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!Voice || Platform.OS !== 'ios') {
      return;
    }

    const onSpeechStart = () => {
      console.log('[useAppleSpeech] Speech recognition started');
      if (isMountedRef.current) {
        setSpeechState('listening');
        setError(null);
      }
    };

    const onSpeechEnd = () => {
      console.log('[useAppleSpeech] Speech recognition ended');
      if (isMountedRef.current) {
        setSpeechState('processing');
      }
    };

    const onSpeechResults = (e: any) => {
      const results: string[] = e?.value ?? [];
      const best = results[0] ?? '';
      console.log('[useAppleSpeech] Speech results received:', results);
      if (isMountedRef.current) {
        setTranscript(best);
        setSpeechState('idle');
      }
    };

    const onSpeechPartialResults = (e: any) => {
      const results: string[] = e?.value ?? [];
      const partial = results[0] ?? '';
      console.log('[useAppleSpeech] Partial results:', partial);
      if (isMountedRef.current && partial) {
        setTranscript(partial);
      }
    };

    const onSpeechError = (e: any) => {
      const msg: string = e?.error?.message ?? e?.error ?? 'Speech recognition error';
      console.error('[useAppleSpeech] Speech error:', msg);
      if (isMountedRef.current) {
        // "recognition request was canceled" is not a real error (user stopped)
        if (msg.includes('cancel') || msg.includes('Cancel') || msg.includes('7/No match')) {
          setSpeechState('idle');
        } else {
          setError(msg);
          setSpeechState('error');
        }
      }
    };

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      isMountedRef.current = false;
      Voice.onSpeechStart = null;
      Voice.onSpeechEnd = null;
      Voice.onSpeechResults = null;
      Voice.onSpeechPartialResults = null;
      Voice.onSpeechError = null;
      Voice.destroy().catch(() => {});
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!Voice || Platform.OS !== 'ios') {
      console.warn('[useAppleSpeech] Voice not available on this platform');
      return;
    }

    console.log('[useAppleSpeech] startListening called');
    try {
      setTranscript('');
      setError(null);
      setSpeechState('listening');
      await Voice.start('en-US');
      console.log('[useAppleSpeech] Voice.start() called successfully');
    } catch (e: any) {
      console.error('[useAppleSpeech] Error starting voice recognition:', e);
      setSpeechState('error');
      setError(e?.message ?? 'Failed to start voice recognition');
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!Voice || Platform.OS !== 'ios') return;

    console.log('[useAppleSpeech] stopListening called');
    try {
      await Voice.stop();
      setSpeechState('processing');
    } catch (e: any) {
      console.error('[useAppleSpeech] Error stopping voice recognition:', e);
      setSpeechState('idle');
    }
  }, []);

  const cancelListening = useCallback(async () => {
    if (!Voice || Platform.OS !== 'ios') return;

    console.log('[useAppleSpeech] cancelListening called');
    try {
      await Voice.cancel();
      setSpeechState('idle');
      setTranscript('');
    } catch (e: any) {
      console.error('[useAppleSpeech] Error canceling voice recognition:', e);
      setSpeechState('idle');
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setSpeechState('idle');
  }, []);

  return {
    speechState,
    isListening: speechState === 'listening',
    transcript,
    error,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
}
