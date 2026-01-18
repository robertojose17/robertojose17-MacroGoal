
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { AppState, AppStateStatus } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
export type PlanType = 'monthly' | 'yearly' | null;

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: SubscriptionStatus;
  plan_type: PlanType;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
  // iOS IAP fields
  apple_transaction_id: string | null;
  apple_original_transaction_id: string | null;
  apple_product_id: string | null;
}

export interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  isSubscribed: boolean;
  hasActiveSubscription: boolean;
  planType: PlanType;
  refreshSubscription: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  createCheckoutSession: (priceId: string, planType: 'monthly' | 'yearly') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

// iOS Product IDs
const PRODUCT_IDS = {
  monthly: 'macrogoal_premium_monthly',
  yearly: 'macrogoal_premium_yearly',
};

/**
 * Check if user has premium access based on iOS IAP
 */
function hasPremiumAccess(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  // For iOS, check if status is active or trialing
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return true;
  }
  
  // Check if canceled but still within paid period
  if (subscription.status === 'canceled' && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    if (periodEnd > now) {
      console.log('[useSubscription iOS] 📅 Subscription canceled but still active until:', periodEnd.toISOString());
      return true;
    }
  }
  
  return false;
}

/**
 * iOS-specific subscription hook using Apple In-App Purchases
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [iapConnected, setIapConnected] = useState(false);

  // Initialize IAP connection
  useEffect(() => {
    console.log('[useSubscription iOS] Initializing IAP connection');
    initializeIAP();

    return () => {
      console.log('[useSubscription iOS] Cleaning up IAP connection');
      InAppPurchases.disconnectAsync().catch(err => 
        console.error('[useSubscription iOS] Error disconnecting IAP:', err)
      );
    };
  }, []);

  const initializeIAP = async () => {
    try {
      console.log('[useSubscription iOS] Connecting to App Store...');
      await InAppPurchases.connectAsync();
      setIapConnected(true);
      console.log('[useSubscription iOS] ✅ Connected to App Store');

      // Set up purchase listener
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('[useSubscription iOS] 🔔 Purchase listener triggered');
        console.log('[useSubscription iOS] Response code:', responseCode);
        console.log('[useSubscription iOS] Results:', results?.length || 0);
        console.log('[useSubscription iOS] Error code:', errorCode);

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('[useSubscription iOS] ✅ Purchase completed, refreshing subscription');
          // Refresh subscription after purchase
          fetchSubscription();
        }
      });
    } catch (error) {
      console.error('[useSubscription iOS] ❌ Error initializing IAP:', error);
    }
  };

  const fetchSubscription = useCallback(async () => {
    try {
      console.log('[useSubscription iOS] 🔄 Fetching subscription...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useSubscription iOS] ❌ No user found');
        setSubscription(null);
        setLoading(false);
        return;
      }

      console.log('[useSubscription iOS] ✅ User found:', user.id);

      // Fetch subscription from database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useSubscription iOS] ❌ Error fetching subscription:', error);
        setSubscription(null);
      } else {
        console.log('[useSubscription iOS] ✅ Subscription fetched from database');
        if (data) {
          console.log('[useSubscription iOS] 📊 Subscription details:', {
            status: data.status,
            plan_type: data.plan_type,
            apple_product_id: data.apple_product_id,
            apple_transaction_id: data.apple_transaction_id,
            current_period_end: data.current_period_end,
            has_premium_access: hasPremiumAccess(data),
          });
        } else {
          console.log('[useSubscription iOS] ℹ️ No subscription record found');
        }
        setSubscription(data);
      }
    } catch (error) {
      console.error('[useSubscription iOS] ❌ Error in fetchSubscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncSubscription = useCallback(async () => {
    try {
      console.log('[useSubscription iOS] 🔄 Syncing subscription with Apple...');
      
      if (!iapConnected) {
        console.log('[useSubscription iOS] ⚠️ IAP not connected, skipping sync');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useSubscription iOS] ❌ Not authenticated');
        return;
      }

      // Get purchase history from Apple
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('[useSubscription iOS] Purchase history response code:', responseCode);
      console.log('[useSubscription iOS] Purchase history:', results?.length || 0, 'items');

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        // Find the most recent subscription purchase
        const subscriptionPurchases = results.filter(p => 
          p.productId === PRODUCT_IDS.monthly || p.productId === PRODUCT_IDS.yearly
        );

        if (subscriptionPurchases.length > 0) {
          // Sort by purchase time (most recent first)
          subscriptionPurchases.sort((a, b) => b.purchaseTime - a.purchaseTime);
          const latestPurchase = subscriptionPurchases[0];

          console.log('[useSubscription iOS] ✅ Found active subscription:', {
            productId: latestPurchase.productId,
            transactionId: latestPurchase.transactionId,
            purchaseTime: new Date(latestPurchase.purchaseTime).toISOString(),
          });

          // Determine plan type
          const planType: PlanType = latestPurchase.productId === PRODUCT_IDS.monthly ? 'monthly' : 'yearly';

          // Update subscription in database
          const subscriptionData = {
            user_id: user.id,
            status: 'active' as SubscriptionStatus,
            plan_type: planType,
            apple_transaction_id: latestPurchase.transactionId,
            apple_original_transaction_id: latestPurchase.originalTransactionIdentifierIOS || latestPurchase.transactionId,
            apple_product_id: latestPurchase.productId,
            current_period_start: new Date(latestPurchase.purchaseTime).toISOString(),
            // For subscriptions, we don't have exact expiry from purchase history
            // The App Store will handle renewal automatically
            current_period_end: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          };

          // Upsert subscription
          const { error: upsertError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id',
            });

          if (upsertError) {
            console.error('[useSubscription iOS] ❌ Error upserting subscription:', upsertError);
          } else {
            console.log('[useSubscription iOS] ✅ Subscription synced to database');
          }

          // Update user profile to premium
          const { error: profileError } = await supabase
            .from('users')
            .update({ 
              user_type: 'premium',
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (profileError) {
            console.error('[useSubscription iOS] ❌ Error updating user profile:', profileError);
          } else {
            console.log('[useSubscription iOS] ✅ User profile updated to premium');
          }
        } else {
          console.log('[useSubscription iOS] ℹ️ No subscription purchases found');
        }
      } else {
        console.log('[useSubscription iOS] ℹ️ No purchase history available');
      }

      // Refresh local subscription data
      await fetchSubscription();
    } catch (error) {
      console.error('[useSubscription iOS] ❌ Error in syncSubscription:', error);
    }
  }, [iapConnected, fetchSubscription]);

  const refreshUserProfile = useCallback(async () => {
    try {
      console.log('[useSubscription iOS] 🔄 Refreshing user profile...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useSubscription iOS] ❌ No user found');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        console.log('[useSubscription iOS] ✅ User profile refreshed, user_type:', userData.user_type);
      }
    } catch (error) {
      console.error('[useSubscription iOS] ❌ Error refreshing user profile:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Set up real-time subscription to subscription changes
  useEffect(() => {
    console.log('[useSubscription iOS] 📡 Setting up real-time subscription listener');
    
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        (payload) => {
          console.log('[useSubscription iOS] 🔔 Subscription changed via real-time:', payload);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      console.log('[useSubscription iOS] 🔌 Cleaning up real-time subscription listener');
      supabase.removeChannel(channel);
    };
  }, [fetchSubscription]);

  // Listen for app state changes to sync when returning from background
  useEffect(() => {
    console.log('[useSubscription iOS] 📱 Setting up app state listener');
    
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[useSubscription iOS] 🔄 App became active, syncing subscription...');
        syncSubscription();
      }
    });

    return () => {
      console.log('[useSubscription iOS] 🔌 Cleaning up app state listener');
      subscription.remove();
    };
  }, [syncSubscription]);

  // Dummy implementations for Stripe methods (not used on iOS)
  const createCheckoutSession = useCallback(async (priceId: string, planType: 'monthly' | 'yearly') => {
    console.log('[useSubscription iOS] ⚠️ createCheckoutSession called but not used on iOS');
    throw new Error('Stripe checkout not available on iOS. Use Apple In-App Purchases instead.');
  }, []);

  const openCustomerPortal = useCallback(async () => {
    console.log('[useSubscription iOS] ⚠️ openCustomerPortal called but not used on iOS');
    throw new Error('Stripe portal not available on iOS. Manage subscription through Apple ID settings.');
  }, []);

  const isSubscribed = hasPremiumAccess(subscription);
  const hasActiveSubscription = isSubscribed;

  return {
    subscription,
    loading,
    isSubscribed,
    hasActiveSubscription,
    planType: subscription?.plan_type || null,
    refreshSubscription: fetchSubscription,
    syncSubscription,
    refreshUserProfile,
    createCheckoutSession,
    openCustomerPortal,
  };
}
