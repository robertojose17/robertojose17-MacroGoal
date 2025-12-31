
import "react-native-reanimated";
import React, { useEffect, useState, useRef } from "react";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, AppState, AppStateStatus } from "react-native";
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
import { supabase } from "@/app/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const segments = useSegments();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Track if we're currently syncing to avoid duplicate syncs
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  const initializeApp = async () => {
    console.log('[App] ========== STARTUP INITIALIZATION ==========');
    
    // CRITICAL: Set a hard timeout for initialization
    const initTimeout = setTimeout(() => {
      console.error('[App] ⏱️ INITIALIZATION TIMEOUT - Forcing app to load');
      setIsReady(true);
      setInitializing(false);
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));
    }, 10000); // 10 second hard timeout

    try {
      console.log('[App] Step 1: Initialize food database (non-blocking)');
      
      // CRITICAL FIX: Do NOT await food database initialization
      // Let it run in background, app must load regardless
      initializeFoodDatabase()
        .then(() => console.log('[App] ✅ Food database initialized'))
        .catch(error => console.error('[App] ⚠️ Food database init failed (non-blocking):', error));

      console.log('[App] Step 2: Get current session');
      
      // CRITICAL FIX: Add timeout to session fetch
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      );
      
      let currentSession: Session | null = null;
      try {
        const { data } = await Promise.race([sessionPromise, sessionTimeout]) as any;
        currentSession = data?.session || null;
        console.log('[App] ✅ Session retrieved:', currentSession?.user?.id || 'none');
      } catch (error) {
        console.error('[App] ⚠️ Session fetch failed (non-blocking):', error);
        currentSession = null;
      }
      
      setSession(currentSession);

      console.log('[App] Step 3: Setup auth listener');
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[App] Auth state changed:', _event, session?.user?.id || 'none');
        setSession(session);
      });

      console.log('[App] ✅ Initialization complete');
      
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      
      // Hide splash screen with error handling
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('[App] ❌ CRITICAL: Initialization failed:', error);
      
      // CRITICAL: Even on error, app must load
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Aggressive subscription refresh with retry logic
  // ═══════════════════════════════════════════════════════════════════════════
  const refreshSubscriptionStatus = async (maxRetries = 10, delayMs = 2000) => {
    // Prevent duplicate syncs
    if (isSyncingRef.current) {
      console.log('[App] 🔄 Sync already in progress, skipping...');
      return;
    }

    isSyncingRef.current = true;

    try {
      console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[App] 🔄 Starting aggressive subscription refresh');
      console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[App] ❌ No session, cannot refresh subscription');
        return;
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[App] 🔄 Refresh attempt ${attempt}/${maxRetries}`);

        try {
          // Call sync-subscription Edge Function
          const { data, error } = await supabase.functions.invoke('sync-subscription', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) {
            console.error(`[App] ⚠️ Sync attempt ${attempt} failed:`, error);
          } else {
            console.log(`[App] ✅ Sync attempt ${attempt} response:`, data);
          }

          // Check if user is now premium
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_type')
            .eq('id', session.user.id)
            .maybeSingle();

          if (userError) {
            console.error(`[App] ⚠️ Error checking user type:`, userError);
          } else {
            console.log(`[App] 📊 User type after attempt ${attempt}:`, userData?.user_type);

            if (userData?.user_type === 'premium') {
              console.log('[App] 🎉 PREMIUM STATUS CONFIRMED!');
              console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              return; // Success, stop retrying
            }
          }

          // Wait before next retry
          if (attempt < maxRetries) {
            console.log(`[App] ⏳ Waiting ${delayMs}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error(`[App] ❌ Error in refresh attempt ${attempt}:`, error);
        }
      }

      console.log('[App] ⚠️ Premium status not confirmed after all retries');
      console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } finally {
      isSyncingRef.current = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Enhanced deep link handling for iOS Stripe checkout redirect
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[DeepLink] 🔗 Setting up deep link listener for iOS Stripe redirect');

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] 📱 Initial URL detected:', url);
        handleDeepLink(url);
      }
    });

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DeepLink] 📱 Deep link received:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      console.log('[DeepLink] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[DeepLink] 🔍 Processing deep link URL:', url);
      
      const { hostname, path, queryParams } = Linking.parse(url);
      console.log('[DeepLink] 📊 Parsed components:', { hostname, path, queryParams });

      // ═══════════════════════════════════════════════════════════════════════
      // HANDLE CHECKOUT SUCCESS
      // ═══════════════════════════════════════════════════════════════════════
      if (queryParams?.payment_success === 'true') {
        console.log('[DeepLink] ✅ CHECKOUT SUCCESS DETECTED!');
        console.log('[DeepLink] 📋 Session ID:', queryParams.session_id);
        
        // Show immediate feedback to user
        Alert.alert(
          '✅ Payment Successful!',
          'Your payment has been processed. We\'re activating your premium features now...',
          [{ text: 'OK' }]
        );
        
        // Navigate to profile immediately (don't wait for sync)
        console.log('[DeepLink] 🚀 Navigating to profile...');
        router.replace('/(tabs)/profile');
        
        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL: Start aggressive subscription refresh in background
        // ═══════════════════════════════════════════════════════════════════
        console.log('[DeepLink] 🔄 Starting background subscription refresh...');
        
        // Wait a moment for the webhook to process
        setTimeout(() => {
          refreshSubscriptionStatus(15, 2000).then(() => {
            // After sync completes, show final status
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                supabase
                  .from('users')
                  .select('user_type')
                  .eq('id', session.user.id)
                  .maybeSingle()
                  .then(({ data: userData }) => {
                    if (userData?.user_type === 'premium') {
                      Alert.alert(
                        '🎉 Welcome to Premium!',
                        'Your subscription is now active. Enjoy unlimited AI-powered meal estimates and all premium features!',
                        [{ text: 'Awesome!' }]
                      );
                    } else {
                      Alert.alert(
                        'Almost There!',
                        'Your payment was successful, but premium activation is taking longer than expected. Please wait a few minutes and pull down to refresh your profile. If the issue persists, contact support with your payment confirmation.',
                        [{ text: 'OK' }]
                      );
                    }
                  });
              }
            });
          });
        }, 3000); // Wait 3 seconds for webhook to process
      }

      // ═══════════════════════════════════════════════════════════════════════
      // HANDLE CHECKOUT CANCEL
      // ═══════════════════════════════════════════════════════════════════════
      else if (queryParams?.payment_cancelled === 'true') {
        console.log('[DeepLink] ❌ Checkout cancelled by user');
        router.replace('/(tabs)/profile');
        Alert.alert(
          'Checkout Cancelled',
          'You can subscribe anytime to unlock premium features.',
          [{ text: 'OK' }]
        );
      }

      // ═══════════════════════════════════════════════════════════════════════
      // HANDLE SUBSCRIPTION ERROR
      // ═══════════════════════════════════════════════════════════════════════
      else if (queryParams?.subscription_error === 'true') {
        console.log('[DeepLink] ⚠️ Subscription error detected');
        router.replace('/(tabs)/profile');
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Listen for app state changes to sync when returning from background
  // This handles the case where the user returns to the app after payment
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[AppState] 📱 Setting up app state listener');
    
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AppState] ✅ App became active, refreshing subscription...');
        
        // Refresh subscription when app comes to foreground
        // Use fewer retries for regular app resume (not from checkout)
        await refreshSubscriptionStatus(5, 2000);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
          
          const onboardingTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Onboarding check timeout')), 5000)
          );
          
          try {
            const { data: userData, error } = await Promise.race([
              onboardingPromise, 
              onboardingTimeout
            ]) as any;

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
        router.replace('/auth/welcome');
      }
    };

    handleNavigation();
  }, [session, segments, isReady, initializing]);

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
    <>
      <StatusBar style="dark" animated />
      <ThemeProvider
        value={CustomDefaultTheme}
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
            </Stack>
            <SystemBars style={"dark"} />
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </>
  );
}
