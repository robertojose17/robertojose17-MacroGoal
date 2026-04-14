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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = useCallback(async () => {
    try {
      console.log('[useVoiceRecorder] Requesting microphone permission');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        onError('Se necesita permiso de micrófono para grabar audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      console.log('[useVoiceRecorder] Recording started');
      setIsRecording(true);
    } catch (err) {
      console.error('[useVoiceRecorder] Error starting recording:', err);
      onError('No se pudo iniciar la grabación. Intenta de nuevo.');
    }
  }, [recorder, onError]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (!isRecording) return;
    try {
      setIsRecording(false);
      console.log('[useVoiceRecorder] Stopping recording');
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        onError('La grabación falló — no se creó ningún archivo de audio.');
        return;
      }

      console.log('[useVoiceRecorder] Recording stopped, uri:', uri);
      setIsTranscribing(true);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[useVoiceRecorder] Invoking transcribe-audio edge function');
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioBase64: base64, mimeType: 'audio/m4a', language: 'es' },
      });

      if (fnError || !data?.text) {
        console.error('[useVoiceRecorder] transcribe-audio error:', fnError);
        onError('La transcripción falló. Intenta de nuevo o escribe tu descripción.');
        return;
      }

      const text: string = data.text.trim();
      console.log('[useVoiceRecorder] Transcription received:', text);

      if (!text) {
        onError('No se detectó voz. Intenta de nuevo y habla claramente.');
        return;
      }

      onTranscription(text);
    } catch (err) {
      console.error('[useVoiceRecorder] Error during stop/transcribe:', err);
      onError('La transcripción falló. Intenta de nuevo.');
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, recorder, onTranscription, onError]);

  const cancelRecording = useCallback(async () => {
    if (!isRecording) return;
    try {
      console.log('[useVoiceRecorder] Cancelling recording');
      await recorder.stop();
    } catch (err) {
      console.warn('[useVoiceRecorder] Error cancelling:', err);
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, [isRecording, recorder]);

  return { isRecording, isTranscribing, startRecording, stopRecordingAndTranscribe, cancelRecording };
}
