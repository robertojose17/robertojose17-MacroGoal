'use strict';
// Stub for expo-in-app-purchases — this package is still in package.json but
// the app has migrated to react-native-purchases (RevenueCat). This stub
// prevents Metro from bundling the real native module in Expo Go.

module.exports = {
  default: {},
  connectAsync: async function() {},
  disconnectAsync: async function() {},
  getProductsAsync: async function() { return { responseCode: 0, results: [] }; },
  purchaseItemAsync: async function() { return {}; },
  getBillingResponseCodeAsync: async function() { return 0; },
  finishTransactionAsync: async function() {},
  setPurchaseListener: function() {},
  IAPResponseCode: {
    OK: 0,
    USER_CANCELED: 1,
    ERROR: 2,
    DEFERRED: 3,
  },
  IAPItemType: {
    PURCHASE: 'inapp',
    SUBSCRIPTION: 'subs',
  },
};
