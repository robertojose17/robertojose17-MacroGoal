import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

try { SplashScreen.preventAutoHideAsync(); } catch (_e) {}

export default function RootLayout() {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const mounted = useRef(true);
  const navigated = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      try {
        const { getSupabase } = await import('../lib/supabase/client');
        const client = getSupabase();

        const sessionResult = await Promise.race([
          client.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 5000)
          ),
        ]);

        if (!mounted.current) return;
        const session = sessionResult.data.session;
        console.log('[RootLayout] getSession done, session=' + !!session);
        setHasSession(!!session);

        const { data: { subscription } } = client.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted.current) return;
          console.log('[RootLayout] Auth state changed, session=' + !!newSession);
          setHasSession(!!newSession);
        });
        unsubscribeAuth = () => subscription.unsubscribe();
      } catch (_e) {
        console.log('[RootLayout] AUTH ERROR: ' + String(_e));
        if (mounted.current) setHasSession(false);
      } finally {
        if (mounted.current) setInitialized(true);
      }
    };

    initAuth();

    const fallback = setTimeout(() => {
      if (mounted.current) {
        console.log('[RootLayout] FALLBACK TIMER fired — forcing initialized=true');
        setInitialized(true);
      }
    }, 7000);

    return () => {
      mounted.current = false;
      clearTimeout(fallback);
      unsubscribeAuth?.();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (navigated.current) return;

    try { SplashScreen.hideAsync(); } catch (_e) {}

    const timer = setTimeout(() => {
      if (!mounted.current || navigated.current) return;
      navigated.current = true;
      if (hasSession) {
        console.log('[RootLayout] Navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('[RootLayout] Navigating to signup');
        router.replace('/auth/signup');
      }
    }, 100);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, hasSession]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
