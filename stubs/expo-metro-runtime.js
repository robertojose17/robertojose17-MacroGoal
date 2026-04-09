'use strict';
// Stub for @expo/metro-runtime
//
// The real package's src/index.ts does three things in __DEV__:
//   1. import './location/install'  — sets up window.location + fetch polyfill (NEEDED)
//   2. captureStackForServerLogs()  — patches HMRClient.log (safe, but pulls in HMRClient)
//   3. enablePromiseRejectionTracking() — safe
//
// The problem: install.native.ts imports 'react-native/Libraries/Core/InitializeCore'
// which in turn triggers HMRClient.setup(), which calls new MetroHMRClient(url + '/hot')
// and opens a WebSocket. In Expo Go's embedded environment this throws:
//   "Cannot create devtools websocket connections in embedded environments"
// ...crashing module evaluation before AppRegistry.registerComponent runs.
//
// This stub replicates ONLY the fetch polyfill side-effect that expo-router needs,
// without touching HMRClient or InitializeCore.

// wrapFetchWithWindowLocation — used by expo-router to polyfill relative URLs.
// We install it directly on global.fetch here, matching what install.native.ts does.
var polyfillSymbol = typeof Symbol !== 'undefined'
  ? Symbol.for('expo.polyfillFetchWithWindowLocation')
  : '__expo_polyfillFetch';

function wrapFetchWithWindowLocation(fetchFn) {
  if (fetchFn && fetchFn[polyfillSymbol]) {
    return fetchFn;
  }
  var _fetch = function() {
    var props = Array.prototype.slice.call(arguments);
    if (props[0] && typeof props[0] === 'string' && props[0].charAt(0) === '/') {
      var origin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? window.location.origin
        : 'http://localhost:8081';
      props[0] = origin + props[0];
    }
    return fetchFn.apply(this, props);
  };
  _fetch[polyfillSymbol] = true;
  return _fetch;
}

// Install the fetch polyfill (mirrors install.native.ts lines 95-98)
if (typeof global !== 'undefined' && typeof global.fetch === 'function') {
  try {
    Object.defineProperty(global, 'fetch', {
      value: wrapFetchWithWindowLocation(global.fetch),
      configurable: true,
      writable: true,
    });
  } catch (e) {
    // If defineProperty fails (already non-configurable), skip silently
  }
}

module.exports = {
  wrapFetchWithWindowLocation: wrapFetchWithWindowLocation,
};
