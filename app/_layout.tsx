
import "react-native-reanimated";
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from "react";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { initializeFoodDatabase } from "@/utils/foodDatabase";
import { supabase } from "@/app/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { colors, spacing, typography } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

// ============================================================
// ERROR BOUNDARY COMPONENT
// ============================================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('[ErrorBoundary] ❌ Error caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] ❌ Component error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    console.log('[ErrorBoundary] Resetting error boundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Try to navigate to welcome screen
    try {
      router.replace('/auth/welcome');
    } catch (e) {
      console.error('[ErrorBoundary] Failed to navigate:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.content}>
            <Text style={errorStyles.title}>Something went wrong</Text>
            <Text style={errorStyles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <TouchableOpacity
              style={errorStyles.button}
              onPress={this.handleReset}
            >
              <Text style={errorStyles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    ...typography.h2,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  buttonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
});

// ============================================================
// MAIN ROOT LAYOUT COMPONENT
// ============================================================
function RootLayoutContent() {
  console.log('[BOOT] ========== APP START ==========');
  
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const segments = useSegments();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    console.log('[BOOT] Fonts loaded:', loaded);
    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  const initializeApp = async () => {
    console.log('[BOOT] ========== INITIALIZATION START ==========');
    
    // CRITICAL: Set a hard timeout for initialization
    const initTimeout = setTimeout(() => {
      console.error('[BOOT] ⏱️ INITIALIZATION TIMEOUT - Forcing app to load');
      setIsReady(true);
      setInitializing(false);
      SplashScreen.hideAsync().catch(e => console.error('[BOOT] Error hiding splash:', e));
    }, 10000); // 10 second hard timeout

    try {
      console.log('[BOOT] providers mounted');
      
      // STEP 1: Initialize food database (non-blocking)
      console.log('[BOOT] data preload start');
      
      // CRITICAL FIX: Do NOT await food database initialization
      // Let it run in background, app must load regardless
      initializeFoodDatabase()
        .then(() => console.log('[BOOT] ✅ Food database initialized'))
        .catch(error => {
          console.error('[BOOT] ⚠️ Food database init failed (non-blocking):', error);
        });

      console.log('[BOOT] data preload done (non-blocking)');

      // STEP 2: Get current session
      console.log('[BOOT] auth check start');
      
      // CRITICAL FIX: Add timeout to session fetch
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      );
      
      let currentSession: Session | null = null;
      try {
        const result = await Promise.race([sessionPromise, sessionTimeout]);
        currentSession = (result as any)?.data?.session || null;
        console.log('[BOOT] ✅ Session retrieved:', currentSession?.user?.id || 'none');
      } catch (error) {
        console.error('[BOOT] ⚠️ Session fetch failed (non-blocking):', error);
        currentSession = null;
      }
      
      console.log('[BOOT] auth check done');
      
      setSession(currentSession);

      // STEP 3: Setup auth listener
      console.log('[BOOT] Setting up auth listener');
      
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('[BOOT] Auth state changed:', _event, session?.user?.id || 'none');
          setSession(session);
        });

        console.log('[BOOT] ✅ Auth listener setup complete');
      } catch (error) {
        console.error('[BOOT] ⚠️ Auth listener setup failed (non-blocking):', error);
      }

      console.log('[BOOT] ✅ Initialization complete');
      
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      
      // Hide splash screen with error handling
      try {
        await SplashScreen.hideAsync();
        console.log('[BOOT] ✅ Splash screen hidden');
      } catch (e) {
        console.error('[BOOT] Error hiding splash:', e);
      }
    } catch (error) {
      console.error('[BOOT] ❌ CRITICAL: Initialization failed:', error);
      
      // CRITICAL: Even on error, app must load
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.error('[BOOT] Error hiding splash:', e);
      }
    }
  };

  useEffect(() => {
    if (!isReady || initializing) {
      console.log('[Navigation] Waiting for initialization...', { isReady, initializing });
      return;
    }

    const handleNavigation = async () => {
      try {
        const inAuthGroup = segments[0] === 'auth';
        const inOnboardingGroup = segments[0] === 'onboarding';
        const inTabsGroup = segments[0] === '(tabs)';

        console.log('[Navigation] Current state:', { 
          hasSession: !!session, 
          segments, 
          inAuthGroup, 
          inOnboardingGroup, 
          inTabsGroup 
        });

        // Not logged in - redirect to auth
        if (!session) {
          if (!inAuthGroup) {
            console.log('[Navigation] No session, redirecting to welcome');
            router.replace('/auth/welcome');
          }
          return;
        }

        // Logged in - check onboarding status
        if (session && (inAuthGroup || segments.length === 0)) {
          console.log('[Navigation] Checking onboarding status for user:', session.user.id);
          
          // CRITICAL FIX: Add timeout to onboarding check
          const onboardingPromise = supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', session.user.id)
            .maybeSingle();
          
          const onboardingTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Onboarding check timeout')), 5000)
          );
          
          try {
            const result = await Promise.race([
              onboardingPromise, 
              onboardingTimeout
            ]);
            
            const { data: userData, error } = result as any;

            // CRITICAL FIX: Handle all error cases gracefully
            if (error) {
              console.error('[Navigation] ⚠️ Error checking onboarding (defaulting to onboarding):', error);
              router.replace('/onboarding/complete');
              return;
            }

            // CRITICAL FIX: Handle missing user data (0 rows)
            if (!userData) {
              console.log('[Navigation] ⚠️ User not in database (defaulting to onboarding)');
              router.replace('/onboarding/complete');
              return;
            }

            // User exists, check onboarding status
            if (userData.onboarding_completed) {
              console.log('[Navigation] ✅ Onboarding complete, redirecting to home');
              router.replace('/(tabs)/(home)/');
            } else {
              console.log('[Navigation] ⚠️ Onboarding not complete, redirecting to onboarding');
              router.replace('/onboarding/complete');
            }
          } catch (error) {
            console.error('[Navigation] ❌ Onboarding check failed (defaulting to onboarding):', error);
            // CRITICAL: On any error, default to onboarding (safe fallback)
            router.replace('/onboarding/complete');
          }
        }
      } catch (error) {
        console.error('[Navigation] ❌ CRITICAL: Navigation error:', error);
        // CRITICAL: On catastrophic error, go to welcome screen
        try {
          router.replace('/auth/welcome');
        } catch (e) {
          console.error('[Navigation] Failed to navigate to welcome:', e);
        }
      }
    };

    handleNavigation();
  }, [session, segments, isReady, initializing]);

  React.useEffect(() => {
    try {
      if (
        !networkState.isConnected &&
        networkState.isInternetReachable === false
      ) {
        Alert.alert(
          "🔌 You are offline",
          "You can keep using the app! Your changes will be saved locally and synced when you are back online."
        );
      }
    } catch (error) {
      console.error('[Network] Error checking network state:', error);
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded || !isReady) {
    console.log('[BOOT] Waiting for app to be ready...', { loaded, isReady });
    return null;
  }

  console.log('[BOOT] ========== APP READY - RENDERING UI ==========');

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(15, 76, 129)",
      background: "rgb(255, 255, 255)",
      card: "rgb(248, 250, 252)",
      text: "rgb(30, 41, 59)",
      border: "rgb(226, 232, 240)",
      notification: "rgb(239, 68, 68)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(15, 76, 129)",
      background: "rgb(10, 25, 41)",
      card: "rgb(30, 41, 59)",
      text: "rgb(241, 245, 249)",
      border: "rgb(51, 65, 85)",
      notification: "rgb(239, 68, 68)",
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <WidgetProvider>
          <GestureHandlerRootView>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              
              <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
              <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              
              <Stack.Screen
                name="onboarding/complete"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="add-food-simple"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="add-food"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="food-details"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="barcode-scan"
                options={{
                  headerShown: false,
                  presentation: "fullScreenModal",
                }}
              />
              
              <Stack.Screen
                name="quick-add"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="publish"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="ai-meal-estimator"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="my-meal-builder"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meal-details"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meals-list"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="copy-from-previous"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="edit-food"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="edit-goals"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="food-search"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
            </Stack>
            <SystemBars style={"auto"} />
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </>
  );
}

// ============================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutContent />
    </ErrorBoundary>
  );
}
