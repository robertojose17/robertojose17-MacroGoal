import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { AD_BANNER_HEIGHT } from './AdBannerFooter';

// Detect if the ads package is available (mirrors the check in AdBannerFooter)
let adsAvailable = false;
try {
  require('react-native-google-mobile-ads');
  adsAvailable = true;
} catch {
  adsAvailable = false;
}

interface AdBannerContextValue {
  isPremium: boolean;
  isAuthenticated: boolean;
  adBannerHeight: number; // total bottom offset screens should use
}

const AdBannerContext = React.createContext<AdBannerContextValue>({
  isPremium: false,
  isAuthenticated: false,
  adBannerHeight: 0,
});

export function AdBannerProvider({
  isPremium,
  isAuthenticated,
  children,
}: {
  isPremium: boolean;
  isAuthenticated: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Show ad only for authenticated, non-premium iOS users when package is available
  const shouldShowAd = isAuthenticated && !isPremium && Platform.OS === 'ios' && adsAvailable;
  const adBannerHeight = shouldShowAd ? AD_BANNER_HEIGHT + insets.bottom : 0;

  console.log('[AdBannerContext] shouldShowAd:', shouldShowAd, '| isPremium:', isPremium, '| isAuthenticated:', isAuthenticated, '| adsAvailable:', adsAvailable);

  return (
    <AdBannerContext.Provider value={{ isPremium, isAuthenticated, adBannerHeight }}>
      {children}
    </AdBannerContext.Provider>
  );
}

export function useAdBanner(): AdBannerContextValue {
  return React.use(AdBannerContext);
}
