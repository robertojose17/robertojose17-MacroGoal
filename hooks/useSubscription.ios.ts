
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { AppState, AppStateStatus, Alert } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { IAP_PRODUCT_IDS } from '@/config/iapConfig';

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
  products: InAppPurchases.IAPItemDetails[];
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  createCheckoutSession: (priceId: string, planType: 'monthly' | 'yearly') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

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
 * Integrates with StoreKit via expo-in-app-purchases
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const [iapConnected, setIapConnected] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      console.log('[useSubscription iOS] 🔄 Fetching subscription from database...');
      
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

  /**
   * Verify purchase with backend and update subscription
   */
  const verifyPurchaseWithBackend = useCallback(async (purchase: InAppPurchases.InAppPurchase) => {
    try {
      console.log('[useSubscription iOS] 🔐 Verifying purchase with backend...');
      console.log('[useSubscription iOS] Transaction ID:', purchase.transactionId);
      console.log('[useSubscription iOS] Product ID:', purchase.productId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useSubscription iOS] ❌ No user session found for verification');
        throw new Error('Please log in to complete your purchase.');
      }

      // Send receipt to Supabase Edge Function for verification
      const { data, error } = await supabase.functions.invoke('verify-apple-receipt', {
        body: {
          receipt: purchase.transactionReceipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          userId: user.id,
        },
      });

      if (error) {
        console.error('[useSubscription iOS] ❌ Edge Function error:', error);
        throw new Error(`Verification failed: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('[useSubscription iOS] ❌ Backend rejected verification:', data);
        throw new Error('Backend verification failed. Please contact support.');
      }

      console.log('[useSubscription iOS] ✅ Purchase verified by backend:', data);
      return true;
    } catch (error: any) {
      console.error('[useSubscription iOS] ❌ Verification error:', error);
      throw error;
    }
  }, []);

  /**
   * Handle purchase events from StoreKit
   */
  const handlePurchases = useCallback(async (purchaseUpdate: InAppPurchases.InAppPurchaseResult) => {
    const { responseCode, results } = purchaseUpdate;

    console.log('[useSubscription iOS] 📦 Purchase update received');
    console.log('[useSubscription iOS] Response code:', responseCode);
    console.log('[useSubscription iOS] Results count:', results?.length || 0);

    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      for (const purchase of results || []) {
        console.log('[useSubscription iOS] 🔄 Processing purchase:', purchase.productId);
        
        try {
          setLoading(true);

          // Verify with backend BEFORE finishing transaction
          await verifyPurchaseWithBackend(purchase);

          // Backend confirmed - finish transaction with Apple
          await InAppPurchases.finishTransactionAsync(purchase, true);
          console.log('[useSubscription iOS] ✅ Transaction finished successfully');

          // Refresh subscription from database
          await fetchSubscription();

          Alert.alert(
            'Purchase Successful',
            'Your subscription is now active!',
            [{ text: 'OK' }]
          );
        } catch (error: any) {
          console.error('[useSubscription iOS] ❌ Error processing purchase:', error);
          
          // DO NOT finish transaction if verification failed
          Alert.alert(
            'Purchase Error',
            error.message || 'Failed to verify your purchase. Please try restoring purchases later.',
            [{ text: 'OK' }]
          );
        } finally {
          setLoading(false);
        }
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      console.log('[useSubscription iOS] ℹ️ User canceled purchase');
      setLoading(false);
    } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
      console.log('[useSubscription iOS] ⏳ Purchase deferred (Ask to Buy)');
      Alert.alert(
        'Purchase Pending',
        'Your purchase is pending approval. You will be notified when it is approved.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    } else {
      console.error('[useSubscription iOS] ❌ Purchase failed with code:', responseCode);
      Alert.alert(
        'Purchase Failed',
        `Unable to complete your purchase. Error code: ${responseCode}`,
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  }, [verifyPurchaseWithBackend, fetchSubscription]);

  /**
   * Initialize IAP connection and fetch products
   */
  const initializeIAP = useCallback(async () => {
    try {
      console.log('[useSubscription iOS] 🚀 Initializing IAP...');
      
      // Connect to App Store
      const connectionResult = await InAppPurchases.connectAsync();
      if (connectionResult.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        console.error('[useSubscription iOS] ❌ IAP connection failed:', connectionResult.debugMessage);
        return;
      }
      
      setIapConnected(true);
      console.log('[useSubscription iOS] ✅ Connected to App Store');

      // Fetch available products
      const productIds = Object.values(IAP_PRODUCT_IDS);
      console.log('[useSubscription iOS] 📦 Fetching products:', productIds);
      
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        setProducts(results);
        console.log('[useSubscription iOS] ✅ Products loaded:', results.length);
        results.forEach(product => {
          console.log(`[useSubscription iOS]   - ${product.productId}: ${product.priceString}`);
        });
      } else {
        console.warn('[useSubscription iOS] ⚠️ No products found or fetch failed');
      }

      // Set up purchase listener
      InAppPurchases.setPurchaseListener(handlePurchases);
      console.log('[useSubscription iOS] ✅ Purchase listener registered');

      // Fetch initial subscription status
      await fetchSubscription();
    } catch (error: any) {
      console.error('[useSubscription iOS] ❌ IAP initialization error:', error);
    }
  }, [handlePurchases, fetchSubscription]);

  /**
   * Purchase a subscription product
   */
  const purchase = useCallback(async (productId: string) => {
    if (!iapConnected) {
      Alert.alert('Not Connected', 'Please wait while we connect to the App Store...');
      return;
    }

    try {
      setLoading(true);
      console.log('[useSubscription iOS] 💳 Initiating purchase for:', productId);
      
      await InAppPurchases.purchaseItemAsync(productId);
      // Purchase listener will handle the result
    } catch (error: any) {
      console.error('[useSubscription iOS] ❌ Purchase initiation error:', error);
      Alert.alert(
        'Purchase Error',
        error.message || 'Failed to initiate purchase. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
  }, [iapConnected]);

  /**
   * Restore previous purchases
   */
  const restore = useCallback(async () => {
    if (!iapConnected) {
      Alert.alert('Not Connected', 'Please wait while we connect to the App Store...');
      return;
    }

    try {
      setLoading(true);
      console.log('[useSubscription iOS] 🔄 Restoring purchases...');

      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('[useSubscription iOS] Restore response code:', responseCode);
      console.log('[useSubscription iOS] Purchase history count:', results?.length || 0);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          console.log('[useSubscription iOS] ✅ Found', results.length, 'previous purchases');

          // Process each purchase through verification
          for (const purchase of results) {
            try {
              await verifyPurchaseWithBackend(purchase);
              await InAppPurchases.finishTransactionAsync(purchase, true);
            } catch (error) {
              console.error('[useSubscription iOS] ⚠️ Failed to verify restored purchase:', error);
              // Continue with other purchases
            }
          }

          await fetchSubscription();

          Alert.alert(
            'Restore Successful',
            'Your purchases have been restored!',
            [{ text: 'OK' }]
          );
        } else {
          console.log('[useSubscription iOS] ℹ️ No previous purchases found');
          Alert.alert(
            'No Purchases Found',
            'We could not find any previous purchases to restore.',
            [{ text: 'OK' }]
          );
        }
      } else {
        console.error('[useSubscription iOS] ❌ Restore failed with code:', responseCode);
        Alert.alert(
          'Restore Failed',
          'Unable to restore purchases. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('[useSubscription iOS] ❌ Restore error:', error);
      Alert.alert(
        'Restore Error',
        error.message || 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [iapConnected, verifyPurchaseWithBackend, fetchSubscription]);

  const syncSubscription = useCallback(async () => {
    console.log('[useSubscription iOS] 🔄 Syncing subscription...');
    await fetchSubscription();
  }, [fetchSubscription]);

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

  // Initialize IAP on mount
  useEffect(() => {
    initializeIAP();

    return () => {
      console.log('[useSubscription iOS] 🔌 Cleaning up IAP connection');
      InAppPurchases.disconnectAsync().catch(err => 
        console.error('[useSubscription iOS] Error disconnecting:', err)
      );
    };
  }, [initializeIAP]);

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
    
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[useSubscription iOS] 🔄 App became active, refreshing subscription...');
        fetchSubscription();
      }
    });

    return () => {
      console.log('[useSubscription iOS] 🔌 Cleaning up app state listener');
      appStateSubscription.remove();
    };
  }, [fetchSubscription]);

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
    products,
    purchase,
    restore,
    refreshSubscription: fetchSubscription,
    syncSubscription,
    refreshUserProfile,
    createCheckoutSession,
    openCustomerPortal,
  };
}
