module.exports = {
  default: {
    configure: () => {},
    setLogLevel: () => {},
    getCustomerInfo: async () => ({ entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' }),
    logIn: async () => ({ customerInfo: { entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' } }),
    logOut: async () => ({ customerInfo: { entitlements: { active: {}, all: {} }, originalAppUserId: '$RCAnonymousID:stub' } }),
    purchasePackage: async () => ({}),
    restorePurchases: async () => ({ entitlements: { active: {} } }),
    addCustomerInfoUpdateListener: () => {},
    removeCustomerInfoUpdateListener: () => {},
    setEmail: async () => {},
    setDisplayName: async () => {},
    getOfferings: async () => ({ current: null, all: {} }),
    LOG_LEVEL: { DEBUG: 'DEBUG', VERBOSE: 'VERBOSE', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
  },
  LOG_LEVEL: { DEBUG: 'DEBUG', VERBOSE: 'VERBOSE', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
};
