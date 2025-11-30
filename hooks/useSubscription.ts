
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import * as WebBrowser from 'expo-web-browser';

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
}

export interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  isSubscribed: boolean;
  hasActiveSubscription: boolean;
  planType: PlanType;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (priceId: string, planType: 'monthly' | 'yearly') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

/**
 * Hook to manage user subscription state
 * Automatically fetches subscription on mount and provides helper methods
 */
export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      console.log('[useSubscription] Fetching subscription...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useSubscription] No user found');
        setSubscription(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useSubscription] Error fetching subscription:', error);
        setSubscription(null);
      } else {
        console.log('[useSubscription] Subscription fetched:', data?.status || 'none');
        setSubscription(data);
      }
    } catch (error) {
      console.error('[useSubscription] Error in fetchSubscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Set up real-time subscription to subscription changes
  useEffect(() => {
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
          console.log('[useSubscription] Subscription changed:', payload);
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubscription]);

  const createCheckoutSession = useCallback(async (priceId: string, planType: 'monthly' | 'yearly') => {
    try {
      console.log('[useSubscription] Creating checkout session for plan:', planType);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, planType },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[useSubscription] Error creating checkout session:', error);
        throw error;
      }

      if (data?.url) {
        console.log('[useSubscription] Opening checkout URL:', data.url);
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('[useSubscription] Error in createCheckoutSession:', error);
      throw error;
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      console.log('[useSubscription] Opening customer portal...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[useSubscription] Error creating portal session:', error);
        throw error;
      }

      if (data?.url) {
        console.log('[useSubscription] Opening portal URL:', data.url);
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('[useSubscription] Error in openCustomerPortal:', error);
      throw error;
    }
  }, []);

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';
  const hasActiveSubscription = isSubscribed;

  return {
    subscription,
    loading,
    isSubscribed,
    hasActiveSubscription,
    planType: subscription?.plan_type || null,
    refreshSubscription: fetchSubscription,
    createCheckoutSession,
    openCustomerPortal,
  };
}
