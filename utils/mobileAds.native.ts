// Safe no-op stub — react-native-google-mobile-ads is not linked in the native binary.
// ZERO imports from native packages — completely self-contained.
// Metro resolves '@/utils/mobileAds' → this file on iOS/Android via .native.ts extension.

export const isAdsAvailable = false;

export const initializeAds = async (): Promise<void> => {};

export const requestTrackingPermission = async (): Promise<string> => 'unavailable';

const mobileAds = {
  initialize: async (): Promise<void> => {},
};

export default mobileAds;
