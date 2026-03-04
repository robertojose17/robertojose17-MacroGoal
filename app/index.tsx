
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function Index() {
  const hasNavigated = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Prevent multiple navigation attempts
    if (hasNavigated.current) {
      console.log('[Index] Already navigated, skipping');
      return;
    }

    const checkAuthAndNavigate = async () => {
      console.log('[Index] Checking auth state...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Only navigate if component is still mounted
        if (!isMounted.current) {
          console.log('[Index] Component unmounted, skipping navigation');
          return;
        }
        
        if (!session) {
          console.log('[Index] No session, navigating to welcome');
          hasNavigated.current = true;
          // Use setTimeout to defer navigation to next tick
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/auth/welcome');
            }
          }, 0);
          return;
        }

        console.log('[Index] Session found, checking onboarding status');
        
        // Check onboarding status
        const { data: userData, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        // Only navigate if component is still mounted
        if (!isMounted.current) {
          console.log('[Index] Component unmounted, skipping navigation');
          return;
        }

        if (error || !userData) {
          console.log('[Index] User not in database or error, navigating to onboarding');
          hasNavigated.current = true;
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/onboarding/complete');
            }
          }, 0);
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Index] Onboarding complete, navigating to home');
          hasNavigated.current = true;
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/(tabs)/(home)/');
            }
          }, 0);
        } else {
          console.log('[Index] Onboarding not complete, navigating to onboarding');
          hasNavigated.current = true;
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/onboarding/complete');
            }
          }, 0);
        }
      } catch (error) {
        console.error('[Index] Error checking auth:', error);
        // On error, go to welcome screen
        if (isMounted.current) {
          hasNavigated.current = true;
          setTimeout(() => {
            if (isMounted.current) {
              router.replace('/auth/welcome');
            }
          }, 0);
        }
      }
    };

    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
      if (isMounted.current) {
        checkAuthAndNavigate();
      }
    }, 100);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []); // Empty dependency array - only run once on mount
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
