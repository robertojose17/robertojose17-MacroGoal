
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Purchases, { CustomerInfo } from 'react-native-purchases';

interface UsePremiumReturn {
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

/**
 * Hook to check if the current user has an active premium subscription
 * 
 * This hook checks both RevenueCat and Supabase to determine premium status.
 * It automatically syncs the status between both systems.
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

      // First check RevenueCat (source of truth for subscriptions)
      try {
        const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
        const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
        
        console.log('[usePremium] RevenueCat status:', {
          hasActiveEntitlement,
          activeEntitlements: Object.keys(customerInfo.entitlements.active),
        });

        setIsPremium(hasActiveEntitlement);

        // Sync to Supabase if status differs
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        const supabaseIsPremium = userData?.user_type === 'premium';
        
        if (supabaseIsPremium !== hasActiveEntitlement) {
          console.log('[usePremium] Syncing status to Supabase');
          await supabase
            .from('users')
            .update({ user_type: hasActiveEntitlement ? 'premium' : 'free' })
            .eq('id', user.id);
        }
      } catch (rcError: any) {
        console.error('[usePremium] RevenueCat error, falling back to Supabase:', rcError);
        
        // Fallback to Supabase if RevenueCat fails
        const { data: userData } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        setIsPremium(userData?.user_type === 'premium');
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
