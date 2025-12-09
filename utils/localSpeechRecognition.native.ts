
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Native implementation of local speech recognition for iOS and Android
 * 
 * CURRENT IMPLEMENTATION:
 * This is a working placeholder that provides clear user feedback.
 * The microphone records audio successfully, but transcription requires
 * a native module or third-party service.
 * 
 * RECOMMENDED PRODUCTION SOLUTIONS:
 * 
 * Option A: Native Module (Best for privacy, works offline)
 * - Create expo-modules-core native module
 * - iOS: Use Speech framework (SFSpeechRecognizer)
 * - Android: Use SpeechRecognizer API
 * - Pros: Fully local, no API costs, works offline
 * - Cons: Requires native development, more complex
 * 
 * Option B: Self-hosted Whisper API (Good balance)
 * - Deploy OpenAI Whisper on your own server
 * - Use whisper.cpp for efficient inference
 * - Pros: Good accuracy, you control the data
 * - Cons: Requires server infrastructure
 * 
 * Option C: React Native Voice (Quick solution)
 * - Use @react-native-voice/voice library
 * - Pros: Easy to integrate, works well
 * - Cons: Requires native build, not pure Expo
 * 
 * For now, this implementation guides users to use text or photo input.
 */

export async function transcribeAudioLocally(
  audioUri: string,
  onSuccess: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  console.log('[LocalSTT] Starting local transcription');
  console.log('[LocalSTT] Platform:', Platform.OS);
  console.log('[LocalSTT] Audio URI:', audioUri);

  try {
    // Verify the audio file exists and has content
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    
    if (!fileInfo.exists) {
      console.error('[LocalSTT] Audio file does not exist');
      onError('Audio file not found. Please try recording again.');
      return;
    }

    console.log('[LocalSTT] Audio file size:', fileInfo.size, 'bytes');

    // Check if file is too small (likely empty or corrupted)
    if (fileInfo.size < 1000) {
      console.error('[LocalSTT] Audio file too small');
      onError('Recording is too short. Please speak for at least 1 second.');
      return;
    }

    // Simulate processing time to show the "Transcribing..." indicator
    console.log('[LocalSTT] Simulating transcription process...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Provide clear feedback to the user
    console.log('[LocalSTT] Local STT not yet implemented');
    console.log('[LocalSTT] Audio was recorded successfully at:', audioUri);
    console.log('[LocalSTT] File size:', fileInfo.size, 'bytes');
    
    // Return a helpful error message
    onError(
      'Voice transcription is not yet available. ' +
      'Please type your meal description or take a photo instead. ' +
      'Your audio was recorded successfully but requires a transcription service to convert to text.'
    );

    // TODO: Implement one of the production solutions above
    // Example implementation with a native module:
    //
    // import { NativeSpeechRecognition } from './NativeSpeechRecognition';
    // 
    // const result = await NativeSpeechRecognition.transcribe({
    //   audioUri: audioUri,
    //   language: 'en-US',
    //   maxDuration: 60,
    // });
    // 
    // if (result.success) {
    //   console.log('[LocalSTT] Transcription successful:', result.text);
    //   onSuccess(result.text);
    // } else {
    //   console.error('[LocalSTT] Transcription failed:', result.error);
    //   onError('Could not transcribe audio. Please try again.');
    // }

  } catch (error: any) {
    console.error('[LocalSTT] Error during transcription:', error);
    onError('Failed to process audio. Please try again.');
  }
}

/**
 * Check if local STT is supported on this device
 */
export function isLocalSTTSupported(): boolean {
  // Return true once native module is implemented
  // For now, return false to indicate it's not yet available
  return false;
}

/**
 * Request speech recognition permissions
 */
export async function requestSpeechRecognitionPermissions(): Promise<boolean> {
  console.log('[LocalSTT] Checking speech recognition permissions');
  
  // On iOS, speech recognition requires SFSpeechRecognizer permission
  // On Android, it uses the RECORD_AUDIO permission (already handled by expo-audio)
  
  // For now, we rely on the microphone permission from expo-audio
  // Once native module is implemented, add platform-specific permission requests here
  
  if (Platform.OS === 'ios') {
    // TODO: Request iOS speech recognition permission
    // import { NativeSpeechRecognition } from './NativeSpeechRecognition';
    // const granted = await NativeSpeechRecognition.requestPermission();
    // return granted;
  }
  
  return true;
}
