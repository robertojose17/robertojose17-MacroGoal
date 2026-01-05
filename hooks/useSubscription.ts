
import { useState, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { Alert, Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'inactive';
  plan_name?: string;
  plan_type?: 'monthly' | 'yearly';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [planType, setPlanType] = useState<'monthly' | 'yearly' | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[Subscription] No authenticated user');
        setSubscription(null);
        setIsSubscribed(false);
        setPlanType(null);
        return;
      }

      console.log('[Subscription] Loading subscription for user:', user.id);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[Subscription] Error loading:', error);
      }

      if (data) {
        console.log('[Subscription] Subscription data:', data);
        setSubscription(data);
        setIsSubscribed(data.status === 'active' || data.status === 'trialing');
        setPlanType(data.plan_type || null);
      } else {
        console.log('[Subscription] No subscription found');
        setSubscription(null);
        setIsSubscribed(false);
        setPlanType(null);
      }
    } catch (error) {
      console.error('[Subscription] Load failed:', error);
      setSubscription(null);
      setIsSubscribed(false);
      setPlanType(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (priceId: string, planType: 'monthly' | 'yearly') => {
    try {
      console.log('[Subscription] 🚀 Creating checkout session...');
      console.log('[Subscription]   - Price ID:', priceId);
      console.log('[Subscription]   - Plan Type:', planType);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[Subscription] ✅ User authenticated:', user.id);

      // Call backend to create Stripe checkout session
      console.log('[Subscription] 📡 Calling create-checkout-session Edge Function...');
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId, planType }
      });

      if (error) {
        console.error('[Subscription] ❌ Edge Function error:', error);
        throw error;
      }

      console.log('[Subscription] ✅ Edge Function response:', data);

      if (!data?.url) {
        console.error('[Subscription] ❌ No checkout URL in response');
        throw new Error('No checkout URL returned');
      }

      console.log('[Subscription] 🔗 Opening checkout URL:', data.url);

      // Open checkout URL
      if (Platform.OS === 'web') {
        window.location.href = data.url;
      } else {
        // Use WebBrowser for better mobile experience
        const result = await WebBrowser.openBrowserAsync(data.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        
        console.log('[Subscription] WebBrowser result:', result);
        
        // Refresh subscription status after browser closes
        if (result.type === 'dismiss' || result.type === 'cancel') {
          console.log('[Subscription] Browser closed, refreshing subscription status...');
          await loadSubscription();
        }
      }

      return data;
    } catch (error: any) {
      console.error('[Subscription] ❌ Checkout failed:', error);
      console.error('[Subscription] Error type:', error.constructor?.name);
      console.error('[Subscription] Error message:', error.message);
      console.error('[Subscription] Error details:', JSON.stringify(error, null, 2));
      
      Alert.alert(
        'Checkout Error',
        error.message || 'Failed to start checkout. Please try again.'
      );
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
      console.log('[Subscription] 🚀 Opening customer portal...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[Subscription] ✅ User authenticated:', user.id);

      // Call backend to create customer portal session
      console.log('[Subscription] 📡 Calling create-portal-session Edge Function...');
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('[Subscription] ❌ Edge Function error:', error);
        throw error;
      }

      console.log('[Subscription] ✅ Edge Function response:', data);

      if (!data?.url) {
        console.error('[Subscription] ❌ No portal URL in response');
        throw new Error('No portal URL returned');
      }

      console.log('[Subscription] 🔗 Opening portal URL:', data.url);

      // Open portal URL
      if (Platform.OS === 'web') {
        window.location.href = data.url;
      } else {
        // Use WebBrowser for better mobile experience
        const result = await WebBrowser.openBrowserAsync(data.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        
        console.log('[Subscription] WebBrowser result:', result);
        
        // Refresh subscription status after browser closes
        if (result.type === 'dismiss' || result.type === 'cancel') {
          console.log('[Subscription] Browser closed, refreshing subscription status...');
          await loadSubscription();
        }
      }

      return data;
    } catch (error: any) {
      console.error('[Subscription] ❌ Portal failed:', error);
      console.error('[Subscription] Error type:', error.constructor?.name);
      console.error('[Subscription] Error message:', error.message);
      
      Alert.alert(
        'Portal Error',
        error.message || 'Failed to open subscription management. Please try again.'
      );
      throw error;
    }
  };

  const syncSubscription = async () => {
    console.log('[Subscription] 🔄 Syncing subscription from Stripe...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[Subscription] No authenticated user for sync');
        return;
      }

      // Call sync-subscription Edge Function
      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('[Subscription] ❌ Sync error:', error);
      } else {
        console.log('[Subscription] ✅ Sync complete:', data);
        // Reload subscription data
        await loadSubscription();
      }
    } catch (error) {
      console.error('[Subscription] ❌ Sync failed:', error);
    }
  };

  const refreshSubscription = async () => {
    console.log('[Subscription] 🔄 Refreshing subscription...');
    await loadSubscription();
  };

  // Alias for backward compatibility
  const manageSubscription = openCustomerPortal;

  return {
    subscription,
    loading,
    isSubscribed,
    planType,
    createCheckoutSession,
    openCustomerPortal,
    manageSubscription,
    syncSubscription,
    refreshSubscription,
    refresh: loadSubscription,
  };
}
