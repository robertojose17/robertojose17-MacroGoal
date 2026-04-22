import mobileAds from 'react-native-google-mobile-ads';

export const isAdsAvailable = true;

export const initializeAds = async (): Promise<void> => {
  try {
    await mobileAds().initialize();
  } catch (e) {
    console.warn('[Ads] Failed to initialize AdMob:', e);
  }
};

export const requestTrackingPermission = async (): Promise<string> => {
  return 'unavailable';
};

export default mobileAds;
