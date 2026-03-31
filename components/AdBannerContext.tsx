import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { AD_BANNER_HEIGHT } from './AdBannerFooter';

// Detect if the ads package is available (mirrors the check in AdBannerFooter)
// Platform.OS guard is required — Metro resolves requires at build time so
// a try/catch alone does NOT prevent the native-only module from being
// bundled on web, causing a hard build error.
let adsAvailable = false;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-google-mobile-ads');
    adsAvailable = true;
  } catch {
    adsAvailable = false;
  }
}

interface AdBannerContextValue {
  isPremium: boolean;
  adBannerHeight: number; // total bottom offset screens should use
}

const AdBannerContext = React.createContext<AdBannerContextValue>({
  isPremium: false,
  adBannerHeight: AD_BANNER_HEIGHT,
});

export function AdBannerProvider({
  isPremium,
  children,
}: {
  isPremium: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const shouldShowAd = !isPremium && Platform.OS === 'ios' && adsAvailable;
  const adBannerHeight = shouldShowAd ? AD_BANNER_HEIGHT + insets.bottom : 0;

  return (
    <AdBannerContext.Provider value={{ isPremium, adBannerHeight }}>
      {children}
    </AdBannerContext.Provider>
  );
}

export function useAdBanner(): AdBannerContextValue {
  return React.useContext(AdBannerContext);
}
