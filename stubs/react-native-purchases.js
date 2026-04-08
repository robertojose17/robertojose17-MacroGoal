// Stub for react-native-purchases — used by Metro extraNodeModules when the
// real native module is not linked. Matches the shape expected by both
// default imports and named imports. ZERO re-exports of the real package.
'use strict';

const stub = {
  configure: function() {},
  setLogLevel: function() {},
  getCustomerInfo: async function() {
    return { entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' };
  },
  logIn: async function() {
    return { customerInfo: { entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' } };
  },
  logOut: async function() {
    return { customerInfo: { entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' } };
  },
  purchasePackage: async function() { return {}; },
  restorePurchases: async function() { return { entitlements: { active: {} } }; },
  addCustomerInfoUpdateListener: function() {},
  removeCustomerInfoUpdateListener: function() {},
  setEmail: async function() {},
  setDisplayName: async function() {},
  getOfferings: async function() { return { current: null, all: {} }; },
};

const LOG_LEVEL = {
  DEBUG: 'DEBUG',
  VERBOSE: 'VERBOSE',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

module.exports = {
  default: stub,
  Purchases: stub,
  LOG_LEVEL: LOG_LEVEL,
  isPurchasesAvailable: false,
};
// Also spread stub methods at top level for named imports
Object.assign(module.exports, stub);
