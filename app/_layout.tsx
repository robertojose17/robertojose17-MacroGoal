import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

try { SplashScreen.preventAutoHideAsync(); } catch (_e) {}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      try { SplashScreen.hideAsync(); } catch (_e) {}
      router.replace('/(tabs)');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
