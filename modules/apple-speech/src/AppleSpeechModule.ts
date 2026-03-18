import { requireNativeModule, EventEmitter } from 'expo-modules-core';

const AppleSpeechNative = requireNativeModule('AppleSpeech');
const emitter = new EventEmitter(AppleSpeechNative);

export default {
  requestPermissions: (): Promise<{ speech: boolean; microphone: boolean }> =>
    AppleSpeechNative.requestPermissions(),
  startListening: (): Promise<void> => AppleSpeechNative.startListening(),
  stopListening: (): Promise<void> => AppleSpeechNative.stopListening(),
  addListener: (eventName: string, listener: (event: any) => void) =>
    emitter.addListener(eventName, listener),
};
