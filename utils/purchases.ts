const Purchases = {
  configure: (_options: any) => {},
  setLogLevel: (_level: any) => {},
  getCustomerInfo: async () => ({
    entitlements: { active: {}, all: {} },
    originalAppUserId: '$RCAnonymousID:stub',
  }),
  logIn: async (_userId: string) => ({
    customerInfo: {
      entitlements: { active: {}, all: {} },
      originalAppUserId: '$RCAnonymousID:stub',
    },
  }),
  logOut: async () => ({
    customerInfo: {
      entitlements: { active: {}, all: {} },
      originalAppUserId: '$RCAnonymousID:stub',
    },
  }),
  purchasePackage: async (_pkg: any) => ({}),
  restorePurchases: async () => ({ entitlements: { active: {} } }),
  addCustomerInfoUpdateListener: (_listener: any) => {},
  removeCustomerInfoUpdateListener: (_listener: any) => {},
  setEmail: async (_email: string) => {},
  setDisplayName: async (_name: string) => {},
  getOfferings: async () => ({ current: null, all: {} }),
};

export default Purchases;

export const LOG_LEVEL = {
  DEBUG: 'DEBUG',
  VERBOSE: 'VERBOSE',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

export const isPurchasesAvailable = false;
