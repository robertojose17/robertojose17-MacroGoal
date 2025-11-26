
import React from 'react';
import { Tabs } from 'expo-router/unstable-native-tabs';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textSecondaryDark : colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'house.fill' : 'house'}
              android_material_icon_name="home"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              ios_icon_name={focused ? 'person.fill' : 'person'}
              android_material_icon_name="person"
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
