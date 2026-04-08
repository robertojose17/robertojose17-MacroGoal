
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme, Alert, AppState, AppStateStatus, Platform, View } from "react-native";
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
import { AdBannerProvider } from "@/components/AdBannerContext";
import { initializeFoodDatabase } from "@/utils/foodDatabase";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Constants from "expo-constants";

import Purchases, { LOG_LEVEL } from '@/utils/purchases';
import mobileAds from '@/utils/mobileAds';

// Wrap in functions so call-sites don't need to change
function loadPurchases(): { Purchases: any; LOG_LEVEL: any } {
  return { Purchases, LOG_LEVEL };
}

function loadMobileAds(): any {
  return mobileAds;
}

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const segments = useSegments();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hasNavigatedRef = React.useRef(false);

  // Set up auth listener FIRST — INITIAL_SESSION fires with the authoritative
  // session state on app start, avoiding the AsyncStorage race on iOS cold start.
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('[App] Auth event:', event, 'User:', newSession?.user?.id || 'none');

      if (event === 'INITIAL_SESSION') {
        // Authoritative session state on app start
        setSession(newSession);
        setIsReady(true);
        SplashScreen.hideAsync().catch(() => {});

        // Non-blocking: food database
        initializeFoodDatabase().catch(e => console.warn('[App] Food DB init failed:', e));

        // Non-blocking: AdMob
        const mobileAdsInstance = loadMobileAds();
        if (mobileAdsInstance) {
          mobileAdsInstance.initialize()
            .then(() => console.log('[App] AdMob initialized'))
            .catch((err: unknown) => console.warn('[App] AdMob init failed (non-blocking):', err));
        }

        // Non-blocking: RevenueCat (native only)
        const { Purchases: rc, LOG_LEVEL: ll } = loadPurchases();
        if (rc) {
          (async () => {
            try {
              const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
              const apiKey = Platform.select({
                ios: revenueCatConfig?.iosApiKey,
                android: revenueCatConfig?.androidApiKey,
              });
              if (apiKey && !apiKey.includes('YOUR')) {
                await rc.configure({ apiKey });
                if (__DEV__) await rc.setLogLevel(ll.DEBUG);
                if (newSession?.user?.id) {
                  const { customerInfo } = await rc.logIn(newSession.user.id);
                  console.log('[App] RevenueCat user identified:', newSession.user.id);
                  console.log('[App] Active entitlements:', Object.keys(customerInfo.entitlements.active));
                  if (newSession.user.email) await rc.setEmail(newSession.user.email);
                }
              }
            } catch (e) {
              console.warn('[App] RevenueCat init failed (non-blocking):', e);
            }
          })();
        }
        return;
      }

      if (event === 'SIGNED_IN') {
        setSession(newSession);
        hasNavigatedRef.current = false; // Allow re-navigation on sign in
        const { Purchases: rc } = loadPurchases();
        if (rc && newSession?.user?.id) {
          rc.logIn(newSession.user.id).catch((e: unknown) => console.warn('[App] RC logIn failed:', e));
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        hasNavigatedRef.current = false;
        const { Purchases: rc } = loadPurchases();
        if (rc) rc.logOut().catch(() => {});
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Silently refresh — don't update session state to avoid re-triggering navigation
        return;
      }
    });

    // Hard 8s fallback — if INITIAL_SESSION never fires, show the app anyway
    const hardTimeout = setTimeout(() => {
      if (!mounted) return;
      console.warn('[App] Hard 8s timeout — forcing ready without session');
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (segments.length === 0) return; // Router not mounted yet
    if (hasNavigatedRef.current) return; // Already navigated

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';

    const navigate = async () => {
      if (!session) {
        if (!inAuthGroup) {
          console.log('[Navigation] No session → signup');
          router.replace('/auth/signup');
          hasNavigatedRef.current = true;
        }
        return;
      }

      if (inTabsGroup || inOnboarding) {
        hasNavigatedRef.current = true;
        return;
      }

      // Check onboarding with timeout
      try {
        const result = await Promise.race([
          supabase.from('users').select('onboarding_completed').eq('id', session.user.id).maybeSingle(),
          new Promise<{ data: null; error: Error }>(resolve =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 3000)
          ),
        ]);

        if (!result.data || result.error) {
          console.log('[Navigation] No user data → onboarding');
          router.replace('/onboarding/complete');
        } else if (result.data.onboarding_completed) {
          console.log('[Navigation] Onboarding done → home');
          router.replace('/(tabs)/(home)/');
        } else {
          console.log('[Navigation] Onboarding incomplete → onboarding');
          router.replace('/onboarding/complete');
        }
      } catch (e) {
        console.error('[Navigation] Error:', e);
        router.replace('/(tabs)/(home)/');
      }
      hasNavigatedRef.current = true;
    };

    navigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, session, segments]);

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

  // Listen for app state changes to sync subscription when returning from background.
  // We track the previous state so the handler only fires on genuine foreground
  // transitions (background/inactive → active), NOT on the initial mount event.
  useEffect(() => {
    console.log('[AppState] Setting up app state listener');
    let previousAppState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const wasBackground = previousAppState === 'background' || previousAppState === 'inactive';
      const isNowActive = nextAppState === 'active';
      previousAppState = nextAppState;

      if (!wasBackground || !isNowActive) {
        return; // Ignore initial mount fire and non-foreground transitions
      }

      console.log('[AppState] App foregrounded, checking for subscription updates...');

      // Hard 5s timeout so a slow/hanging Edge Function never blocks anything
      const syncTimeout = new Promise<void>(resolve => setTimeout(resolve, 5000));

      const doSync = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data, error } = await supabase.functions.invoke('sync-subscription', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (error) {
            console.error('[AppState] Error syncing subscription:', error);
          } else {
            console.log('[AppState] ✅ Subscription synced:', data);
          }
        } catch (error) {
          console.error('[AppState] Error in sync:', error);
        }
      };

      Promise.race([doSync(), syncTimeout]).catch(err =>
        console.error('[AppState] Sync race error:', err)
      );
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

  // Only block on isReady (auth + session resolved). Font loading is non-blocking
  // — the app renders fine with system fonts while custom fonts finish loading.
  if (!isReady) {
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
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" animated />
        <ThemeProvider value={CustomDefaultTheme}>
          <WidgetProvider>
            {/* AdBannerProvider at root is a no-op (isPremium=true) so that any
                useAdBanner() call outside the authenticated (tabs) zone returns
                zero height and never renders an ad. The real provider with the
                correct isPremium value lives inside app/(tabs)/_layout.tsx. */}
            <AdBannerProvider isPremium={true}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                
                <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
                <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
                
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
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="food-search"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="my-foods"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="barcode-lookup"
                  options={{
                    headerShown: false,
                    presentation: "modal",
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
                  name="ai-meal-estimator"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="my-foods-edit"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                  }}
                />

                <Stack.Screen
                  name="my-foods-create"
                  options={{
                    headerShown: false,
                    presentation: "modal",
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

                <Stack.Screen
                  name="tracker/[id]"
                  options={{
                    headerShown: true,
                    headerBackButtonDisplayMode: 'minimal',
                    title: '',
                  }}
                />
                <Stack.Screen
                  name="tracker/log"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5, 0.75],
                    headerShown: true,
                    title: 'Log Entry',
                  }}
                />
                <Stack.Screen
                  name="tracker/create"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.75, 1.0],
                    headerShown: true,
                    title: 'New Tracker',
                  }}
                />
              </Stack>
            </AdBannerProvider>
          </WidgetProvider>
        </ThemeProvider>
      </View>
    </ErrorBoundary>
  );
}
