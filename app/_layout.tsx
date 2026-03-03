
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  const initializeApp = async () => {
    console.log('[App] ========== STARTUP INITIALIZATION ==========');
    
    const initTimeout = setTimeout(() => {
      console.error('[App] ⏱️ INITIALIZATION TIMEOUT - Forcing app to load');
      setIsReady(true);
      setInitializing(false);
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));
    }, 10000);

    try {
      console.log('[App] Step 1: Initialize food database (non-blocking)');
      
      initializeFoodDatabase()
        .then(() => console.log('[App] ✅ Food database initialized'))
        .catch(error => console.error('[App] ⚠️ Food database init failed (non-blocking):', error));

      console.log('[App] Step 2: Get current session');
      
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
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[App] Auth state changed:', _event, session?.user?.id || 'none');
        setSession(session);
      });

      console.log('[App] ✅ Initialization complete');
      
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('[App] ❌ CRITICAL: Initialization failed:', error);
      
      clearTimeout(initTimeout);
      setIsReady(true);
      setInitializing(false);
      SplashScreen.hideAsync().catch(e => console.error('[App] Error hiding splash:', e));
    }
  };

  useEffect(() => {
    console.log('[DeepLink] Setting up deep link listener');

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        handleDeepLink(url);
      }
    });

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

      if (queryParams?.subscription_success === 'true') {
        console.log('[DeepLink] ✅ Checkout success detected!');
        console.log('[DeepLink] Session ID:', queryParams.session_id);
        
        Alert.alert(
          '✅ Payment Successful!',
          'Processing your subscription... This will take just a moment.',
          [{ text: 'OK' }]
        );
        
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 0);
        
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

              const { data: userData } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', session.user.id)
                .maybeSingle();

              if (userData?.user_type === 'premium') {
                console.log('[DeepLink] 🎉 Premium status confirmed!');
                
                Alert.alert(
                  '🎉 Welcome to Premium!',
                  'Your subscription is now active. Enjoy unlimited AI-powered meal estimates and all premium features!',
                  [{ text: 'Awesome!' }]
                );
                
                return;
              }

              if (attempt < maxRetries) {
                console.log(`[DeepLink] ⏳ Waiting ${delayMs}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
            } catch (error) {
              console.error(`[DeepLink] ❌ Error in sync attempt ${attempt}:`, error);
            }
          }

          console.log('[DeepLink] ⚠️ Premium status not confirmed after all retries');
          Alert.alert(
            'Processing...',
            'Your payment is being processed. Premium features will be unlocked shortly. If this takes more than a few minutes, please contact support.',
            [{ text: 'OK' }]
          );
        };

        syncWithRetries().catch(error => {
          console.error('[DeepLink] ❌ Error in syncWithRetries:', error);
        });
      }
      else if (queryParams?.subscription_cancelled === 'true') {
        console.log('[DeepLink] ❌ Checkout cancelled');
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 0);
        Alert.alert(
          'Checkout Cancelled',
          'You can subscribe anytime to unlock premium features.',
          [{ text: 'OK' }]
        );
      }
      else if (queryParams?.subscription_error === 'true') {
        console.log('[DeepLink] ⚠️ Subscription error detected');
        setTimeout(() => {
          router.replace('/(tabs)/profile');
        }, 0);
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

  useEffect(() => {
    console.log('[AppState] Setting up app state listener');
    
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AppState] App became active, checking for subscription updates...');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
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

  useEffect(() => {
    if (!isReady || initializing) {
      console.log('[Navigation] Waiting for initialization...', { isReady, initializing });
      return;
    }

    const navigationTimer = setTimeout(async () => {
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

        if (!session) {
          if (!inAuthGroup) {
            console.log('[Navigation] No session, redirecting to welcome');
            setTimeout(() => {
              router.replace('/auth/welcome');
            }, 0);
          }
          return;
        }

        if (session && (inAuthGroup || segments.length === 0)) {
          console.log('[Navigation] Checking onboarding status for user:', session.user.id);
          
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

            if (error) {
              console.error('[Navigation] ⚠️ Error checking onboarding:', error);
              
              console.log('[Navigation] Attempting to create user record...');
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                  user_type: 'free',
                  onboarding_completed: false,
                });
              
              if (insertError && insertError.code !== '23505') {
                console.error('[Navigation] ❌ Failed to create user record:', insertError);
              } else {
                console.log('[Navigation] ✅ User record created or already exists');
              }
              
              setTimeout(() => {
                router.replace('/onboarding/complete');
              }, 0);
              return;
            }

            if (!userData) {
              console.log('[Navigation] ⚠️ User not in database, creating record...');
              
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                  user_type: 'free',
                  onboarding_completed: false,
                });
              
              if (insertError && insertError.code !== '23505') {
                console.error('[Navigation] ❌ Failed to create user record:', insertError);
              } else {
                console.log('[Navigation] ✅ User record created');
              }
              
              setTimeout(() => {
                router.replace('/onboarding/complete');
              }, 0);
              return;
            }

            if (userData.onboarding_completed) {
              console.log('[Navigation] ✅ Onboarding complete, redirecting to home');
              setTimeout(() => {
                router.replace('/(tabs)/(home)/');
              }, 0);
            } else {
              console.log('[Navigation] ⚠️ Onboarding not complete, redirecting to onboarding');
              setTimeout(() => {
                router.replace('/onboarding/complete');
              }, 0);
            }
          } catch (error) {
            console.error('[Navigation] ❌ Onboarding check failed:', error);
            
            try {
              console.log('[Navigation] Last resort: Creating user record...');
              await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                  user_type: 'free',
                  onboarding_completed: false,
                });
              console.log('[Navigation] ✅ User record created');
            } catch (insertError) {
              console.error('[Navigation] ❌ Failed to create user record:', insertError);
            }
            
            setTimeout(() => {
              router.replace('/onboarding/complete');
            }, 0);
          }
        }
      } catch (error) {
        console.error('[Navigation] ❌ CRITICAL: Navigation error:', error);
        setTimeout(() => {
          router.replace('/auth/welcome');
        }, 0);
      }
    }, 100);

    return () => clearTimeout(navigationTimer);
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
      <ThemeProvider value={CustomDefaultTheme}>
        <WidgetProvider>
          <GestureHandlerRootView>
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
                name="barcode-lookup"
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
              
              <Stack.Screen
                name="edit-food"
                options={{
                  headerShown: false,
                  presentation: "card",
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
                name="my-foods"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-foods-create"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-foods-edit"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meals"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meals-create"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meals-details"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="my-meals-edit"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="copy-from-previous"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="check-in-form"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="check-in-details"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="share-progress"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="chatbot"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="ai-meal-estimator"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="delete-account"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="privacy-policy"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="terms-of-service"
                options={{
                  headerShown: false,
                  presentation: "card",
                }}
              />
              
              <Stack.Screen
                name="terms-of-use-eula"
                options={{
                  headerShown: false,
                  presentation: "card",
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
                name="modal"
                options={{
                  headerShown: false,
                  presentation: "modal",
                }}
              />
              
              <Stack.Screen
                name="formsheet"
                options={{
                  headerShown: false,
                  presentation: "formSheet",
                }}
              />
              
              <Stack.Screen
                name="transparent-modal"
                options={{
                  headerShown: false,
                  presentation: "transparentModal",
                }}
              />
              
              <Stack.Screen name="+not-found" />
            </Stack>
            <SystemBars style={"dark"} />
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </>
  );
}
