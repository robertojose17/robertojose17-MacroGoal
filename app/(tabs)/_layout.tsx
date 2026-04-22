
import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AdBannerProvider, useAdBanner } from '@/components/AdBannerContext';
import { AdBannerFooter } from '@/components/AdBannerFooter';
import { useUserProfile } from '@/hooks/useUserProfile';

function TabLayoutInner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { adBannerHeight } = useAdBanner();
  const hasAd = adBannerHeight > 0;

  console.log('[Tab Layout] Rendering tab layout for platform:', Platform.OS, 'hasAd:', hasAd);

  const tabBarHeight = Platform.OS === 'ios' ? (hasAd ? 60 : 85) : 60;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? (hasAd ? 8 : 20) : 5;

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
          marginBottom: hasAd ? adBannerHeight : 0,
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
              android_material_icon_name="check-circle"
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
            console.log('[Tab Layout] Rendering Profile tab icon, focused:', focused);
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
  const { isPremium, loading } = useUserProfile();
  // While premium status is loading, treat as non-premium so no async hang blocks render.
  const effectivePremium = loading ? true : isPremium;
  console.log('[Tab Layout] Initializing AdBannerProvider, isPremium (from Supabase user_type):', effectivePremium, 'loading:', loading);
  return (
    <AdBannerProvider isPremium={effectivePremium}>
      <View style={{ flex: 1 }}>
        <TabLayoutInner />
        <AdBannerFooter isPremium={effectivePremium} />
      </View>
    </AdBannerProvider>
  );
}
