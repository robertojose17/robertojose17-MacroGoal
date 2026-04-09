import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Hide splash immediately so user sees something
    SplashScreen.hideAsync().catch(() => {});

    const initAuth = async () => {
      try {
        const { supabase } = await import('../lib/supabase/client');

        // Race getSession against a 4-second timeout
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 4000)
          ),
        ]);

        if (!mounted.current) return;
        console.log('[Layout] getSession resolved, session:', !!sessionResult.data.session);
        setHasSession(!!sessionResult.data.session);
        setInitialized(true);

        // Listen for future auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted.current) return;
          setHasSession(!!session);
        });

        return () => subscription.unsubscribe();
      } catch (e) {
        console.error('[Layout] Auth init error:', e);
        if (!mounted.current) return;
        setInitialized(true);
      }
    };

    initAuth();

    // Absolute fallback: if nothing resolves in 6 seconds, force init
    const fallback = setTimeout(() => {
      if (!mounted.current) return;
      console.warn('[Layout] Fallback timer fired — forcing initialized=true');
      setInitialized(true);
    }, 6000);

    return () => {
      mounted.current = false;
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (hasSession) {
        console.log('[Layout] Session found — navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('[Layout] No session — navigating to signup');
        router.replace('/auth/signup');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [initialized, hasSession, router]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
