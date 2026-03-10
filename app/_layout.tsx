
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
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

// RevenueCat Configuration - Must match app/subscription.tsx
const ENTITLEMENT_IDENTIFIER = 'Macrogoal Pro';

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
  const [currentRevenueCatUserId, setCurrentRevenueCatUserId] = useState<string | null>(null);

  // Initialize RevenueCat when user logs in
  const initializeRevenueCat = React.useCallback(async (userId: string) => {
    if (Platform.OS === 'web') {
      console.log('[RevenueCat] Web platform - skipping initialization');
      return;
    }

    // Check if already initialized for this specific user
    if (currentRevenueCatUserId === userId) {
      console.log('[RevenueCat] Already initialized for user:', userId);
      return;
    }

    try {
      console.log('[RevenueCat] ========== GLOBAL INITIALIZATION START ==========');
      console.log('[RevenueCat] Platform:', Platform.OS);
      console.log('[RevenueCat] User ID:', userId);
      console.log('[RevenueCat] Previous User ID:', currentRevenueCatUserId || 'none');
      console.log('[RevenueCat] Entitlement Identifier:', ENTITLEMENT_IDENTIFIER);

      const apiKey = Platform.select({
        ios: 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE',
        android: 'goog_YOUR_ANDROID_KEY_HERE', // Replace with actual Android key
      });

      if (!apiKey) {
        console.error('[RevenueCat] ❌ API key not configured for platform:', Platform.OS);
        return;
      }

      console.log('[RevenueCat] Configuring SDK with user ID:', userId);
      console.log('[RevenueCat] API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

      // Enable debug logs
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      // CRITICAL FIX: Always configure with the new user ID
      // This ensures new users get properly connected to RevenueCat
      console.log('[RevenueCat] Configuring SDK (will override previous configuration if any)');
      await Purchases.configure({ 
        apiKey, 
        appUserID: userId 
      });

      console.log('[RevenueCat] ✅ SDK configured successfully');
      setCurrentRevenueCatUserId(userId);

      // Fetch customer info to sync premium status
      console.log('[RevenueCat] Fetching customer info...');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active).join(', ') || 'none');

      const hasPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER] !== 'undefined';
      console.log(`[RevenueCat] Has "${ENTITLEMENT_IDENTIFIER}":`, hasPremium);

      // Sync to Supabase if premium
      if (hasPremium) {
        console.log('[RevenueCat] Syncing premium status to Supabase...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            user_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('[RevenueCat] ❌ Error syncing to Supabase:', updateError);
        } else {
          console.log('[RevenueCat] ✅ Premium status synced to Supabase');
        }
      }

      console.log('[RevenueCat] ========== GLOBAL INITIALIZATION COMPLETE ==========');
    } catch (error: any) {
      console.error('[RevenueCat] ❌ INITIALIZATION ERROR:', error);
      console.error('[RevenueCat] Error name:', error.name);
      console.error('[RevenueCat] Error message:', error.message);
      console.error('[RevenueCat] Error code:', error.code);
      // Don't throw - allow app to continue even if RevenueCat fails
    }
  }, [currentRevenueCatUserId]);

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

      // Initialize RevenueCat if user is logged in
      if (currentSession?.user?.id) {
        console.log('[App] Step 3: Initialize RevenueCat for logged-in user');
        await initializeRevenueCat(currentSession.user.id);
      }

      console.log('[App] Step 4: Setup auth listener');
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        console.log('[App] Auth state changed:', _event, session?.user?.id || 'none');
        setSession(session);

        // Initialize RevenueCat when user signs in or signs up
        if ((_event === 'SIGNED_IN' || _event === 'USER_UPDATED') && session?.user?.id) {
          console.log('[App] User signed in/updated, initializing RevenueCat...');
          await initializeRevenueCat(session.user.id);
        }

        // Reset RevenueCat tracking when user signs out
        if (_event === 'SIGNED_OUT') {
          console.log('[App] User signed out, resetting RevenueCat tracking');
          setCurrentRevenueCatUserId(null);
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

  // Handle deep links for Stripe checkout success/cancel
  useEffect(() => {
    console.log('[DeepLink] Setting up deep link listener');

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DeepLink] Received URL:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      console.log('[DeepLink] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[DeepLink] Processing URL:', url);
      
      const { hostname, path, queryParams } = Linking.parse(url);
      console.log('[DeepLink] Parsed:', { hostname, path, queryParams });

      // Handle checkout success
      if (queryParams?.subscription_success === 'true') {
        console.log('[DeepLink] ✅ Checkout success detected!');
        console.log('[DeepLink] Session ID:', queryParams.session_id);
        
        // Show immediate feedback
        Alert.alert(
          '✅ Payment Successful!',
          'Processing your subscription... This will take just a moment.',
          [{ text: 'OK' }]
        );
        
        // Navigate to profile with proper delay
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 300);
        
        // Sync subscription in background with retries
        console.log('[DeepLink] 🔄 Starting subscription sync with retries...');
        
        const syncWithRetries = async (maxRetries = 10, delayMs = 2000) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`[DeepLink] 🔄 Sync attempt ${attempt}/${maxRetries}`);
              
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                console.error('[DeepLink] ❌ No session found');
                break;
              }

              // Call sync-subscription Edge Function
              const { data, error } = await supabase.functions.invoke('sync-subscription', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              });

              if (error) {
                console.error(`[DeepLink] ⚠️ Sync attempt ${attempt} failed:`, error);
              } else {
                console.log(`[DeepLink] ✅ Sync attempt ${attempt} succeeded:`, data);
              }

              // Check if user is now premium
              const { data: userData } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', session.user.id)
                .maybeSingle();

              if (userData?.user_type === 'premium') {
                console.log('[DeepLink] 🎉 Premium status confirmed!');
                
                // Show success message
                Alert.alert(
                  '🎉 Welcome to Premium!',
                  'Your subscription is now active. Enjoy unlimited AI-powered meal estimates and all premium features!',
                  [{ text: 'Awesome!' }]
                );
                
                return; // Success, stop retrying
              }

              // Wait before next retry
              if (attempt < maxRetries) {
                console.log(`[DeepLink] ⏳ Waiting ${delayMs}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
            } catch (error) {
              console.error(`[DeepLink] ❌ Error in sync attempt ${attempt}:`, error);
            }
          }

          // If we get here, all retries failed
          console.log('[DeepLink] ⚠️ Premium status not confirmed after all retries');
          Alert.alert(
            'Processing...',
            'Your payment is being processed. Premium features will be unlocked shortly. If this takes more than a few minutes, please contact support.',
            [{ text: 'OK' }]
          );
        };

        // Run sync in background
        syncWithRetries().catch(error => {
          console.error('[DeepLink] ❌ Error in syncWithRetries:', error);
        });
      }

      // Handle checkout cancel
      else if (queryParams?.subscription_cancelled === 'true') {
        console.log('[DeepLink] ❌ Checkout cancelled');
        setTimeout(() => {
          router.replace('/subscription');
        }, 300);
        Alert.alert(
          'Checkout Cancelled',
          'You can subscribe anytime to unlock premium features.',
          [{ text: 'OK' }]
        );
      }

      // Handle subscription error
      else if (queryParams?.subscription_error === 'true') {
        console.log('[DeepLink] ⚠️ Subscription error detected');
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 300);
        Alert.alert(
          'Processing Issue',
          'There was an issue processing your payment. Please check your subscription status or contact support if you were charged.',
          [{ text: 'OK' }]
        );
      }

      console.log('[DeepLink] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('[DeepLink] ❌ Error handling deep link:', error);
    }
  };

  // Listen for app state changes to sync subscription when returning from background
  useEffect(() => {
    console.log('[AppState] Setting up app state listener');
    
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AppState] App became active, checking for subscription updates...');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Sync subscription when app comes to foreground
            const { data, error } = await supabase.functions.invoke('sync-subscription', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (error) {
              console.error('[AppState] Error syncing subscription:', error);
            } else {
              console.log('[AppState] ✅ Subscription synced:', data);
            }
          }
        } catch (error) {
          console.error('[AppState] Error in sync:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
