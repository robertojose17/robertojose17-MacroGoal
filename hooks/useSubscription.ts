
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { Alert } from 'react-native';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  status: string | null;
  planName: string | null;
  currentPeriodEnd: string | null;
}

export function useSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    status: null,
    planName: null,
    currentPeriodEnd: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscriptionStatus({ isSubscribed: false, status: null, planName: null, currentPeriodEnd: null });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_name, current_period_end')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useSubscription] Error fetching subscription:', error);
      }

      const isActive = data?.status === 'active' || data?.status === 'trialing';
      setSubscriptionStatus({
        isSubscribed: isActive,
        status: data?.status || null,
        planName: data?.plan_name || null,
        currentPeriodEnd: data?.current_period_end || null,
      });
    } catch (err) {
      console.error('[useSubscription] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const createCheckoutSession = useCallback(async (priceId: string, planType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to subscribe');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, planType, userId: user.id },
      });

      if (error) {
        console.error('[Subscription] Checkout error:', {
          message: error.message,
          status: (error as any).status,
          context: (error as any).context,
        });
        throw error;
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      return data.url;
    } catch (err: any) {
      console.error('[Subscription] Checkout failed:', err);
      Alert.alert('Checkout Error', err.message || 'Failed to create checkout session');
      return null;
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No portal URL returned');

      return data.url;
    } catch (err: any) {
      console.error('[Subscription] Portal error:', err);
      Alert.alert('Error', 'Failed to open customer portal');
      return null;
    }
  }, []);

  return {
    ...subscriptionStatus,
    loading,
    refresh: fetchSubscriptionStatus,
    createCheckoutSession,
    openCustomerPortal,
  };
}
