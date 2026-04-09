// Stub for expo-file-system — native module not linked in preview build
const noopAsync = () => Promise.resolve();

module.exports = {
  default: {},
  documentDirectory: 'file:///document/',
  cacheDirectory: 'file:///cache/',
  bundleDirectory: 'file:///bundle/',
  downloadAsync: () => Promise.resolve({ uri: '', status: 200, headers: {}, md5: '' }),
  uploadAsync: () => Promise.resolve({ status: 200, headers: {}, body: '' }),
  getInfoAsync: () => Promise.resolve({ exists: false, isDirectory: false, uri: '', size: 0, modificationTime: 0 }),
  readAsStringAsync: () => Promise.resolve(''),
  writeAsStringAsync: noopAsync,
  deleteAsync: noopAsync,
  moveAsync: noopAsync,
  copyAsync: noopAsync,
  makeDirectoryAsync: noopAsync,
  readDirectoryAsync: () => Promise.resolve([]),
  createDownloadResumable: () => ({
    downloadAsync: () => Promise.resolve(null),
    pauseAsync: noopAsync,
    resumeAsync: () => Promise.resolve(null),
    savable: () => ({}),
  }),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  FileSystemUploadType: { BINARY_CONTENT: 0, MULTIPART: 1 },
};
