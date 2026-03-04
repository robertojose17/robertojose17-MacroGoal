
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function Index() {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Prevent multiple navigation attempts
    if (isNavigating) return;

    const checkAuthAndNavigate = async () => {
      console.log('[Index] Checking auth state...');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[Index] No session, navigating to welcome');
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/auth/welcome');
          }, 100);
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
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/onboarding/complete');
          }, 100);
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Index] Onboarding complete, navigating to home');
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/(tabs)/(home)/');
          }, 100);
        } else {
          console.log('[Index] Onboarding not complete, navigating to onboarding');
          setIsNavigating(true);
          setTimeout(() => {
            router.replace('/onboarding/complete');
          }, 100);
        }
      } catch (error) {
        console.error('[Index] Error checking auth:', error);
        // On error, go to welcome screen
        setIsNavigating(true);
        setTimeout(() => {
          router.replace('/auth/welcome');
        }, 100);
      }
    };

    // Delay initial check to ensure everything is mounted
    const timer = setTimeout(() => {
      checkAuthAndNavigate();
    }, 500);

    return () => clearTimeout(timer);
  }, [isNavigating]);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
