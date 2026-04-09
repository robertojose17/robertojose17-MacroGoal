import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { IconSymbol } from '@/components/IconSymbol';

// iOS tab layout using standard Tabs (NativeTabs not available in this SDK version)
export default function TabsLayoutIOS() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="house.fill" android_material_icon_name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Diary',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="book.fill" android_material_icon_name="menu-book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending-up" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
