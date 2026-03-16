/**
 * AdBannerFooter — Production-ready AdMob banner for iOS free users.
 *
 * Positioned ABOVE the tab bar. Must be rendered inside a tab navigator
 * so that useBottomTabBarHeight() works correctly.
 * Reports its real rendered height back to AdBannerContext so screens
 * can add the correct paddingBottom via useAdBanner().adBannerHeight.
 *
 * Only renders when the user is authenticated (isAuthenticated prop).
 */

import React, { useState, useEffect } from 'react';
import { View, useColorScheme, Platform } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAdBanner } from './AdBannerContext';

export const AD_BANNER_HEIGHT = 60;

// Production Ad Unit ID:
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-3940256099942544/2435281174';

// react-native-google-mobile-ads requires a native build.
// We use a try/catch require so the app works gracefully without it installed.
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch {
  // react-native-google-mobile-ads not installed — ads will not render.
}

interface AdBannerFooterProps {
  isPremium: boolean;
  isAuthenticated: boolean;
}

/**
 * Inner component — only mounted when we actually want to show an ad.
 * Calling useBottomTabBarHeight() unconditionally here is safe because
 * this component is always rendered inside the tab navigator.
 */
function AdBannerInner() {
  const colorScheme = useColorScheme();
  const [adLoaded, setAdLoaded] = useState(false);
  const { setAdBannerHeight } = useAdBanner();
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (adLoaded) {
      const totalHeight = AD_BANNER_HEIGHT + tabBarHeight;
      console.log('[AdBannerFooter] Reporting ad banner height to context:', totalHeight);
      setAdBannerHeight(totalHeight);
    } else {
      setAdBannerHeight(0);
    }
    return () => {
      setAdBannerHeight(0);
    };
  }, [adLoaded, tabBarHeight, setAdBannerHeight]);

  const adUnitId = __DEV__ ? TestIds?.ADAPTIVE_BANNER : PRODUCTION_AD_UNIT_ID;
  const bgColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

  const handleAdLoaded = () => {
    console.log('[AdBannerFooter] Ad loaded successfully');
    setAdLoaded(true);
  };

  const handleAdFailedToLoad = (error: unknown) => {
    console.log('[AdBannerFooter] Ad failed to load:', error);
    setAdLoaded(false);
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: tabBarHeight,
        left: 0,
        right: 0,
        backgroundColor: bgColor,
        alignItems: 'center',
        // Collapse to zero height until ad loads to avoid a blank bar flash
        minHeight: adLoaded ? AD_BANNER_HEIGHT : 0,
        overflow: 'hidden',
      }}
    >
      {adUnitId && (
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailedToLoad}
        />
      )}
    </View>
  );
}

export function AdBannerFooter({ isPremium, isAuthenticated }: AdBannerFooterProps) {
  const shouldRender =
    isAuthenticated &&
    !isPremium &&
    Platform.OS === 'ios' &&
    BannerAd !== null;

  if (!shouldRender) return null;

  return <AdBannerInner />;
}

/** @deprecated Use useAdBanner() from AdBannerContext instead */
export function useAdBannerHeight(isPremium: boolean): number {
  if (isPremium || Platform.OS !== 'ios' || !BannerAd) return 0;
  return AD_BANNER_HEIGHT;
}
