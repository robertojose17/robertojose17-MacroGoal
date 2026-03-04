
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function Index() {
  const hasNavigated = useRef(false);

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
          // Defer navigation to next tick to ensure component is mounted
          setTimeout(() => {
            router.replace('/auth/welcome');
          }, 300);
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
          setTimeout(() => {
            router.replace('/onboarding/complete');
          }, 300);
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Index] Onboarding complete, navigating to home');
          hasNavigated.current = true;
          setTimeout(() => {
            router.replace('/(tabs)/(home)/');
          }, 300);
        } else {
          console.log('[Index] Onboarding not complete, navigating to onboarding');
          hasNavigated.current = true;
          setTimeout(() => {
            router.replace('/onboarding/complete');
          }, 300);
        }
      } catch (error) {
        console.error('[Index] Error checking auth:', error);
        // On error, go to welcome screen
        hasNavigated.current = true;
        setTimeout(() => {
          router.replace('/auth/welcome');
        }, 300);
      }
    };

    // Delay initial check to ensure everything is mounted
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 600);

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
