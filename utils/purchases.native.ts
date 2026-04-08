// Safe no-op stub for react-native-purchases on native.
// ZERO imports — completely self-contained.
// Metro resolves '@/utils/purchases' → this file on iOS/Android via the
// .native.ts extension. This file must NEVER import from './purchases'
// (circular) or from 'react-native-purchases' (native module not linked).

const Purchases = {
  configure: (_options: unknown): void => {},
  setLogLevel: (_level: unknown): void => {},
  getCustomerInfo: async (): Promise<{
    entitlements: { active: Record<string, unknown>; all: Record<string, unknown> };
    originalAppUserId: string;
  }> => ({
    entitlements: { active: {}, all: {} },
    originalAppUserId: '$RCAnonymousID:stub',
  }),
  logIn: async (_userId: string): Promise<{
    customerInfo: {
      entitlements: { active: Record<string, unknown>; all: Record<string, unknown> };
      originalAppUserId: string;
    };
  }> => ({
    customerInfo: {
      entitlements: { active: {}, all: {} },
      originalAppUserId: '$RCAnonymousID:stub',
    },
  }),
  logOut: async (): Promise<{
    customerInfo: {
      entitlements: { active: Record<string, unknown>; all: Record<string, unknown> };
      originalAppUserId: string;
    };
  }> => ({
    customerInfo: {
      entitlements: { active: {}, all: {} },
      originalAppUserId: '$RCAnonymousID:stub',
    },
  }),
  purchasePackage: async (_pkg: unknown): Promise<Record<string, never>> => ({}),
  restorePurchases: async (): Promise<{ entitlements: { active: Record<string, unknown> } }> => ({
    entitlements: { active: {} },
  }),
  addCustomerInfoUpdateListener: (_listener: unknown): void => {},
  removeCustomerInfoUpdateListener: (_listener: unknown): void => {},
  setEmail: async (_email: string): Promise<void> => {},
  setDisplayName: async (_name: string): Promise<void> => {},
  getOfferings: async (): Promise<{ current: null; all: Record<string, unknown> }> => ({
    current: null,
    all: {},
  }),
};

export default Purchases;

export const LOG_LEVEL = {
  DEBUG: 'DEBUG',
  VERBOSE: 'VERBOSE',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export const isPurchasesAvailable = false;
