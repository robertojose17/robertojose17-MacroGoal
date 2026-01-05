
import { useState, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { Alert, Platform } from 'react-native';
import { STRIPE_CONFIG } from '@/utils/stripeConfig';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  status: string | null;
  planName: string | null;
  planType: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    status: null,
    planName: null,
    planType: null,
    expiresAt: null,
    cancelAtPeriodEnd: false,
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  async function loadSubscriptionStatus() {
    try {
      console.log('[useSubscription] Loading subscription status...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useSubscription] No user logged in');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      console.log('[useSubscription] User ID:', user.id);

      // Fetch from both users and subscriptions tables
      const [userResult, subscriptionResult] = await Promise.all([
        supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      const userData = userResult.data;
      const subscriptionData = subscriptionResult.data;

      console.log('[useSubscription] User type:', userData?.user_type);
      console.log('[useSubscription] Subscription status:', subscriptionData?.status);
      console.log('[useSubscription] Plan type:', subscriptionData?.plan_type);

      // Determine if user is premium
      const isPremium = userData?.user_type === 'premium' || 
                       subscriptionData?.status === 'active' || 
                       subscriptionData?.status === 'trialing';

      setSubscriptionStatus({
        isSubscribed: isPremium,
        status: subscriptionData?.status || null,
        planName: subscriptionData?.stripe_price_id || null,
        planType: subscriptionData?.plan_type || null,
        expiresAt: subscriptionData?.current_period_end || null,
        cancelAtPeriodEnd: subscriptionData?.cancel_at_period_end || false,
      });

      console.log('[useSubscription] ✅ Subscription loaded:', {
        isSubscribed: isPremium,
        status: subscriptionData?.status,
        planType: subscriptionData?.plan_type,
      });
    } catch (error) {
      console.error('[useSubscription] Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createCheckoutSession(priceId: string): Promise<string | null> {
    try {
      console.log('[useSubscription] Creating checkout session for price:', priceId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[useSubscription] Not authenticated');
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, userId: user.id },
      });

      if (error) {
        console.error('[useSubscription] Error from Edge Function:', error);
        throw error;
      }

      console.log('[useSubscription] ✅ Checkout session created:', data.url);
      return data.url;
    } catch (error: any) {
      console.error('[useSubscription] Error creating checkout session:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout. Please try again.');
      return null;
    }
  }

  async function restoreSubscription() {
    console.log('[useSubscription] Restoring subscription...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[useSubscription] Not authenticated');
        Alert.alert('Error', 'Please log in to restore your subscription.');
        return;
      }

      // Call sync-subscription Edge Function
      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[useSubscription] Error syncing subscription:', error);
        Alert.alert('Error', 'Failed to restore subscription. Please try again.');
        return;
      }

      console.log('[useSubscription] ✅ Subscription synced:', data);

      // Reload subscription status
      await loadSubscriptionStatus();

      if (data.isPremium) {
        Alert.alert('Success', 'Your subscription has been restored!');
      } else {
        Alert.alert('No Subscription', 'No active subscription found.');
      }
    } catch (error: any) {
      console.error('[useSubscription] Error restoring subscription:', error);
      Alert.alert('Error', 'Failed to restore subscription. Please try again.');
    }
  }

  async function openCustomerPortal() {
    console.log('[useSubscription] Opening customer portal...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[useSubscription] Not authenticated');
        Alert.alert('Error', 'Please log in to manage your subscription.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[useSubscription] Error creating portal session:', error);
        Alert.alert('Error', 'Failed to open subscription management. Please try again.');
        return;
      }

      console.log('[useSubscription] ✅ Portal session created:', data.url);

      // Open the portal URL
      const { default: Linking } = await import('expo-linking');
      const supported = await Linking.canOpenURL(data.url);
      if (supported) {
        await Linking.openURL(data.url);
      } else {
        Alert.alert('Error', 'Cannot open subscription management.');
      }
    } catch (error: any) {
      console.error('[useSubscription] Error opening portal:', error);
      Alert.alert('Error', 'Failed to open subscription management. Please try again.');
    }
  }

  return {
    ...subscriptionStatus,
    loading,
    userId,
    createCheckoutSession,
    restoreSubscription,
    openCustomerPortal,
    refresh: loadSubscriptionStatus,
  };
}
