
import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

// CRITICAL: This must match your RevenueCat dashboard entitlement identifier
const ENTITLEMENT_IDENTIFIER = 'Macrogoal Pro';

interface UsePremiumReturn {
  isPremium: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  refreshPremiumStatus: () => Promise<void>;
}

/**
 * Hook to check if the current user has an active premium subscription via RevenueCat
 * 
 * This hook checks RevenueCat's CustomerInfo to determine premium status.
 * RevenueCat is the source of truth for subscription status.
 * 
 * @returns {UsePremiumReturn} Premium status, loading state, customer info, and refresh function
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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkPremiumStatus = async (info: CustomerInfo) => {
    console.log('[usePremium] Checking premium status from CustomerInfo');
    console.log('[usePremium] Active entitlements:', Object.keys(info.entitlements.active));
    console.log('[usePremium] Active subscriptions:', info.activeSubscriptions);
    
    // Check if user has the premium entitlement
    const hasPremium = info.entitlements.active[ENTITLEMENT_IDENTIFIER] !== undefined;
    
    console.log(`[usePremium] Has "${ENTITLEMENT_IDENTIFIER}" entitlement:`, hasPremium);
    
    setIsPremium(hasPremium);
    setCustomerInfo(info);
    setLoading(false);
  };

  const refreshPremiumStatus = async () => {
    try {
      console.log('[usePremium] Manually refreshing premium status');
      setLoading(true);
      const info = await Purchases.getCustomerInfo();
      await checkPremiumStatus(info);
    } catch (error) {
      console.error('[usePremium] Error refreshing premium status:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[usePremium] Setting up premium status monitoring');
    
    // Initial check
    const setupListener = async () => {
      try {
        // Get initial customer info
        const info = await Purchases.getCustomerInfo();
        await checkPremiumStatus(info);
      } catch (error) {
        console.error('[usePremium] Error fetching initial customer info:', error);
        setLoading(false);
      }

      // Listen for updates
      Purchases.addCustomerInfoUpdateListener(checkPremiumStatus);
    };

    setupListener();

    // Cleanup is handled by Purchases SDK
    return () => {
      console.log('[usePremium] Cleaning up');
    };
  }, []);

  return {
    isPremium,
    loading,
    customerInfo,
    refreshPremiumStatus,
  };
}
