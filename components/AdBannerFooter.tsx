/**
 * AdBannerFooter — Production-ready AdMob banner for iOS free users.
 *
 * SETUP:
 * 1. Install: npx expo install react-native-google-mobile-ads
 * 2. Add to app.json plugins: ["react-native-google-mobile-ads", { "androidAppId": "...", "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" }]
 * 3. Replace PRODUCTION_AD_UNIT_ID below with your real iOS banner unit ID.
 * 4. Run a new native build (EAS or npx expo run:ios) — this package requires native code.
 *
 * USAGE IN SCREENS:
 *
 * Option A — Context (recommended, no prop drilling):
 *   The AdBannerProvider in app/_layout.tsx handles isPremium globally.
 *   In any screen, call `const { adBannerHeight } = useAdBanner()` and apply
 *   it as contentContainerStyle paddingBottom on ScrollView/FlatList.
 *   Place <AdBannerFooter isPremium={isPremium} /> at the root layout level (already done in _layout.tsx).
 *
 * Option B — Direct prop:
 *   <AdBannerFooter isPremium={false} />
 *   Use `useAdBannerHeight(isPremium)` to get the offset for contentContainerStyle.
 *
 * SCROLLVIEW EXAMPLE:
 *   const { adBannerHeight } = useAdBanner();
 *   <ScrollView contentContainerStyle={{ paddingBottom: adBannerHeight }}>
 *     ...content...
 *   </ScrollView>
 *
 * FLATLIST EXAMPLE:
 *   const { adBannerHeight } = useAdBanner();
 *   <FlatList contentContainerStyle={{ paddingBottom: adBannerHeight }} ... />
 *
 * SCREEN WITH FIXED BOTTOM BUTTON:
 *   const { adBannerHeight } = useAdBanner();
 *   <View style={{ position: 'absolute', bottom: adBannerHeight, left: 0, right: 0 }}>
 *     <Button title="Save" />
 *   </View>
 *
 * The banner is absolutely positioned and never participates in the layout flow,
 * so screens MUST add paddingBottom equal to adBannerHeight to avoid content being hidden.
 */

import React, { useState } from 'react';
import { View, useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AD_BANNER_HEIGHT = 60;

// Production Ad Unit ID (also used as test ID per user config):
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-3940256099942544/2435281174';

// react-native-google-mobile-ads requires a native build.
// We use a try/catch require so the app works gracefully without it installed.
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch {
  // react-native-google-mobile-ads not installed — ads will not render.
  // Run: npx expo install react-native-google-mobile-ads
  // Then rebuild the native app.
}

interface AdBannerFooterProps {
  isPremium: boolean;
}

export function AdBannerFooter({ isPremium }: AdBannerFooterProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [adLoaded, setAdLoaded] = useState(false);

  // Only render on iOS, only for free users, only if package is available
  if (isPremium || Platform.OS !== 'ios' || !BannerAd) return null;

  const adUnitId = __DEV__ ? TestIds?.ADAPTIVE_BANNER : PRODUCTION_AD_UNIT_ID;
  const bgColor = colorScheme === 'dark' ? '#000000' : '#ffffff';
  const containerMinHeight = adLoaded ? AD_BANNER_HEIGHT + insets.bottom : 0;

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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: bgColor,
        paddingBottom: insets.bottom,
        alignItems: 'center',
        // Only take up space once ad is loaded to avoid flash
        minHeight: containerMinHeight,
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

export function useAdBannerHeight(isPremium: boolean): number {
  const insets = useSafeAreaInsets();
  if (isPremium || Platform.OS !== 'ios' || !BannerAd) return 0;
  return AD_BANNER_HEIGHT + insets.bottom;
}
