
import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AdBannerProvider, useAdBanner } from '@/components/AdBannerContext';
import { AdBannerFooter } from '@/components/AdBannerFooter';
import { usePremium } from '@/hooks/usePremium';

function TabLayoutInner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { adBannerHeight } = useAdBanner();
  const hasAd = adBannerHeight > 0;

  console.log('[iOS Tab Layout] Rendering iOS-specific tab layout with Profile tab, hasAd:', hasAd);

  // When ad is showing, shift the tab bar up by the banner height so it sits above the banner.
  // The banner itself handles the safe area inset at the very bottom.
  const tabBarHeight = hasAd ? 60 : 85;
  const tabBarPaddingBottom = hasAd ? 8 : 20;
  const tabBarMarginBottom = hasAd ? adBannerHeight : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textSecondaryDark : colors.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderTopColor: isDark ? colors.borderDark : colors.border,
          paddingBottom: tabBarPaddingBottom,
          height: tabBarHeight,
          marginBottom: tabBarMarginBottom,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'chart.bar.fill' : 'chart.bar'}
              android_material_icon_name="analytics"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Food',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'fork.knife.circle.fill' : 'fork.knife.circle'}
              android_material_icon_name="restaurant"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="check-ins"
        options={{
          title: 'Check-Ins',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'checkmark.circle.fill' : 'checkmark.circle'}
              android_material_icon_name="check_circle"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => {
            console.log('[iOS Tab Layout] Rendering Profile tab icon, focused:', focused);
            return (
              <IconSymbol
                ios_icon_name={focused ? 'person.fill' : 'person'}
                android_material_icon_name="person"
                size={28}
                color={color}
              />
            );
          },
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isPremium } = usePremium();
  console.log('[iOS Tab Layout] Initializing AdBannerProvider, isPremium:', isPremium);
  return (
    <AdBannerProvider isPremium={isPremium}>
      <View style={{ flex: 1 }}>
        <TabLayoutInner />
        <AdBannerFooter isPremium={isPremium} />
      </View>
    </AdBannerProvider>
  );
}
