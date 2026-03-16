
import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AdBannerFooter } from '@/components/AdBannerFooter';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/lib/supabase/client';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPremium } = usePremium();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  console.log('[Tab Layout] Rendering tab layout for platform:', Platform.OS);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: isDark ? colors.textSecondaryDark : colors.textSecondary,
          tabBarStyle: {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderTopColor: isDark ? colors.borderDark : colors.border,
            paddingBottom: Platform.OS === 'ios' ? 20 : 5,
            height: Platform.OS === 'ios' ? 85 : 60,
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
      <AdBannerFooter isPremium={isPremium} isAuthenticated={isAuthenticated} />
    </View>
  );
}
