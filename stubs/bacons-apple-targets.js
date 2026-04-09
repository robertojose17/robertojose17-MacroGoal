'use strict';
// Stub for @bacons/apple-targets — the real package calls into native iOS
// extension APIs that are not available in Expo Go. Metro must never bundle
// the real package; this stub is wired via extraNodeModules in metro.config.js.

module.exports = {
  default: {},
  ExtensionStorage: {
    reloadWidget: function() {},
    getItem: function() { return null; },
    setItem: function() {},
    removeItem: function() {},
  },
};
