
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

interface UsePremiumReturn {
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

/**
 * Hook to check if the current user has an active premium subscription via RevenueCat
 * 
 * This hook checks both RevenueCat and Supabase to determine premium status.
 * RevenueCat is the source of truth for subscription status.
 * 
 * @returns {UsePremiumReturn} Premium status, loading state, and refresh function
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPremium, loading } = usePremium();
 *   
 *   if (loading) return <ActivityIndicator />;
 *   
 *   return (
 *     <View>
 *       {isPremium ? (
 *         <Text>Premium Feature</Text>
 *       ) : (
 *         <Button title="Upgrade to Premium" onPress={() => router.push('/subscription')} />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPremiumStatus = useCallback(async () => {
    try {
      console.log('[usePremium] Checking premium status');
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[usePremium] No user found');
        setIsPremium(false);
        setLoading(false);
        return;
      }

      // On web, check Supabase only (RevenueCat not available)
      if (Platform.OS === 'web') {
        console.log('[usePremium] Web platform - checking Supabase only');
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('[usePremium] Error fetching user data:', fetchError);
          throw fetchError;
        }

        const userIsPremium = userData?.user_type === 'premium';
        console.log('[usePremium] User premium status (Supabase):', userIsPremium);
        setIsPremium(userIsPremium);
        setLoading(false);
        return;
      }

      // On native platforms, check RevenueCat (source of truth)
      try {
        console.log('[usePremium] Native platform - checking RevenueCat');
        const customerInfo = await Purchases.getCustomerInfo();
        const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
        console.log('[usePremium] RevenueCat premium status:', hasPremium);
        
        setIsPremium(hasPremium);

        // Sync to Supabase if status differs
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        const supabasePremium = userData?.user_type === 'premium';
        
        if (hasPremium !== supabasePremium) {
          console.log('[usePremium] Syncing RevenueCat status to Supabase...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              user_type: hasPremium ? 'premium' : 'free',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('[usePremium] Error syncing to Supabase:', updateError);
          } else {
            console.log('[usePremium] ✅ Synced to Supabase');
          }
        }

      } catch (rcError: any) {
        console.error('[usePremium] RevenueCat error, falling back to Supabase:', rcError);
        
        // Fallback to Supabase if RevenueCat fails
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('[usePremium] Error fetching user data:', fetchError);
          throw fetchError;
        }

        const userIsPremium = userData?.user_type === 'premium';
        console.log('[usePremium] User premium status (Supabase fallback):', userIsPremium);
        setIsPremium(userIsPremium);
      }

    } catch (err: any) {
      console.error('[usePremium] Error checking premium status:', err);
      setError(err.message || 'Failed to check premium status');
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] Refreshing premium status');
    await checkPremiumStatus();
  }, [checkPremiumStatus]);

  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  return {
    isPremium,
    loading,
    error,
    checkPremiumStatus,
    refreshPremiumStatus,
  };
}
