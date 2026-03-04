
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function Index() {
  const hasNavigated = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Prevent multiple navigation attempts
    if (hasNavigated.current) {
      console.log('[Index] Already navigated, skipping');
      return;
    }

    const checkAuthAndNavigate = async () => {
      console.log('[Index] Checking auth state...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[Index] No session, navigating to welcome');
          hasNavigated.current = true;
          setIsReady(true);
          // Use requestAnimationFrame to ensure component is mounted
          requestAnimationFrame(() => {
            router.replace('/auth/welcome');
          });
          return;
        }

        console.log('[Index] Session found, checking onboarding status');
        
        // Check onboarding status
        const { data: userData, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !userData) {
          console.log('[Index] User not in database or error, navigating to onboarding');
          hasNavigated.current = true;
          setIsReady(true);
          requestAnimationFrame(() => {
            router.replace('/onboarding/complete');
          });
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Index] Onboarding complete, navigating to home');
          hasNavigated.current = true;
          setIsReady(true);
          requestAnimationFrame(() => {
            router.replace('/(tabs)/(home)/');
          });
        } else {
          console.log('[Index] Onboarding not complete, navigating to onboarding');
          hasNavigated.current = true;
          setIsReady(true);
          requestAnimationFrame(() => {
            router.replace('/onboarding/complete');
          });
        }
      } catch (error) {
        console.error('[Index] Error checking auth:', error);
        // On error, go to welcome screen
        hasNavigated.current = true;
        setIsReady(true);
        requestAnimationFrame(() => {
          router.replace('/auth/welcome');
        });
      }
    };

    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []); // Empty dependency array - only run once on mount
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
