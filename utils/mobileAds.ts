// Web / fallback stub — no native ads on web.
// ZERO imports from native packages.

export const isAdsAvailable = false;

export const initializeAds = async (): Promise<void> => {};

export const requestTrackingPermission = async (): Promise<string> => 'unavailable';

const mobileAds = {
  initialize: async (): Promise<void> => {},
};

export default mobileAds;
