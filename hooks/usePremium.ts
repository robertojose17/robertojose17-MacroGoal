
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
 * Hook to check if the current user has an active premium subscription.
 *
 * Source of truth priority:
 * 1. RevenueCat entitlements (native, real-time)
 * 2. Supabase users.user_type (web / RevenueCat fallback)
 *
 * Key behaviours:
 * - Re-checks whenever the Supabase auth session changes (SIGNED_IN / SIGNED_OUT /
 *   TOKEN_REFRESHED), so premium status is always in sync after login.
 * - Registers the RevenueCat customer-info listener BEFORE the initial check so
 *   any update pushed by Purchases.logIn() in _layout.tsx is never missed.
 * - Properly removes the listener on unmount to avoid memory leaks.
 */
export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);

  // Stable ref so the listener callback always calls the latest version of the setter
  const setStateFromCustomerInfo = useCallback((info: CustomerInfo) => {
    console.log('[usePremium] 🔔 Applying customer info update');
    console.log('[usePremium] - Original App User ID:', info.originalAppUserId);
    console.log('[usePremium] - Active Entitlements:', Object.keys(info.entitlements.active));

    setCustomerInfo(info);
    const premiumEntitlement = info.entitlements.active['Macrogoal Pro'];
    const hasActiveEntitlement = premiumEntitlement?.isActive || false;

    console.log('[usePremium] - Premium Status:', hasActiveEntitlement);
    setIsPremium(hasActiveEntitlement);
    setLoading(false);

    if (premiumEntitlement?.expirationDate) {
      setExpirationDate(premiumEntitlement.expirationDate);
    }
  }, []);

  const checkPremiumStatus = useCallback(async () => {
    try {
      console.log('[usePremium] ========== CHECKING PREMIUM STATUS ==========');
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[usePremium] No user found — setting isPremium=false');
        setIsPremium(false);
        setLoading(false);
        return;
      }

      console.log('[usePremium] User ID:', user.id);

      // On native platforms, check RevenueCat first (primary source of truth).
      // IMPORTANT: Do NOT add an artificial delay here. The RevenueCat
      // customer-info listener in the useEffect below will fire automatically
      // when Purchases.logIn() completes in _layout.tsx, updating state in
      // real-time without needing a polling delay.
      if (Platform.OS !== 'web') {
        try {
          console.log('[usePremium] 🔍 Fetching RevenueCat customer info...');

          const info = await Purchases.getCustomerInfo();
          console.log('[usePremium] RevenueCat Customer Info:');
          console.log('[usePremium] - Original App User ID:', info.originalAppUserId);
          console.log('[usePremium] - Active Entitlements:', Object.keys(info.entitlements.active));
          console.log('[usePremium] - All Entitlements:', Object.keys(info.entitlements.all));

          const premiumEntitlement = info.entitlements.active['Macrogoal Pro'];
          const hasActiveEntitlement = premiumEntitlement?.isActive || false;

          console.log('[usePremium] Premium Entitlement Details:');
          console.log('[usePremium] - Is Active:', hasActiveEntitlement);
          console.log('[usePremium] - Product Identifier:', premiumEntitlement?.productIdentifier);
          console.log('[usePremium] - Will Renew:', premiumEntitlement?.willRenew);
          console.log('[usePremium] - Period Type:', premiumEntitlement?.periodType);

          if (premiumEntitlement?.expirationDate) {
            setExpirationDate(premiumEntitlement.expirationDate);
            console.log('[usePremium] - Expiration Date:', premiumEntitlement.expirationDate);
          }

          setCustomerInfo(info);
          console.log('[usePremium] ✅ RevenueCat premium status:', hasActiveEntitlement);
          setIsPremium(hasActiveEntitlement);
          setLoading(false);
          return;
        } catch (revenueCatError) {
          console.warn('[usePremium] ⚠️ RevenueCat check failed, falling back to Supabase:', revenueCatError);
          // Fall through to Supabase check
        }
      }

      // Fallback: Check Supabase for premium status (web or RevenueCat unavailable)
      console.log('[usePremium] 🔍 Checking Supabase for premium status...');
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('[usePremium] ❌ Error fetching user data:', fetchError);
        throw fetchError;
      }

      const userIsPremium = userData?.user_type === 'premium';
      console.log('[usePremium] ✅ Supabase premium status:', userIsPremium);
      setIsPremium(userIsPremium);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check premium status';
      console.error('[usePremium] ❌ Error checking premium status:', err);
      setError(errorMessage);
      setIsPremium(false);
    } finally {
      setLoading(false);
      console.log('[usePremium] ========== PREMIUM STATUS CHECK COMPLETE ==========');
    }
  }, []);

  const refreshPremiumStatus = useCallback(async () => {
    console.log('[usePremium] 🔄 Manually refreshing premium status');
    await checkPremiumStatus();
  }, [checkPremiumStatus]);

  useEffect(() => {
    console.log('[usePremium] Hook mounted');

    // CRITICAL: Register the RevenueCat listener BEFORE the initial check.
    // This ensures that if Purchases.logIn() fires in _layout.tsx while our
    // async checkPremiumStatus() is in-flight, we still receive the update.
    let removeListener: (() => void) | undefined;
    if (Platform.OS !== 'web') {
      console.log('[usePremium] Registering RevenueCat customer info listener');
      removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('[usePremium] 🔔 RevenueCat customer info updated via listener');
        setStateFromCustomerInfo(info);
      });
    }

    // Initial check
    checkPremiumStatus();

    // Re-check whenever the Supabase auth session changes.
    // This is the key fix: after SIGNED_IN fires in _layout.tsx and
    // Purchases.logIn() completes, the RevenueCat listener above will push
    // the updated entitlements. But we also subscribe to auth events here as
    // a belt-and-suspenders approach for the Supabase fallback path.
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[usePremium] Auth state changed:', event, '— re-checking premium status');
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Small yield so _layout.tsx's Purchases.logIn() can complete first
          setTimeout(() => {
            checkPremiumStatus();
          }, 1500);
        } else if (event === 'SIGNED_OUT') {
          console.log('[usePremium] User signed out — resetting premium state');
          setIsPremium(false);
          setCustomerInfo(null);
          setExpirationDate(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('[usePremium] Hook unmounting — cleaning up listeners');
      if (removeListener) removeListener();
      authSubscription.unsubscribe();
    };
  }, [checkPremiumStatus, setStateFromCustomerInfo]);

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
