
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
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Constants from "expo-constants";

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

      console.log('[App] Step 3: Initialize RevenueCat (native only)');
      
      // Initialize RevenueCat on native platforms
      if (Platform.OS !== 'web') {
        try {
          const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
          const apiKey = Platform.select({
            ios: revenueCatConfig?.iosApiKey,
            android: revenueCatConfig?.androidApiKey,
          });

          if (apiKey && !apiKey.includes('YOUR')) {
            // CRITICAL FIX: Configure RevenueCat WITHOUT an initial appUserID
            // This allows each user to be identified separately when they log in
            console.log('[App] Configuring RevenueCat with anonymous user (will identify on login)');
            
            await Purchases.configure({
              apiKey,
              // DO NOT set appUserID here - let RevenueCat create an anonymous ID
              // We'll call Purchases.logIn() when the user authenticates
            });

            // Enable debug logs in development
            if (__DEV__) {
              await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            }

            console.log('[App] ✅ RevenueCat initialized (anonymous)');

            // If we already have a session, identify the user immediately
            if (currentSession?.user?.id) {
              console.log('[App] Current session found, identifying user with RevenueCat');
              try {
                const { customerInfo } = await Purchases.logIn(currentSession.user.id);
                console.log('[App] ✅ User identified with RevenueCat:', currentSession.user.id);
                console.log('[App] Active entitlements:', Object.keys(customerInfo.entitlements.active));
              } catch (loginError) {
                console.error('[App] ⚠️ Failed to identify user with RevenueCat:', loginError);
              }
            }
          } else {
            console.log('[App] ⚠️ RevenueCat API keys not configured - skipping initialization');
          }
        } catch (revenueCatError) {
          console.error('[App] ⚠️ RevenueCat initialization failed (non-blocking):', revenueCatError);
        }
      }

      console.log('[App] Step 4: Setup auth listener');
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[App] Auth state changed:', event);
        console.log('[App] User ID:', session?.user?.id || 'none');
        console.log('[App] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        setSession(session);

        // Update RevenueCat user ID when auth state changes (native only)
        if (Platform.OS !== 'web') {
          if (event === 'SIGNED_IN' && session?.user?.id) {
            // User logged in - identify them with RevenueCat
            try {
              console.log('[App] 🔐 User signed in, identifying with RevenueCat:', session.user.id);
              const { customerInfo } = await Purchases.logIn(session.user.id);
              console.log('[App] ✅ RevenueCat user identified:', session.user.id);
              console.log('[App] Active entitlements:', Object.keys(customerInfo.entitlements.active));
              console.log('[App] Original App User ID:', customerInfo.originalAppUserId);
            } catch (error) {
              console.error('[App] ❌ Failed to identify user with RevenueCat:', error);
            }
          } else if (event === 'SIGNED_OUT') {
            // User logged out - reset RevenueCat to anonymous
            try {
              console.log('[App] 🚪 User signed out, resetting RevenueCat to anonymous');
              const { customerInfo } = await Purchases.logOut();
              console.log('[App] ✅ RevenueCat user logged out (now anonymous)');
              console.log('[App] New anonymous ID:', customerInfo.originalAppUserId);
            } catch (error) {
              console.error('[App] ⚠️ Failed to log out RevenueCat user:', error);
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user?.id) {
            // Token refreshed - ensure user is still identified
            try {
              console.log('[App] 🔄 Token refreshed, verifying RevenueCat user ID');
              const currentInfo = await Purchases.getCustomerInfo();
              
              // Check if the current RevenueCat user matches the session user
              if (currentInfo.originalAppUserId !== session.user.id) {
                console.log('[App] ⚠️ RevenueCat user ID mismatch, re-identifying');
                console.log('[App] Expected:', session.user.id);
                console.log('[App] Current:', currentInfo.originalAppUserId);
                
                const { customerInfo } = await Purchases.logIn(session.user.id);
                console.log('[App] ✅ RevenueCat user re-identified:', session.user.id);
                console.log('[App] Active entitlements:', Object.keys(customerInfo.entitlements.active));
              } else {
                console.log('[App] ✅ RevenueCat user ID matches session');
              }
            } catch (error) {
              console.error('[App] ⚠️ Failed to verify RevenueCat user ID:', error);
            }
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
        <ThemeProvider value={CustomDefaultTheme}>
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
            <SystemBars style="dark" />
          </WidgetProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
</write file>

Now let's also update the subscription screen to ensure it properly identifies users:

<write file="app/subscription.tsx">
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import Purchases, { 
  PurchasesPackage, 
  PurchasesOffering,
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import Constants from 'expo-constants';

// Premium features list
const PREMIUM_FEATURES = [
  'Advanced analytics & trends',
  'Multiple goal phases',
  'Custom recipes builder',
  'Habit tracking & streaks',
  'Data export (CSV)',
  'Priority support',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize RevenueCat and fetch offerings
  const initializeRevenueCat = async () => {
    if (Platform.OS === 'web') {
      console.log('[Subscription] Web platform - RevenueCat not available');
      setLoading(false);
      return;
    }

    try {
      console.log('[Subscription] ========== INITIALIZING REVENUECAT ==========');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Subscription] ❌ No user found');
        setErrorMessage('Please log in to view subscriptions');
        setLoading(false);
        return;
      }

      console.log('[Subscription] Current user ID:', user.id);

      // Get RevenueCat configuration from app.json
      const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
      console.log('[Subscription] RevenueCat config:', {
        hasConfig: !!revenueCatConfig,
        iosApiKey: revenueCatConfig?.iosApiKey?.substring(0, 10) + '...',
        androidApiKey: revenueCatConfig?.androidApiKey?.substring(0, 10) + '...',
        offeringIdentifier: revenueCatConfig?.offeringIdentifier,
        entitlementIdentifier: revenueCatConfig?.entitlementIdentifier,
      });

      const apiKey = Platform.select({
        ios: revenueCatConfig?.iosApiKey,
        android: revenueCatConfig?.androidApiKey,
      });

      console.log('[Subscription] Platform:', Platform.OS);
      console.log('[Subscription] API Key exists:', !!apiKey);
      console.log('[Subscription] API Key starts with:', apiKey?.substring(0, 10));

      // Check if API key is configured
      if (!apiKey) {
        const errorMsg = 'RevenueCat API key not found in configuration';
        console.error('[Subscription] ❌', errorMsg);
        setErrorMessage(errorMsg);
        setLoading(false);
        return;
      }

      if (apiKey.includes('YOUR')) {
        const errorMsg = `RevenueCat API key not configured for ${Platform.OS}. Please add your ${Platform.OS === 'ios' ? 'iOS' : 'Android'} API key to app.json`;
        console.error('[Subscription] ❌', errorMsg);
        setErrorMessage(errorMsg);
        setLoading(false);
        return;
      }

      // CRITICAL: Ensure the user is identified with RevenueCat
      console.log('[Subscription] Ensuring user is identified with RevenueCat...');
      try {
        // First, check if RevenueCat is already configured
        const currentInfo = await Purchases.getCustomerInfo();
        console.log('[Subscription] Current RevenueCat user:', currentInfo.originalAppUserId);
        
        // If the current RevenueCat user doesn't match the logged-in user, identify them
        if (currentInfo.originalAppUserId !== user.id) {
          console.log('[Subscription] ⚠️ RevenueCat user mismatch, identifying correct user');
          console.log('[Subscription] Expected:', user.id);
          console.log('[Subscription] Current:', currentInfo.originalAppUserId);
          
          const { customerInfo: newInfo } = await Purchases.logIn(user.id);
          console.log('[Subscription] ✅ User identified with RevenueCat:', user.id);
          console.log('[Subscription] Active entitlements:', Object.keys(newInfo.entitlements.active));
        } else {
          console.log('[Subscription] ✅ RevenueCat user already matches session user');
        }
      } catch (identifyError) {
        console.error('[Subscription] ⚠️ Error identifying user:', identifyError);
        // Continue anyway - the user might still be able to purchase
      }

      // Fetch offerings
      console.log('[Subscription] Fetching offerings...');
      const offeringsResponse = await Purchases.getOfferings();
      
      console.log('[Subscription] Offerings response:', {
        hasCurrent: !!offeringsResponse.current,
        currentIdentifier: offeringsResponse.current?.identifier,
        allOfferingsCount: Object.keys(offeringsResponse.all).length,
        allOfferingIds: Object.keys(offeringsResponse.all),
      });

      // Try to get the specific offering by identifier first
      const offeringIdentifier = revenueCatConfig?.offeringIdentifier;
      let targetOffering = offeringsResponse.current;

      if (offeringIdentifier && offeringsResponse.all[offeringIdentifier]) {
        console.log('[Subscription] Using specific offering:', offeringIdentifier);
        targetOffering = offeringsResponse.all[offeringIdentifier];
      } else if (offeringsResponse.current) {
        console.log('[Subscription] Using current offering:', offeringsResponse.current.identifier);
      } else if (Object.keys(offeringsResponse.all).length > 0) {
        // Use the first available offering
        const firstOfferingKey = Object.keys(offeringsResponse.all)[0];
        console.log('[Subscription] Using first available offering:', firstOfferingKey);
        targetOffering = offeringsResponse.all[firstOfferingKey];
      }

      if (targetOffering && targetOffering.availablePackages.length > 0) {
        console.log('[Subscription] ✅ Offering found:', {
          identifier: targetOffering.identifier,
          packagesCount: targetOffering.availablePackages.length,
          packageIdentifiers: targetOffering.availablePackages.map(p => p.identifier),
        });

        setOfferings(targetOffering);
        setPackages(targetOffering.availablePackages);

        // Log package details
        targetOffering.availablePackages.forEach((pkg, index) => {
          console.log(`[Subscription] Package ${index + 1}:`, {
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            productId: pkg.product.identifier,
            title: pkg.product.title,
            price: pkg.product.priceString,
          });
        });
      } else {
        console.warn('[Subscription] ⚠️ No offerings or packages available');
        console.log('[Subscription] Debug info:', {
          hasOfferings: Object.keys(offeringsResponse.all).length > 0,
          offeringIds: Object.keys(offeringsResponse.all),
          currentOffering: offeringsResponse.current?.identifier,
          configuredOffering: offeringIdentifier,
        });

        const errorMsg = `No subscription plans currently available.\n\nPlease ensure:\n1. Products are created in RevenueCat\n2. Offering "${offeringIdentifier || 'default'}" is configured\n3. Products are linked to the offering\n\nCurrent offerings: ${Object.keys(offeringsResponse.all).join(', ') || 'none'}`;
        setErrorMessage(errorMsg);
      }

      // Check current premium status
      console.log('[Subscription] Checking customer info...');
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      const entitlementIdentifier = revenueCatConfig?.entitlementIdentifier || 'Macrogoal Pro';
      const hasActiveEntitlement = info.entitlements.active[entitlementIdentifier]?.isActive || false;
      
      console.log('[Subscription] Customer info:', {
        originalAppUserId: info.originalAppUserId,
        hasActiveEntitlements: Object.keys(info.entitlements.active).length > 0,
        activeEntitlements: Object.keys(info.entitlements.active),
        targetEntitlement: entitlementIdentifier,
        isPremium: hasActiveEntitlement,
      });

      setIsPremium(hasActiveEntitlement);

    } catch (error: any) {
      console.error('[Subscription] ❌ RevenueCat initialization error:', error);
      console.error('[Subscription] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      const errorMsg = `Failed to initialize subscriptions:\n\n${error.message || 'Unknown error'}\n\nPlease check:\n1. RevenueCat API keys are correct\n2. Products are configured in RevenueCat dashboard\n3. Internet connection is active`;
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
      console.log('[Subscription] ========== INITIALIZATION COMPLETE ==========');
    }
  };

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  // Handle purchase
  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'In-app purchases are only available on iOS and Android. Please use the mobile app to subscribe.'
      );
      return;
    }

    if (purchasing) {
      console.log('[Subscription] Purchase already in progress');
      return;
    }

    try {
      console.log('[Subscription] ========== STARTING PURCHASE ==========');
      console.log('[Subscription] Package:', {
        identifier: pkg.identifier,
        productId: pkg.product.identifier,
        price: pkg.product.priceString,
      });

      // Verify user is identified before purchase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to purchase a subscription');
        return;
      }

      console.log('[Subscription] Verifying user identification before purchase...');
      const currentInfo = await Purchases.getCustomerInfo();
      console.log('[Subscription] Current RevenueCat user:', currentInfo.originalAppUserId);
      console.log('[Subscription] Expected user:', user.id);

      if (currentInfo.originalAppUserId !== user.id) {
        console.log('[Subscription] ⚠️ User mismatch detected, re-identifying...');
        await Purchases.logIn(user.id);
        console.log('[Subscription] ✅ User re-identified');
      }

      setPurchasing(true);
      setSelectedPackage(pkg.identifier);

      // Make purchase through RevenueCat
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
      
      console.log('[Subscription] ✅ Purchase successful');
      console.log('[Subscription] Product:', productIdentifier);
      console.log('[Subscription] Customer:', customerInfo.originalAppUserId);
      console.log('[Subscription] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      // Check if premium entitlement is now active
      const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
      const entitlementIdentifier = revenueCatConfig?.entitlementIdentifier || 'Macrogoal Pro';
      const hasActiveEntitlement = customerInfo.entitlements.active[entitlementIdentifier]?.isActive || false;

      setIsPremium(hasActiveEntitlement);
      setCustomerInfo(customerInfo);

      if (hasActiveEntitlement) {
        console.log('[Subscription] ✅ Premium access granted');
        setShowSuccessModal(true);
      } else {
        console.warn('[Subscription] ⚠️ Purchase completed but premium not active');
        Alert.alert(
          'Purchase Completed',
          'Your purchase was successful. Premium access will be activated shortly.'
        );
      }

    } catch (error: any) {
      console.error('[Subscription] ❌ Purchase error:', error);
      console.error('[Subscription] Error details:', {
        message: error.message,
        code: error.code,
        userCancelled: error.userCancelled,
      });
      
      // Handle specific error codes
      if (error.userCancelled) {
        console.log('[Subscription] User cancelled purchase');
        // Don't show alert for user cancellation
      } else if (error.code === 'PRODUCT_ALREADY_PURCHASED') {
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription. Use "Restore Purchases" if you don\'t see your premium features.'
        );
      } else if (error.code === 'NETWORK_ERROR') {
        Alert.alert(
          'Network Error',
          'Unable to connect to the store. Please check your internet connection and try again.'
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          error.message || 'Unable to complete purchase. Please try again.'
        );
      }
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
      console.log('[Subscription] ========== PURCHASE COMPLETE ==========');
    }
  };

  // Restore purchases
  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Purchase restoration is only available on iOS and Android. Please use the mobile app.'
      );
      return;
    }

    try {
      console.log('[Subscription] ========== RESTORING PURCHASES ==========');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to restore purchases');
        return;
      }

      console.log('[Subscription] Current user:', user.id);
      setLoading(true);

      // CRITICAL: Restore purchases will transfer purchases from the Apple/Google account
      // to the current app user ID. This is how users can access their subscription
      // on multiple app accounts if they use the same Apple/Google ID.
      console.log('[Subscription] Restoring purchases for user:', user.id);
      const info = await Purchases.restorePurchases();
      
      console.log('[Subscription] ✅ Purchases restored');
      console.log('[Subscription] Customer:', info.originalAppUserId);
      console.log('[Subscription] Active entitlements:', Object.keys(info.entitlements.active));

      setCustomerInfo(info);
      
      const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
      const entitlementIdentifier = revenueCatConfig?.entitlementIdentifier || 'Macrogoal Pro';
      const hasActiveEntitlement = info.entitlements.active[entitlementIdentifier]?.isActive || false;
      
      setIsPremium(hasActiveEntitlement);

      if (hasActiveEntitlement) {
        Alert.alert(
          'Success',
          'Your purchases have been restored! You now have access to all premium features.'
        );
      } else {
        Alert.alert(
          'No Active Subscriptions',
          'No active subscriptions were found for this Apple/Google account. If you purchased a subscription with a different app account, you\'ll need to log in to that account to access premium features.'
        );
      }

    } catch (error: any) {
      console.error('[Subscription] ❌ Restore error:', error);
      Alert.alert(
        'Restore Failed',
        error.message || 'Failed to restore purchases. Please try again.'
      );
    } finally {
      setLoading(false);
      console.log('[Subscription] ========== RESTORE COMPLETE ==========');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Go Premium
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.webMessageContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={64}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.webMessageTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Premium Subscriptions
          </Text>
          <Text style={[styles.webMessageText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            In-app purchases are only available on iOS and Android devices.
          </Text>
          <Text style={[styles.webMessageText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Please download the mobile app to subscribe to Premium and unlock:
          </Text>
          
          <View style={styles.featuresList}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading subscription options...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if there's an error
  if (errorMessage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Go Premium
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.error + '20' }]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={64}
              color={colors.error}
            />
          </View>
          <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Unable to Load Subscriptions
          </Text>
          <Text style={[styles.errorMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              setErrorMessage(null);
              setLoading(true);
              initializeRevenueCat();
            }}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? colors.cardDark : colors.card, marginTop: spacing.md }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: isDark ? colors.textDark : colors.text }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Premium Status
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.premiumStatusContainer}>
          <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={[styles.premiumTitle, { color: isDark ? colors.textDark : colors.text }]}>
            You&apos;re Premium!
          </Text>
          <Text style={[styles.premiumSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Enjoy unlimited access to all premium features
          </Text>

          <View style={[styles.featuresCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.featuresTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Your Premium Features
            </Text>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: isDark ? colors.textDark : colors.text }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Go Premium
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.heroTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Unlock Premium Features
          </Text>
          <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Take your fitness journey to the next level
          </Text>
        </View>

        {packages.map((pkg, index) => {
          const isSelected = selectedPackage === pkg.identifier;
          const isPurchasingThis = purchasing && isSelected;
          const isPopular = pkg.packageType === 'ANNUAL' || pkg.identifier.toLowerCase().includes('annual') || pkg.identifier.toLowerCase().includes('yearly');

          // Get package details
          const product = pkg.product;
          const title = product.title || pkg.identifier;
          const price = product.priceString;
          const description = product.description || '';

          return (
            <View
              key={pkg.identifier}
              style={[
                styles.planCard,
                { backgroundColor: isDark ? colors.cardDark : colors.card },
                isPopular && styles.popularPlan,
              ]}
            >
              {isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={[styles.planTitle, { color: isDark ? colors.textDark : colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {price}
              </Text>
              {description && (
                <Text style={[styles.planDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {description}
                </Text>
              )}

              <View style={styles.featuresContainer}>
                {PREMIUM_FEATURES.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  { backgroundColor: colors.primary },
                  isPurchasingThis && styles.subscribeButtonDisabled,
                ]}
                onPress={() => handlePurchase(pkg)}
                disabled={purchasing}
              >
                {isPurchasingThis ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.subscribeButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.subscribeButtonText}>
                    Subscribe Now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={[styles.restoreButtonText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
            You can manage your subscription in your App Store account settings.
          </Text>
          <Text style={[styles.disclaimerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
            Note: Each app account requires its own subscription. If you have multiple accounts, you must purchase or restore the subscription for each account separately.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={[styles.successIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={64}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Welcome to Premium! 🎉
            </Text>
            <Text style={[styles.modalMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              You now have access to all premium features. Enjoy your enhanced experience!
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  planPrice: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  planDescription: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  subscribeButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  restoreButtonText: {
    ...typography.bodyBold,
    textDecorationLine: 'underline',
  },
  disclaimerContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  disclaimerText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  premiumStatusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  premiumBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  premiumTitle: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featuresCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  button: {
    width: '100%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  webMessageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  webMessageTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  webMessageText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButton: {
    width: '100%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
