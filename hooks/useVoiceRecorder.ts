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
    console.log('[useVoiceRecorder] startRecording called');
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[useVoiceRecorder] microphone permission status:', status.granted);
      if (!status.granted) {
        onError('Se necesita permiso de micrófono para grabar audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      console.log('[useVoiceRecorder] recording started');
    } catch (err) {
      console.log('[useVoiceRecorder] startRecording error:', err);
      onError('No se pudo iniciar la grabación. Intenta de nuevo.');
    }
  }, [recorder, onError]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    console.log('[useVoiceRecorder] stopRecordingAndTranscribe called, isRecording:', isRecording);
    if (!isRecording) return;
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;
      console.log('[useVoiceRecorder] recording stopped, uri:', uri);
      if (!uri) {
        onError('La grabación falló — no se creó ningún archivo de audio.');
        return;
      }
      setIsTranscribing(true);
      console.log('[useVoiceRecorder] reading audio file as base64');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[useVoiceRecorder] invoking transcribe-audio edge function');
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioBase64: base64, mimeType: 'audio/m4a' },
      });
      console.log('[useVoiceRecorder] transcribe-audio response:', { data, fnError });
      if (fnError || !data?.text) {
        onError('La transcripción falló. Intenta de nuevo o escribe tu descripción.');
        return;
      }
      const text: string = data.text.trim();
      if (!text) {
        onError('No se detectó voz. Intenta de nuevo y habla claramente.');
        return;
      }
      console.log('[useVoiceRecorder] transcription result:', text);
      onTranscription(text);
    } catch (err) {
      console.log('[useVoiceRecorder] stopRecordingAndTranscribe error:', err);
      onError('La transcripción falló. Intenta de nuevo.');
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, recorder, onTranscription, onError]);

  const cancelRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] cancelRecording called, isRecording:', isRecording);
    if (!isRecording) return;
    try {
      await recorder.stop();
      console.log('[useVoiceRecorder] recording cancelled');
    } catch (err) {
      // ignore
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, [isRecording, recorder]);

  return { isRecording, isTranscribing, startRecording, stopRecordingAndTranscribe, cancelRecording };
}
