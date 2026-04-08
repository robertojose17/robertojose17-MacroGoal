// Safe no-op stub — react-native-google-mobile-ads is not linked in the native binary.
// ZERO imports from native packages — completely self-contained.
// Metro resolves '@/utils/bannerAd' → this file on iOS/Android via .native.ts extension.
import React from 'react';

export const BannerAd = (): React.ReactElement | null => null;

export const BannerAdSize: Record<string, string> = {
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
};

export const TestIds = {
  ADAPTIVE_BANNER: 'test-banner',
  BANNER: 'test-banner',
};

export const isBannerAdAvailable = false;
