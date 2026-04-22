// utils/bannerAd.native.ts
// Safe wrapper — gracefully handles missing native module (e.g. Expo Go)

let BannerAd: any = () => null;
let BannerAdSize: any = { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER', BANNER: 'BANNER' };
let TestIds: any = { ADAPTIVE_BANNER: 'test-banner', BANNER: 'test-banner' };
export let isBannerAdAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-google-mobile-ads');
  BannerAd = mod.BannerAd;
  BannerAdSize = mod.BannerAdSize;
  TestIds = mod.TestIds;
  isBannerAdAvailable = true;
} catch {
  isBannerAdAvailable = false;
}

export { BannerAd, BannerAdSize, TestIds };
