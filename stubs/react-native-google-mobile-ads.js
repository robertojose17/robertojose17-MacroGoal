// Stub for react-native-google-mobile-ads — used by Metro extraNodeModules
// when the real native module is not linked. ZERO re-exports of the real package.
'use strict';

const mobileAdsInstance = {
  initialize: async function() { return []; },
};

function BannerAd() { return null; }

module.exports = {
  default: mobileAdsInstance,
  mobileAds: function() { return mobileAdsInstance; },
  BannerAd: BannerAd,
  BannerAdSize: {
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
    BANNER: 'BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  },
  TestIds: {
    ADAPTIVE_BANNER: 'test-banner',
    BANNER: 'test-banner',
  },
  isAdsAvailable: false,
};
