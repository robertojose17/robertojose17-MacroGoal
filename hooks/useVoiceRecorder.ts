import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-audio';
import { supabase } from '@/lib/supabase/client';

interface UseVoiceRecorderOptions {
  onTranscription: (text: string) => void;
  onError: (message: string) => void;
}

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: 2, // MPEG_4
    audioEncoder: 3, // AAC
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'aac' as const,
    audioQuality: 127, // MAX
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

export function useVoiceRecorder({ onTranscription, onError }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] startRecording called');
    try {
      setError(null);

      // Request microphone permission
      console.log('[useVoiceRecorder] Requesting microphone permission...');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn('[useVoiceRecorder] Microphone permission denied');
        onError('Microphone permission is required to record audio.');
        return;
      }
      console.log('[useVoiceRecorder] Microphone permission granted');

      // Create and prepare recording
      const recording = new Audio.Recording();
      console.log('[useVoiceRecorder] Preparing to record with options:', RECORDING_OPTIONS);
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      console.log('[useVoiceRecorder] Recording started');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[useVoiceRecorder] Error starting recording:', err);
      setError(message);
      onError('Could not start recording. Please try again.');
    }
  }, [onError]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    console.log('[useVoiceRecorder] stopRecordingAndTranscribe called');
    const recording = recordingRef.current;
    if (!recording) {
      console.warn('[useVoiceRecorder] No active recording to stop');
      return;
    }

    try {
      setIsRecording(false);
      console.log('[useVoiceRecorder] Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      console.log('[useVoiceRecorder] Recording stopped, URI:', uri);

      if (!uri) {
        console.error('[useVoiceRecorder] No URI returned from recording');
        onError('Recording failed — no audio file was created.');
        return;
      }

      // Read file as base64
      setIsTranscribing(true);
      console.log('[useVoiceRecorder] Reading audio file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      console.log('[useVoiceRecorder] Base64 read complete, length:', base64.length);

      // Call transcribe-audio edge function
      console.log('[useVoiceRecorder] Calling transcribe-audio edge function...');
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audio: base64,
          mimeType: 'audio/m4a',
          language: 'en',
        },
      });

      if (fnError) {
        console.error('[useVoiceRecorder] transcribe-audio function error:', fnError);
        onError('Transcription failed. Please try again or type your meal description.');
        return;
      }

      const transcribedText: string = data?.text ?? '';
      const durationMs: number = data?.duration_ms ?? 0;
      console.log('[useVoiceRecorder] Transcription successful:', transcribedText, '| duration_ms:', durationMs);

      if (!transcribedText.trim()) {
        console.warn('[useVoiceRecorder] Empty transcription returned');
        onError('No speech detected. Please try again and speak clearly.');
        return;
      }

      onTranscription(transcribedText.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useVoiceRecorder] Error during stop/transcribe:', err);
      setError(message);
      onError('Transcription failed. Please try again or type your meal description.');
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscription, onError]);

  const cancelRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] cancelRecording called');
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      console.log('[useVoiceRecorder] Recording cancelled');
    } catch (err) {
      console.warn('[useVoiceRecorder] Error cancelling recording:', err);
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecordingAndTranscribe,
    cancelRecording,
  };
}
