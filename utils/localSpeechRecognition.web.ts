
/**
 * Web fallback for local speech recognition
 * 
 * Speech recognition is not supported on web in this implementation.
 * The microphone button should be hidden on web platforms.
 */

export async function startSpeechRecognition(
  onSuccess: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  console.warn('[LocalSTT] Speech recognition is not supported on web');
  onError('Voice input is not supported on web. Please use the text input field.');
}

export async function stopSpeechRecognition(): Promise<void> {
  console.warn('[LocalSTT] Speech recognition is not supported on web');
}

export async function transcribeAudioLocally(
  audioUri: string,
  onSuccess: (text: string) => void,
  onError: (error: string) => void
): Promise<void> {
  console.warn('[LocalSTT] Speech recognition is not supported on web');
  onError('Voice input is not supported on web. Please use the text input field.');
}

export function isLocalSTTSupported(): boolean {
  return false;
}

export async function requestSpeechRecognitionPermissions(): Promise<boolean> {
  return false;
}

export async function cleanupSpeechRecognition(): Promise<void> {
  // No-op on web
}
