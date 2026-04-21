import mobileAds from 'react-native-google-mobile-ads';

export const isAdsAvailable = true;

export const initializeAds = async (): Promise<void> => {
  await mobileAds().initialize();
};

export const requestTrackingPermission = async (): Promise<string> => {
  return 'unavailable';
};

export default mobileAds();
