/**
 * Web stub for AdBannerContext — ads are not supported on web.
 * Metro will resolve this file instead of AdBannerContext.tsx on web,
 * preventing react-native-google-mobile-ads from being bundled.
 */

import React from 'react';

export const AD_BANNER_HEIGHT = 0;

interface AdBannerContextValue {
  isPremium: boolean;
  adBannerHeight: number;
}

const AdBannerContext = React.createContext<AdBannerContextValue>({
  isPremium: false,
  adBannerHeight: 0,
});

export function AdBannerProvider({
  isPremium,
  children,
}: {
  isPremium: boolean;
  children: React.ReactNode;
}) {
  return (
    <AdBannerContext.Provider value={{ isPremium, adBannerHeight: 0 }}>
      {children}
    </AdBannerContext.Provider>
  );
}

export function useAdBanner(): AdBannerContextValue {
  return React.useContext(AdBannerContext);
}
