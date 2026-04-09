
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases, { isPurchasesAvailable } from '@/utils/purchases';

function loadPurchases(): any {
  return isPurchasesAvailable ? Purchases : null;
}

// Use `any` for CustomerInfo so we don't import the type from the native module
type CustomerInfo = any;

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
 * Hook to check if the current user has an active premium subscription.
 *
 * Uses RevenueCat as the primary source of truth, with Supabase as fallback.
 * Supabase is lazy-imported to avoid module-level crashes on cold start in Expo Go.
 */
export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  // Track in-flight check to avoid concurrent duplicate calls
  const checkInProgress = useRef(false);

  const checkPremiumStatus = useCallback(async (force = false) => {
    if (!force && checkInProgress.current) {
      console.log('[usePremium] Check already in progress, skipping duplicate call');
      return;
    }
    checkInProgress.current = true;

    const Purchases = loadPurchases();

    try {
      console.log('[usePremium] ========== CHECKING PREMIUM STATUS ==========');
      setLoading(true);
      setError(null);

      // Lazy-import supabase to avoid module-level crashes on cold start in Expo Go.
      // The real supabase client calls createClient() with AsyncStorage at module level;
      // importing it statically from this hook would force that to run before the JS
      // runtime is fully ready, causing a blank white screen on iOS.
      const { supabase } = await import('@/lib/supabase/client');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[usePremium] No user found');
        setIsPremium(false);
        setLoading(false);
        return;
      }

      console.log('[usePremium] User ID:', user.id);

      // On native platforms, check RevenueCat first (primary source of truth).
      // We retry once with a short delay to handle the case where RevenueCat
      // was just initialized (e.g. right after a SIGNED_IN event) and the SDK
      // hasn't fully identified the user yet.
      if (Platform.OS !== 'web' && Purchases) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[usePremium] Checking RevenueCat entitlements (attempt ${attempt})...`);

            // Wrap getCustomerInfo in a 5s timeout so a slow/uninitialized
            // RevenueCat never blocks the tab layout from rendering.
            const rcTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('RevenueCat getCustomerInfo timed out')), 5000)
            );
            const info = await Promise.race([Purchases.getCustomerInfo(), rcTimeout]);
            setCustomerInfo(info);

            console.log('[usePremium] RevenueCat Customer Info:');
            console.log('[usePremium] - Original App User ID:', info.originalAppUserId);
            console.log('[usePremium] - Active Entitlements:', Object.keys(info.entitlements.active));

            // If RevenueCat still has an anonymous user ID but we have a real
            // session, it means the SDK hasn't been identified yet (race with
            // _layout.tsx init). Log in now so we get the right entitlements.
            const isAnonymousUser = info.originalAppUserId.startsWith('$RCAnonymousID:');
            if (isAnonymousUser && user.id) {
              console.log('[usePremium] RevenueCat still anonymous, logging in user:', user.id);
              try {
                const { customerInfo: identifiedInfo } = await Purchases.logIn(user.id);
                console.log('[usePremium] RevenueCat user identified from hook:', user.id);

                const premiumEntitlementAfterLogin =
                  identifiedInfo.entitlements.active['pro'] ||
                  identifiedInfo.entitlements.active['Macrogoal Pro'] ||
                  identifiedInfo.entitlements.active['macrogoal_pro'] ||
                  identifiedInfo.entitlements.active['premium'];
                const hasActiveAfterLogin = premiumEntitlementAfterLogin?.isActive || false;

                setCustomerInfo(identifiedInfo);
                setIsPremium(hasActiveAfterLogin);
                if (premiumEntitlementAfterLogin?.expirationDate) {
                  setExpirationDate(premiumEntitlementAfterLogin.expirationDate);
                }
                console.log('[usePremium] Premium status after login:', hasActiveAfterLogin);
                return;
              } catch (loginErr) {
                console.warn('[usePremium] Could not log in to RevenueCat from hook:', loginErr);
                // Fall through to use the anonymous info we already have
              }
            }

            // Check for premium entitlement — try both possible keys used in the RevenueCat dashboard
            const premiumEntitlement =
              info.entitlements.active['pro'] ||
              info.entitlements.active['Macrogoal Pro'] ||
              info.entitlements.active['macrogoal_pro'] ||
              info.entitlements.active['premium'];
            const hasActiveEntitlement = premiumEntitlement?.isActive || false;

            console.log('[usePremium] Premium Entitlement - Is Active:', hasActiveEntitlement);

            if (premiumEntitlement?.expirationDate) {
              setExpirationDate(premiumEntitlement.expirationDate);
            }

            console.log('[usePremium] RevenueCat premium status:', hasActiveEntitlement);
            setIsPremium(hasActiveEntitlement);
            setLoading(false);
            return;
          } catch (revenueCatError) {
            if (attempt === 1) {
              console.warn('[usePremium] RevenueCat attempt 1 failed, retrying in 1s:', revenueCatError);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.warn('[usePremium] RevenueCat check failed after 2 attempts, falling back to Supabase:', revenueCatError);
            }
          }
        }
      }

      // Fallback: Check Supabase for premium status (derived state)
      console.log('[usePremium] Checking Supabase for premium status...');
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
      checkInProgress.current = false;
      console.log('[usePremium] ========== PREMIUM STATUS CHECK COMPLETE ==========');
    }
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] Manually refreshing premium status (forced)');
    await checkPremiumStatus(true);
  }, [checkPremiumStatus]);

  useEffect(() => {
    console.log('[usePremium] Hook mounted, starting initial check');
    checkPremiumStatus();

    const Purchases = loadPurchases();

    // Set up RevenueCat listener for real-time updates (native only).
    if (Platform.OS !== 'web' && Purchases) {
      console.log('[usePremium] Setting up RevenueCat customer info listener');
      Purchases.addCustomerInfoUpdateListener((info: any) => {
        console.log('[usePremium] RevenueCat customer info updated via listener');
        setCustomerInfo(info);
        const premiumEntitlement =
          info.entitlements.active['pro'] ||
          info.entitlements.active['Macrogoal Pro'] ||
          info.entitlements.active['macrogoal_pro'] ||
          info.entitlements.active['premium'];
        const hasActiveEntitlement = premiumEntitlement?.isActive || false;
        console.log('[usePremium] - Premium Status:', hasActiveEntitlement);
        setIsPremium(hasActiveEntitlement);
        if (premiumEntitlement?.expirationDate) {
          setExpirationDate(premiumEntitlement.expirationDate);
        }
      });
    }

    // Subscribe to Supabase auth state changes via lazy import.
    let unsubscribe: (() => void) | null = null;
    import('@/lib/supabase/client').then(({ supabase }) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          console.log('[usePremium] SIGNED_IN event, refreshing premium status for user:', session.user.id);
          setTimeout(() => {
            console.log('[usePremium] Running post-login premium check');
            checkPremiumStatus();
          }, 1500);
        } else if (event === 'SIGNED_OUT') {
          console.log('[usePremium] SIGNED_OUT event, resetting premium status');
          setIsPremium(false);
          setCustomerInfo(null);
          setExpirationDate(null);
          setError(null);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }).catch((e) => {
      console.warn('[usePremium] Could not subscribe to auth state changes:', e);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [checkPremiumStatus]);

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
