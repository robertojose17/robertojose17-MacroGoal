
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function Index() {
  const hasNavigated = useRef(false);
  const isMounted = useRef(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Prevent multiple navigation attempts
    if (hasNavigated.current) {
      console.log('[Index] Already navigated, skipping');
      return;
    }

    const checkAuthAndNavigate = async () => {
      console.log('[Index] ========== STARTING AUTH CHECK ==========');
      
      try {
        // Wait for component to be fully mounted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted.current) {
          console.log('[Index] Component unmounted during delay, aborting');
          return;
        }

        console.log('[Index] Step 1: Getting session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        // Only navigate if component is still mounted
        if (!isMounted.current) {
          console.log('[Index] Component unmounted after session check, aborting');
          return;
        }
        
        if (!session) {
          console.log('[Index] ❌ No session found');
          console.log('[Index] 🔄 Navigating to welcome screen in 300ms...');
          hasNavigated.current = true;
          
          setTimeout(() => {
            if (isMounted.current && !hasNavigated.current) {
              console.log('[Index] ⚠️ Navigation was cancelled');
              return;
            }
            console.log('[Index] ✅ Executing navigation to /auth/welcome');
            router.replace('/auth/welcome');
          }, 300);
          return;
        }

        console.log('[Index] ✅ Session found for user:', session.user.id);
        console.log('[Index] Step 2: Checking onboarding status...');
        
        // Check onboarding status
        const { data: userData, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        // Only navigate if component is still mounted
        if (!isMounted.current) {
          console.log('[Index] Component unmounted after user check, aborting');
          return;
        }

        if (error) {
          console.error('[Index] ❌ Error fetching user data:', error);
          console.log('[Index] 🔄 Navigating to onboarding in 300ms...');
          hasNavigated.current = true;
          
          setTimeout(() => {
            if (isMounted.current && hasNavigated.current) {
              console.log('[Index] ✅ Executing navigation to /onboarding/complete');
              router.replace('/onboarding/complete');
            }
          }, 300);
          return;
        }

        if (!userData) {
          console.log('[Index] ⚠️ User not found in database');
          console.log('[Index] 🔄 Navigating to onboarding in 300ms...');
          hasNavigated.current = true;
          
          setTimeout(() => {
            if (isMounted.current && hasNavigated.current) {
              console.log('[Index] ✅ Executing navigation to /onboarding/complete');
              router.replace('/onboarding/complete');
            }
          }, 300);
          return;
        }

        if (userData.onboarding_completed) {
          console.log('[Index] ✅ Onboarding complete');
          console.log('[Index] 🔄 Navigating to home in 300ms...');
          hasNavigated.current = true;
          
          setTimeout(() => {
            if (isMounted.current && hasNavigated.current) {
              console.log('[Index] ✅ Executing navigation to /(tabs)/(home)/');
              router.replace('/(tabs)/(home)/');
            }
          }, 300);
        } else {
          console.log('[Index] ⚠️ Onboarding not complete');
          console.log('[Index] 🔄 Navigating to onboarding in 300ms...');
          hasNavigated.current = true;
          
          setTimeout(() => {
            if (isMounted.current && hasNavigated.current) {
              console.log('[Index] ✅ Executing navigation to /onboarding/complete');
              router.replace('/onboarding/complete');
            }
          }, 300);
        }
        
        console.log('[Index] ========== AUTH CHECK COMPLETE ==========');
      } catch (error) {
        console.error('[Index] ❌ CRITICAL ERROR in auth check:', error);
        // On error, go to welcome screen
        if (isMounted.current) {
          hasNavigated.current = true;
          setTimeout(() => {
            if (isMounted.current && hasNavigated.current) {
              console.log('[Index] ✅ Executing fallback navigation to /auth/welcome');
              router.replace('/auth/welcome');
            }
          }, 300);
        }
      } finally {
        if (isMounted.current) {
          setIsChecking(false);
        }
      }
    };

    // Start auth check after a delay to ensure everything is mounted
    const timer = setTimeout(() => {
      if (isMounted.current) {
        checkAuthAndNavigate();
      }
    }, 100);

    return () => {
      console.log('[Index] Component unmounting, cleaning up...');
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
