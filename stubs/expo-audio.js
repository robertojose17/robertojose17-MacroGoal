// Stub for expo-audio — native module not linked in preview build
const noop = () => {};
const noopAsync = () => Promise.resolve();

const Sound = {
  initializeAsync: noopAsync,
  loadAsync: noopAsync,
  unloadAsync: noopAsync,
  playAsync: noopAsync,
  pauseAsync: noopAsync,
  stopAsync: noopAsync,
  setPositionAsync: noopAsync,
  setVolumeAsync: noopAsync,
  setIsLoopingAsync: noopAsync,
  setRateAsync: noopAsync,
  getStatusAsync: () => Promise.resolve({ isLoaded: false }),
  setOnPlaybackStatusUpdate: noop,
};

const Audio = {
  Sound: {
    createAsync: () => Promise.resolve({ sound: Sound, status: { isLoaded: false } }),
  },
  Recording: function() {
    this.prepareToRecordAsync = noopAsync;
    this.startAsync = noopAsync;
    this.stopAndUnloadAsync = noopAsync;
    this.getURI = () => null;
    this.getStatusAsync = () => Promise.resolve({ isRecording: false });
    this.setOnRecordingStatusUpdate = noop;
  },
  setAudioModeAsync: noopAsync,
  requestPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  getPermissionsAsync: () => Promise.resolve({ granted: false, status: 'denied' }),
  RecordingOptionsPresets: {
    HIGH_QUALITY: {},
    LOW_QUALITY: {},
  },
  AndroidAudioEncoder: {},
  AndroidOutputFormat: {},
  IOSAudioQuality: {},
  IOSOutputFormat: {},
  InterruptionModeAndroid: {},
  InterruptionModeIOS: {},
};

module.exports = Audio;
module.exports.default = Audio;
module.exports.Audio = Audio;
module.exports.useAudioPlayer = () => ({
  play: noop,
  pause: noop,
  remove: noop,
  seekTo: noop,
  setVolume: noop,
  loop: false,
  isLoaded: false,
  playing: false,
  currentTime: 0,
  duration: 0,
});
module.exports.useAudioRecorder = () => ({
  record: noopAsync,
  stop: noopAsync,
  uri: null,
  isRecording: false,
  durationMillis: 0,
  prepareToRecordAsync: noopAsync,
});
module.exports.useAudioPlayerStatus = () => ({ isLoaded: false, playing: false });
module.exports.useAudioRecorderState = () => ({ isRecording: false, durationMillis: 0 });
module.exports.setAudioModeAsync = noopAsync;
module.exports.requestRecordingPermissionsAsync = () => Promise.resolve({ granted: false, status: 'denied' });
module.exports.getRecordingPermissionsAsync = () => Promise.resolve({ granted: false, status: 'denied' });
