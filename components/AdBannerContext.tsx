import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { AD_BANNER_HEIGHT } from '@/constants/adBanner';
import { isAdsAvailable } from '@/utils/mobileAds';

const adsAvailable = isAdsAvailable;

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
