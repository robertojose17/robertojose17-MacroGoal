import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { COLORS } from '@/constants/Colors';

const TABS: TabBarItem[] = [
  { name: 'home', route: '/(tabs)/(home)', icon: 'home', label: 'Home' },
  { name: 'diary', route: '/(tabs)/diary', icon: 'menu-book', label: 'Diary' },
  { name: 'progress', route: '/(tabs)/progress', icon: 'trending-up', label: 'Progress' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person', label: 'Profile' },
];

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      >
        <Tabs.Screen name="(home)" />
        <Tabs.Screen name="diary" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <FloatingTabBar tabs={TABS} containerWidth={320} />
    </View>
  );
}
