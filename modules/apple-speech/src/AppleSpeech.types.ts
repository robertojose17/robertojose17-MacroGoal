export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error';

export type AppleSpeechModuleType = {
  requestPermissions(): Promise<{ speech: boolean; microphone: boolean }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  addListener(eventName: string, listener: (event: any) => void): { remove: () => void };
};
