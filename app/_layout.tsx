import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [crashError, setCrashError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const mounted = useRef(true);

  const addLog = (msg: string) => {
    console.log(msg);
    setLog(prev => [...prev, msg]);
  };

  useEffect(() => {
    mounted.current = true;
    SplashScreen.hideAsync().catch(() => {});
    addLog('Layout mounted');

    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      try {
        addLog('Importing supabase...');
        const { supabase } = await import('../lib/supabase/client');
        addLog('Supabase imported OK');

        addLog('Calling getSession...');
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => {
              addLog('getSession TIMED OUT after 4s');
              resolve({ data: { session: null } });
            }, 4000)
          ),
        ]);

        if (!mounted.current) return;
        addLog('getSession done, session=' + !!sessionResult.data.session);
        setHasSession(!!sessionResult.data.session);
        setInitialized(true);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted.current) return;
          setHasSession(!!session);
        });

        unsubscribeAuth = () => subscription.unsubscribe();
      } catch (e: any) {
        const msg = e?.message || String(e);
        addLog('AUTH ERROR: ' + msg);
        setCrashError(msg);
        if (!mounted.current) return;
        setInitialized(true);
      }
    };

    initAuth();

    const fallback = setTimeout(() => {
      if (!mounted.current) return;
      addLog('FALLBACK TIMER fired');
      setInitialized(true);
    }, 6000);

    return () => {
      mounted.current = false;
      clearTimeout(fallback);
      unsubscribeAuth?.();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    addLog('initialized=true, hasSession=' + hasSession);
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (hasSession) {
        addLog('Navigating to tabs');
        router.replace('/(tabs)');
      } else {
        addLog('Navigating to signup');
        router.replace('/auth/signup');
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [initialized, hasSession, router]);

  // Show debug overlay if there's a crash error
  if (crashError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          iOS Crash Detected
        </Text>
        <Text style={{ color: '#ff8888', fontSize: 13, marginBottom: 20 }}>
          {crashError}
        </Text>
        <Text style={{ color: '#aaaaaa', fontSize: 12, marginBottom: 8 }}>Log:</Text>
        <ScrollView style={{ flex: 1 }}>
          {log.map((l, i) => (
            <Text key={i} style={{ color: '#cccccc', fontSize: 11, marginBottom: 2 }}>{l}</Text>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
