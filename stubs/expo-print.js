// Stub for expo-print — native module not linked in preview build
module.exports = {
  default: {},
  printAsync: () => Promise.resolve(),
  printToFileAsync: () => Promise.resolve({ uri: '' }),
  selectPrinterAsync: () => Promise.resolve(null),
  OrientationConstant: { PORTRAIT: 1, LANDSCAPE: 2 },
};
