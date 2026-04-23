/**
 * Web stub for AdBannerFooter — ads are not supported on web.
 * Metro will resolve this file instead of AdBannerFooter.tsx on web,
 * preventing react-native-google-mobile-ads from being bundled.
 */

export const AD_BANNER_HEIGHT = 0;

export function AdBannerFooter() {
  return null;
}

export function useAdBannerHeight(): number {
  return 0;
}
