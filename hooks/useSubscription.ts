
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { Alert, Linking } from 'react-native';
import { STRIPE_CONFIG } from '@/utils/stripeConfig';

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'inactive' | 'canceled' | null>(null);

  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubscribed(false);
        setSubscriptionStatus('inactive');
        setSubscriptionLoading(false);
        return;
      }

      // Query the users table (not profiles)
      const { data: userData, error } = await supabase
        .from('users')
        .select('subscription_status, user_type')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription status:', error);
        setIsSubscribed(false);
        setSubscriptionStatus('inactive');
      } else {
        const status = userData?.subscription_status || 'inactive';
        const userType = userData?.user_type || 'free';
        setSubscriptionStatus(status as any);
        setIsSubscribed(status === 'active' && userType === 'premium');
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setIsSubscribed(false);
      setSubscriptionStatus('inactive');
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const createCheckoutSession = async (priceId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('Creating checkout session for user:', user.id, 'priceId:', priceId);

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { 
        priceId,
        userId: user.id // Pass userId to Edge Function
      },
    });

    if (error) {
      console.error('Error invoking create-checkout-session:', error);
      throw error;
    }
    
    if (!data?.url) {
      console.error('No checkout URL returned:', data);
      throw new Error('No checkout URL returned');
    }

    console.log('Checkout session created:', data.url);
    return data.url;
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    try {
      setSubscriptionLoading(true);
      const priceId = plan === 'monthly' ? STRIPE_CONFIG.monthlyPriceId : STRIPE_CONFIG.yearlyPriceId;
      console.log('Subscribing to plan:', plan, 'priceId:', priceId);
      
      const checkoutUrl = await createCheckoutSession(priceId);
      console.log('Opening checkout URL:', checkoutUrl);
      
      await Linking.openURL(checkoutUrl);
    } catch (error: any) {
      console.error('Error in handleSubscribe:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const restoreSubscription = async () => {
    setSubscriptionLoading(true);
    await refreshSubscriptionStatus();
    setSubscriptionLoading(false);
    Alert.alert('Subscription Restored', 'Your subscription status has been refreshed.');
  };

  const cancelSubscription = async () => {
    Alert.alert('Cancel Subscription', 'Please contact support to cancel your subscription.');
  };

  return {
    isSubscribed,
    subscriptionLoading,
    subscriptionStatus,
    createCheckoutSession,
    handleSubscribe,
    restoreSubscription,
    cancelSubscription,
    refreshSubscriptionStatus,
  };
}
