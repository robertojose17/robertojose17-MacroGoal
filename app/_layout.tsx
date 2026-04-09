// v-final
import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#ff0000', padding: 40, paddingTop: 80 }}>
          <ScrollView>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              APP CRASH
            </Text>
            <Text style={{ color: 'white', fontSize: 14, marginBottom: 10 }}>
              {this.state.error.message}
            </Text>
            <Text style={{ color: 'white', fontSize: 11 }}>
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    SplashScreen.hideAsync().catch(() => {});

    const initAuth = async () => {
      try {
        const { supabase } = await import('../lib/supabase/client');
        const { data } = await supabase.auth.getSession();
        if (!mounted.current) return;
        setHasSession(!!data.session);
        setInitialized(true);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted.current) return;
          setHasSession(!!session);
        });

        return () => subscription.unsubscribe();
      } catch (e) {
        console.error('Auth init error:', e);
        if (!mounted.current) return;
        setInitialized(true);
      }
    };

    initAuth();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (hasSession) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/signup');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [initialized, hasSession]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
