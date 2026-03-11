
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

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
 * This hook checks Supabase to determine premium status.
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

  const checkPremiumStatus = async () => {
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

      // Check Supabase for premium status
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
      console.log('[usePremium] User premium status:', userIsPremium);
      setIsPremium(userIsPremium);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check premium status';
      console.error('[usePremium] Error checking premium status:', err);
      setError(errorMessage);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] Refreshing premium status');
    await checkPremiumStatus();
  }, []);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  return {
    isPremium,
    loading,
    error,
    checkPremiumStatus,
    refreshPremiumStatus,
  };
}
