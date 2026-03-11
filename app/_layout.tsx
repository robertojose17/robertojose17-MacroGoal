
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, AppState, AppStateStatus, Platform } from "react-native";
import { useNetworkState } from "expo-network";
import * as Linking from "expo-linking";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { initializeFoodDatabase } from "@/utils/foodDatabase";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Purchases from "react-native-purchases";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Initialize RevenueCat SDK
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      console.log('[RevenueCat] Initializing SDK...');
      
      // Check if already configured
      if (Purchases.isConfigured) {
        console.log('[RevenueCat] SDK already configured');
        return;
      }

      // Get API key based on platform
      const apiKey = Platform.select({
        ios: 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE', // Your iOS Public SDK Key
        android: 'goog_YOUR_ANDROID_KEY_HERE', // Replace with your Android key when ready
      });

      if (!apiKey) {
        console.warn('[RevenueCat] No API key for this platform');
        return;
      }

      // Configure SDK without user ID initially
      await Purchases.configure({ apiKey });
      console.log('[RevenueCat] ✅ SDK configured successfully');

      // Set up customer info update listener
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('[RevenueCat] Customer info updated:', {
          activeEntitlements: Object.keys(customerInfo.entitlements.active),
          activeSubscriptions: customerInfo.activeSubscriptions,
        });
      });

    } catch (error) {
      console.error('[RevenueCat] ❌ Failed to initialize SDK:', error);
    }
  };

  // Handle RevenueCat user login/logout based on Supabase auth
  useEffect(() => {
    if (!session) return;

    const handleRevenueCatAuth = async () => {
      try {
        const userId = session.user.id;
        console.log('[RevenueCat] Logging in user:', userId);

        // Log in to RevenueCat with Supabase user ID
        const { customerInfo, created } = await Purchases.logIn(userId);
        
        console.log('[RevenueCat] ✅ User logged in:', {
          userId,
          isNewUser: created,
          activeEntitlements: Object.keys(customerInfo.entitlements.active),
        });

      } catch (error) {
        console.error('[RevenueCat] ❌ Failed to log in user:', error);
      }
    };

    handleRevenueCatAuth();
  }, [session]);

  // Initialize app and auth
  useEffect(() => {
    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  const initializeApp = async () => {
    console.log('[App] ========== STARTUP INITIALIZATION ==========');
    
    try {
      console.log('[App] Step 1: Initialize food database (non-blocking)');
      
      // Let food database init run in background
      initializeFoodDatabase()
        .then(() => console.log('[App] ✅ Food database initialized'))
        .catch(error => console.error('[App] ⚠️ Food database init failed (non-blocking):', error));

      console.log('[App] Step 2: Get current session');
      
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session || null;
      console.log('[App] ✅ Session retrieved:', currentSession?.user?.id || 'none');
      
      setSession(currentSession);

      console.log('[App] Step 3: Setup auth listener');
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[App] Auth state changed:', event, session?.user?.id || 'none');
        setSession(session);

        // Handle RevenueCat logout when user signs out
        if (event === 'SIGNED_OUT') {
          try {
            await Purchases.logOut();
            console.log('[RevenueCat] ✅ User logged out');
          } catch (error) {
            console.error('[RevenueCat] ❌ Failed to log out:', error);
          }
        }
      });

      console.log('[App] ✅ Initialization complete');
      setIsReady(true);
      
      // Hide splash screen
      setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
          console.log('[App] ✅ Splash screen hidden');
        } catch (e) {
          console.error('[App] Error hiding splash:', e);
        }
      }, 300);

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('[App] ❌ CRITICAL: Initialization failed:', error);
      
      // Even on error, app must load
      setIsReady(true);
      
      setTimeout(async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.error('[App] Error hiding splash:', e);
        }
      }, 300);
    }
  };

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady || !navigationState?.key) {
      console.log('[Navigation] Not ready yet, waiting...');
      return;
    }

    if (hasNavigated) {
      console.log('[Navigation] Already navigated, skipping');
      return;
    }

    const handleNavigation = async () => {
      console.log('[Navigation] ========== CHECKING AUTH STATE ==========');
      console.log('[Navigation] Current segments:', segments);
      console.log('[Navigation] Session:', session?.user?.id || 'none');

      const inAuthGroup = segments[0] === 'auth';
      const inTabsGroup = segments[0] === '(tabs)';
      const inOnboarding = segments[0] === 'onboarding';

      // If no session, ensure we're in auth flow
      if (!session) {
        if (!inAuthGroup) {
          console.log('[Navigation] No session, redirecting to welcome');
          setHasNavigated(true);
          router.replace('/auth/welcome');
        }
        return;
      }

      // If we have a session, check onboarding status
      console.log('[Navigation] Session found, checking onboarding...');
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !userData) {
          console.log('[Navigation] User data not found, redirecting to onboarding');
          if (!inOnboarding) {
            setHasNavigated(true);
            router.replace('/onboarding/complete');
          }
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Navigation] Onboarding complete, redirecting to home');
          if (!inTabsGroup) {
            setHasNavigated(true);
            router.replace('/(tabs)/(home)/');
          }
        } else {
          console.log('[Navigation] Onboarding incomplete, redirecting to onboarding');
          if (!inOnboarding) {
            setHasNavigated(true);
            router.replace('/onboarding/complete');
          }
        }
      } catch (error) {
        console.error('[Navigation] Error checking onboarding:', error);
      }

      console.log('[Navigation] ========== NAVIGATION CHECK COMPLETE ==========');
    };

    // Small delay to ensure navigation is ready
    const timer = setTimeout(handleNavigation, 100);
    return () => clearTimeout(timer);
  }, [isReady, session, segments, navigationState, hasNavigated]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded || !isReady) {
    return null;
  }

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" animated />
        <ThemeProvider
          value={CustomDefaultTheme}
        >
          <WidgetProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              
              <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
              <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
              
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
                name="barcode-scanner"
                options={{
                  headerShown: false,
                  presentation: "fullScreenModal",
                }}
              />
              
              <Stack.Screen
                name="subscription"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
            </Stack>
            <SystemBars style={"dark"} />
          </WidgetProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
