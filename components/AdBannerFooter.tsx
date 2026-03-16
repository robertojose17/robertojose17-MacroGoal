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
 *   Place <AdBannerFooter /> at the tab layout level (already done in (tabs)/_layout.tsx).
 *
 * Option B — Direct prop:
 *   <AdBannerFooter isPremium={false} isAuthenticated={true} />
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
 */

import React, { useState } from 'react';
import { View, Text, useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AD_BANNER_HEIGHT = 60;

// Height of the native tab bar.
// On iOS this is tall enough to contain both the tab icons AND the ad banner
// that floats above it (tab icons ~85 + ad banner 60 = 145).
export const TAB_BAR_HEIGHT_IOS = 145;
export const TAB_BAR_HEIGHT_ANDROID = 70;

// The visual tab-icon area within the iOS tab bar (ad banner sits above this)
export const TAB_ICON_AREA_IOS = 85;

// Production Ad Unit ID (also used as test ID per user config):
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
  // Run: npx expo install react-native-google-mobile-ads
  // Then rebuild the native app.
}

interface AdBannerFooterProps {
  isPremium: boolean;
  isAuthenticated: boolean;
}

export function AdBannerFooter({ isPremium, isAuthenticated }: AdBannerFooterProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [adLoaded, setAdLoaded] = useState(false);

  console.log('[AdBannerFooter] render | isPremium:', isPremium, '| isAuthenticated:', isAuthenticated, '| platform:', Platform.OS, '| BannerAd available:', !!BannerAd);

  // Only render for authenticated, non-premium iOS users
  if (!isAuthenticated || isPremium || Platform.OS !== 'ios') return null;

  const bgColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

  // The ad banner floats just above the visible tab icons, not above the full reserved area
  const bannerBottom = Platform.OS === 'ios' ? TAB_ICON_AREA_IOS : TAB_BAR_HEIGHT_ANDROID;

  // If the native ads package is not installed (e.g. Expo Go), show a placeholder
  if (!BannerAd) {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: bannerBottom,
          left: 0,
          right: 0,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          height: AD_BANNER_HEIGHT,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb',
          zIndex: 100,
        }}
      >
        <Text style={{ color: colorScheme === 'dark' ? '#888' : '#aaa', fontSize: 11 }}>
          Advertisement
        </Text>
      </View>
    );
  }

  const adUnitId = __DEV__ ? TestIds?.ADAPTIVE_BANNER : PRODUCTION_AD_UNIT_ID;

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
        bottom: bannerBottom,
        left: 0,
        right: 0,
        backgroundColor: bgColor,
        alignItems: 'center',
        zIndex: 100,
        // Hide container until ad is loaded to avoid flash
        opacity: adLoaded ? 1 : 0,
        height: adLoaded ? AD_BANNER_HEIGHT : 0,
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

export function useAdBannerHeight(isPremium: boolean, isAuthenticated: boolean): number {
  const insets = useSafeAreaInsets();
  if (!isAuthenticated || isPremium || Platform.OS !== 'ios') return 0;
  return AD_BANNER_HEIGHT + insets.bottom;
}
