
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import Purchases, { CustomerInfo } from 'react-native-purchases';

interface UsePremiumReturn {
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  customerInfo: CustomerInfo | null;
  expirationDate: string | null;
}

/**
 * Hook to check if the current user has an active premium subscription
 * 
 * This hook uses RevenueCat as the primary source of truth for premium status,
 * with Supabase as a fallback for offline scenarios.
 * 
 * Architecture:
 * 1. Primary: Check RevenueCat entitlements (real-time, authoritative)
 * 2. Fallback: Check Supabase users.user_type (derived state, synced via webhook)
 * 
 * @returns {UsePremiumReturn} Premium status, loading state, customer info, and refresh function
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPremium, loading, expirationDate } = usePremium();
 *   
 *   if (loading) return <ActivityIndicator />;
 *   
 *   return (
 *     <View>
 *       {isPremium ? (
 *         <>
 *           <Text>Premium Feature</Text>
 *           {expirationDate && <Text>Expires: {expirationDate}</Text>}
 *         </>
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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

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

      // On native platforms, check RevenueCat first (primary source of truth)
      if (Platform.OS !== 'web') {
        try {
          console.log('[usePremium] Checking RevenueCat entitlements');
          const info = await Purchases.getCustomerInfo();
          setCustomerInfo(info);

          // Check for premium_access entitlement (configure this in RevenueCat dashboard)
          const premiumEntitlement = info.entitlements.active['premium_access'];
          const hasActiveEntitlement = premiumEntitlement?.isActive || false;

          console.log('[usePremium] RevenueCat premium status:', hasActiveEntitlement);
          
          if (premiumEntitlement?.expirationDate) {
            setExpirationDate(premiumEntitlement.expirationDate);
            console.log('[usePremium] Expiration date:', premiumEntitlement.expirationDate);
          }

          setIsPremium(hasActiveEntitlement);
          setLoading(false);
          return;
        } catch (revenueCatError) {
          console.warn('[usePremium] RevenueCat check failed, falling back to Supabase:', revenueCatError);
          // Fall through to Supabase check
        }
      }

      // Fallback: Check Supabase for premium status (derived state)
      console.log('[usePremium] Checking Supabase for premium status');
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
      console.log('[usePremium] Supabase premium status:', userIsPremium);
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

    // Set up RevenueCat listener for real-time updates (native only)
    if (Platform.OS !== 'web') {
      console.log('[usePremium] Setting up RevenueCat customer info listener');
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('[usePremium] RevenueCat customer info updated');
        setCustomerInfo(info);
        const premiumEntitlement = info.entitlements.active['premium_access'];
        const hasActiveEntitlement = premiumEntitlement?.isActive || false;
        setIsPremium(hasActiveEntitlement);
        
        if (premiumEntitlement?.expirationDate) {
          setExpirationDate(premiumEntitlement.expirationDate);
        }
      });
    }
  }, []);

  return {
    isPremium,
    loading,
    error,
    checkPremiumStatus,
    refreshPremiumStatus,
    customerInfo,
    expirationDate,
  };
}
