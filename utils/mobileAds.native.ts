// utils/mobileAds.native.ts
// Safe wrapper — gracefully handles missing native module (e.g. Expo Go)

let _mobileAds: any = null;
let _available = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-google-mobile-ads');
  _mobileAds = mod.default ?? mod;
  _available = true;
} catch {
  _available = false;
}

export const isAdsAvailable = _available;

export const initializeAds = async (): Promise<void> => {
  console.log('[Ads] initializeAds called, available:', _available);
  if (!_available || !_mobileAds) return;
  try {
    await _mobileAds().initialize();
  } catch (e) {
    console.warn('[Ads] Failed to initialize AdMob:', e);
  }
};

export const requestTrackingPermission = async (): Promise<string> => {
  return 'unavailable';
};

export default _mobileAds;
