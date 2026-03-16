import React, { useState, useCallback } from 'react';
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
  /** Total bottom offset screens should use for paddingBottom */
  adBannerHeight: number;
  /** Called by AdBannerFooter once it knows its real rendered height */
  setAdBannerHeight: (height: number) => void;
  /** Whether the ad should be shown at all */
  shouldShowAd: boolean;
}

const AdBannerContext = React.createContext<AdBannerContextValue>({
  isPremium: false,
  adBannerHeight: 0,
  setAdBannerHeight: () => {},
  shouldShowAd: false,
});

export function AdBannerProvider({
  isPremium,
  children,
}: {
  isPremium: boolean;
  children: React.ReactNode;
}) {
  const shouldShowAd = !isPremium && Platform.OS === 'ios' && adsAvailable;

  // Start at 0 — AdBannerFooter will report its real height once rendered
  const [adBannerHeight, setAdBannerHeightState] = useState(
    shouldShowAd ? AD_BANNER_HEIGHT : 0
  );

  const setAdBannerHeight = useCallback((height: number) => {
    setAdBannerHeightState(height);
  }, []);

  return (
    <AdBannerContext.Provider
      value={{ isPremium, adBannerHeight, setAdBannerHeight, shouldShowAd }}
    >
      {children}
    </AdBannerContext.Provider>
  );
}

export function useAdBanner(): AdBannerContextValue {
  return React.use(AdBannerContext);
}
