import { useState, useCallback } from 'react';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase/client';

interface UseVoiceRecorderOptions {
  onTranscription: (text: string) => void;
  onError: (message: string) => void;
}

export function useVoiceRecorder({ onTranscription, onError }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // useAudioRecorder must be called at hook top level
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] startRecording called');
    try {
      // Request permissions
      console.log('[useVoiceRecorder] Requesting microphone permission...');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        console.warn('[useVoiceRecorder] Microphone permission denied');
        onError('Microphone permission is required to record audio.');
        return;
      }
      console.log('[useVoiceRecorder] Microphone permission granted');

      // Set audio mode for recording
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      // Prepare and start
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      console.log('[useVoiceRecorder] Recording started');
    } catch (err) {
      console.error('[useVoiceRecorder] Error starting recording:', err);
      onError('Could not start recording. Please try again.');
    }
  }, [recorder, onError]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    console.log('[useVoiceRecorder] stopRecordingAndTranscribe called');
    if (!isRecording) {
      console.warn('[useVoiceRecorder] No active recording to stop');
      return;
    }
    try {
      setIsRecording(false);
      console.log('[useVoiceRecorder] Stopping recording...');
      await recorder.stop();
      const uri = recorder.uri;
      console.log('[useVoiceRecorder] Recording stopped, URI:', uri);

      if (!uri) {
        console.error('[useVoiceRecorder] No URI returned from recording');
        onError('Recording failed — no audio file was created.');
        return;
      }

      setIsTranscribing(true);

      // Read as base64 using legacy FileSystem API
      console.log('[useVoiceRecorder] Reading audio file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[useVoiceRecorder] Base64 read complete, length:', base64.length);

      // Call transcribe-audio edge function
      console.log('[useVoiceRecorder] Calling transcribe-audio edge function...');
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64, mimeType: 'audio/m4a', language: 'en' },
      });

      if (fnError || !data?.text) {
        console.error('[useVoiceRecorder] transcribe-audio function error:', fnError);
        onError('Transcription failed. Please try again or type your meal description.');
        return;
      }

      const text: string = data.text.trim();
      console.log('[useVoiceRecorder] Transcription successful:', text);

      if (!text) {
        console.warn('[useVoiceRecorder] Empty transcription returned');
        onError('No speech detected. Please try again and speak clearly.');
        return;
      }

      onTranscription(text);
    } catch (err) {
      console.error('[useVoiceRecorder] Error during stop/transcribe:', err);
      onError('Transcription failed. Please try again or type your meal description.');
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, recorder, onTranscription, onError]);

  const cancelRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] cancelRecording called');
    if (!isRecording) return;
    try {
      await recorder.stop();
      console.log('[useVoiceRecorder] Recording cancelled');
    } catch (err) {
      console.warn('[useVoiceRecorder] Error cancelling recording:', err);
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, [isRecording, recorder]);

  return { isRecording, isTranscribing, startRecording, stopRecordingAndTranscribe, cancelRecording };
}
