
import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

/**
 * Native implementation of local speech recognition for iOS and Android
 * 
 * This implementation uses @react-native-voice/voice which provides:
 * - iOS: Speech framework (SFSpeechRecognizer)
 * - Android: SpeechRecognizer API
 * 
 * ADVANTAGES:
 * - Real-time speech recognition (no file recording needed)
 * - Works reliably on both iOS and Android
 * - Free and on-device
 * - No API keys required
 * 
 * SETUP:
 * 1. Install: npm install @react-native-voice/voice
 * 2. iOS: Add to Info.plist:
 *    <key>NSSpeechRecognitionUsageDescription</key>
 *    <string>We need access to speech recognition to transcribe your voice input</string>
 *    <key>NSMicrophoneUsageDescription</key>
 *    <string>We need access to your microphone to record audio</string>
 * 3. Android: Permissions are automatically handled
 * 4. Build: npx expo run:ios or npx expo run:android
 */

let isListening = false;
let currentOnSuccess: ((text: string) => void) | null = null;
let currentOnError: ((error: string) => void) | null = null;
let recognizedText = '';

// Set up Voice event listeners
Voice.onSpeechStart = () => {
  console.log('[LocalSTT] Speech recognition started');
  recognizedText = '';
};

Voice.onSpeechEnd = () => {
  console.log('[LocalSTT] Speech recognition ended');
};

Voice.onSpeechResults = (event: any) => {
  console.log('[LocalSTT] Speech results:', event.value);
  
  if (event.value && event.value.length > 0) {
    recognizedText = event.value[0];
    console.log('[LocalSTT] ✅ Recognized text:', recognizedText);
  }
};

Voice.onSpeechError = (event: any) => {
  console.error('[LocalSTT] Speech error:', event.error);
  
  // Handle specific error codes
  let errorMessage = 'Could not transcribe. Please try again.';
  
  if (event.error?.code === '7' || event.error?.message?.includes('No speech')) {
    errorMessage = 'No speech detected. Please speak clearly and try again.';
  } else if (event.error?.code === '9' || event.error?.message?.includes('Insufficient permissions')) {
    errorMessage = 'Microphone permission is required. Please enable it in Settings.';
  } else if (event.error?.code === '5' || event.error?.message?.includes('Client')) {
    errorMessage = 'Speech recognition is busy. Please try again.';
  } else if (event.error?.code === '8' || event.error?.message?.includes('Busy')) {
    errorMessage = 'Speech recognition is busy. Please try again in a moment.';
  } else if (event.error?.message) {
    errorMessage = `Error: ${event.error.message}`;
  }
  
  if (currentOnError) {
    currentOnError(errorMessage);
    currentOnError = null;
  }
  
  isListening = false;
};

/**
 * Start real-time speech recognition
 * This replaces the file-based approach with direct speech-to-text
 */
export async function startSpeechRecognition(
  onSuccess: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  console.log('[LocalSTT] Starting real-time speech recognition');
  console.log('[LocalSTT] Platform:', Platform.OS);

  try {
    // Store callbacks
    currentOnSuccess = onSuccess;
    currentOnError = onError;
    recognizedText = '';

    // Check if speech recognition is available
    const available = await Voice.isAvailable();
    if (!available) {
      console.error('[LocalSTT] Speech recognition not available');
      onError('Speech recognition is not available on this device.');
      return;
    }

    // Stop any existing recognition
    if (isListening) {
      await Voice.stop();
      await Voice.destroy();
    }

    // Start listening
    console.log('[LocalSTT] Starting Voice.start()...');
    await Voice.start('en-US');
    isListening = true;
    
    console.log('[LocalSTT] ✅ Speech recognition started successfully');
    console.log('[LocalSTT] Speak now...');

  } catch (error: any) {
    console.error('[LocalSTT] Error starting speech recognition:', error);
    
    let errorMessage = 'Failed to start speech recognition. Please try again.';
    
    if (error.message?.includes('permissions')) {
      errorMessage = 'Microphone permission is required. Please enable it in Settings.';
    } else if (error.message?.includes('busy')) {
      errorMessage = 'Speech recognition is busy. Please try again in a moment.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    onError(errorMessage);
    isListening = false;
  }
}

/**
 * Stop speech recognition and return the recognized text
 */
export async function stopSpeechRecognition(): Promise<void> {
  console.log('[LocalSTT] Stopping speech recognition');
  
  try {
    if (!isListening) {
      console.warn('[LocalSTT] Not currently listening');
      return;
    }

    await Voice.stop();
    isListening = false;

    // Wait a moment for final results
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[LocalSTT] Final recognized text:', recognizedText);

    if (recognizedText && currentOnSuccess) {
      currentOnSuccess(recognizedText);
    } else if (currentOnError) {
      currentOnError('No speech detected. Please try again.');
    }

    // Clean up
    currentOnSuccess = null;
    currentOnError = null;
    recognizedText = '';

  } catch (error: any) {
    console.error('[LocalSTT] Error stopping speech recognition:', error);
    
    if (currentOnError) {
      currentOnError('Failed to stop recording. Please try again.');
    }
    
    isListening = false;
  }
}

/**
 * Legacy function for compatibility - now uses real-time recognition
 * @deprecated Use startSpeechRecognition and stopSpeechRecognition instead
 */
export async function transcribeAudioLocally(
  audioUri: string,
  onSuccess: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  console.log('[LocalSTT] transcribeAudioLocally called (legacy)');
  console.log('[LocalSTT] This function is deprecated. Use startSpeechRecognition instead.');
  
  // For backward compatibility, just show an error
  onError('Please use the microphone button to record your voice in real-time.');
}

/**
 * Check if local STT is supported on this device
 */
export function isLocalSTTSupported(): boolean {
  // Voice library works on both iOS and Android
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Request speech recognition permissions
 */
export async function requestSpeechRecognitionPermissions(): Promise<boolean> {
  console.log('[LocalSTT] Checking speech recognition permissions');
  
  try {
    // Voice library handles permissions automatically when starting
    const available = await Voice.isAvailable();
    return available === 1 || available === true;
  } catch (error) {
    console.error('[LocalSTT] Error checking permissions:', error);
    return false;
  }
}

/**
 * Clean up Voice resources
 */
export async function cleanupSpeechRecognition(): Promise<void> {
  try {
    if (isListening) {
      await Voice.stop();
    }
    await Voice.destroy();
    isListening = false;
    currentOnSuccess = null;
    currentOnError = null;
    recognizedText = '';
    console.log('[LocalSTT] Cleanup complete');
  } catch (error) {
    console.error('[LocalSTT] Error during cleanup:', error);
  }
}
