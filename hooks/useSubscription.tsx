
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/integrations/supabase/client'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Alert, AppState, AppStateStatus } from 'react-native'

export function useSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchSubscriptionStatus = useCallback(async (retries = 3) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsSubscribed(false)
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Fetch from users table (user_type field)
      const { data: userData, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const isPremium = userData?.user_type === 'premium'
      setIsSubscribed(isPremium)
      setLoading(false)

      console.log('[useSubscription] User type:', userData?.user_type, 'isPremium:', isPremium)
    } catch (error) {
      console.error('[useSubscription] Error fetching subscription:', error)
      
      if (retries > 0) {
        console.log('[useSubscription] Retrying...', retries, 'attempts left')
        setTimeout(() => fetchSubscriptionStatus(retries - 1), 1000)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchSubscriptionStatus()

    // Listen for app state changes (return from background)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[useSubscription] App became active, refreshing subscription status')
        fetchSubscriptionStatus()
      }
    })

    return () => subscription.remove()
  }, [fetchSubscriptionStatus])

  const subscribe = useCallback(async (plan: 'monthly' | 'yearly') => {
    if (!userId) {
      Alert.alert('Error', 'Please log in first')
      return
    }

    try {
      console.log('[useSubscription] Creating checkout session for plan:', plan)

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { user_id: userId, plan },
      })

      if (error) throw error

      if (data?.url) {
        console.log('[useSubscription] Opening checkout URL')
        await WebBrowser.openBrowserAsync(data.url)
      }
    } catch (error) {
      console.error('[useSubscription] Subscription error:', error)
      Alert.alert('Error', 'Failed to start checkout')
    }
  }, [userId])

  return {
    isSubscribed,
    loading,
    subscribe,
    refresh: fetchSubscriptionStatus,
  }
}
