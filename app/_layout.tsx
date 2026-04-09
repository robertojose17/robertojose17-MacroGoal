import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [initialized, setInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const mounted = useRef(true);
  // Guard so we only navigate once after initialization
  const navigated = useRef(false);

  useEffect(() => {
    mounted.current = true;

    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      try {
        console.log('[RootLayout] Importing supabase...');
        const { supabase } = await import('../lib/supabase/client');
        console.log('[RootLayout] Supabase imported OK');

        console.log('[RootLayout] Calling getSession...');
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => {
              console.log('[RootLayout] getSession TIMED OUT after 4s');
              resolve({ data: { session: null } });
            }, 4000)
          ),
        ]);

        if (!mounted.current) return;
        const session = sessionResult.data.session;
        console.log('[RootLayout] getSession done, session=' + !!session);
        setHasSession(!!session);

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted.current) return;
          console.log('[RootLayout] Auth state changed, session=' + !!newSession);
          setHasSession(!!newSession);
        });
        unsubscribeAuth = () => subscription.unsubscribe();
      } catch (e: any) {
        console.log('[RootLayout] AUTH ERROR: ' + (e?.message || String(e)));
        // Don't block — treat as no session
        if (!mounted.current) return;
        setHasSession(false);
      } finally {
        if (mounted.current) {
          setInitialized(true);
        }
      }
    };

    initAuth();

    // Hard fallback: if supabase import itself hangs, unblock after 6s
    const fallback = setTimeout(() => {
      if (!mounted.current) return;
      console.log('[RootLayout] FALLBACK TIMER fired — forcing initialized=true');
      setInitialized(true);
    }, 6000);

    return () => {
      mounted.current = false;
      clearTimeout(fallback);
      unsubscribeAuth?.();
    };
  }, []);

  // Hide splash and navigate once initialized
  useEffect(() => {
    if (!initialized) return;
    if (navigated.current) return;

    console.log('[RootLayout] initialized=true, hasSession=' + hasSession + ', segments=' + JSON.stringify(segments));

    SplashScreen.hideAsync().catch(() => {});

    // Small delay to ensure the navigator is mounted before we push
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (navigated.current) return;
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

  // Always render the Stack — never return null or a non-Stack tree,
  // because router.replace() requires a mounted navigator to work.
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
