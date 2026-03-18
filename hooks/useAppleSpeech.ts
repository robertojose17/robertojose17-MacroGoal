import { useState, useEffect, useRef, useCallback } from 'react';
import AppleSpeech from '../modules/apple-speech';

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error';

export function useAppleSpeech(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);
  const onTranscriptRef = useRef(onTranscript);

  // Keep ref in sync so the effect doesn't re-run on every render
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const transcriptSub = AppleSpeech.addListener(
      'onTranscript',
      (event: { text: string; isFinal: boolean }) => {
        console.log('[AppleSpeech] onTranscript:', event.text, 'isFinal:', event.isFinal);
        onTranscriptRef.current(event.text);
      },
    );

    const statusSub = AppleSpeech.addListener(
      'onStatusChange',
      (event: { status: SpeechStatus }) => {
        console.log('[AppleSpeech] onStatusChange:', event.status);
        setStatus(event.status);
      },
    );

    const errorSub = AppleSpeech.addListener(
      'onError',
      (event: { message: string }) => {
        console.log('[AppleSpeech] onError:', event.message);
        setError(event.message);
        setStatus('error');
      },
    );

    listenersRef.current = [transcriptSub, statusSub, errorSub];

    return () => {
      listenersRef.current.forEach(sub => sub.remove());
    };
  }, []);

  const startListening = useCallback(async () => {
    console.log('[AppleSpeech] startListening tapped');
    setError(null);
    try {
      const perms = await AppleSpeech.requestPermissions();
      console.log('[AppleSpeech] permissions:', perms);
      if (!perms.speech || !perms.microphone) {
        const msg = 'Permissions denied. Please enable microphone and speech recognition in Settings.';
        setError(msg);
        setStatus('error');
        return;
      }
      await AppleSpeech.startListening();
    } catch (e: any) {
      const msg = e?.message || 'Failed to start listening';
      console.log('[AppleSpeech] startListening error:', msg);
      setError(msg);
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(async () => {
    console.log('[AppleSpeech] stopListening called');
    try {
      await AppleSpeech.stopListening();
    } catch {
      // ignore
    }
  }, []);

  return { status, error, startListening, stopListening };
}
