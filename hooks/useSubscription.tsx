
/**
 * REMOVED: Subscription functionality has been removed.
 * This app is now 100% free with no premium features.
 * 
 * This file is kept as a stub to prevent import errors,
 * but all subscription logic has been removed.
 */

export function useSubscription() {
  return {
    isSubscribed: true, // Always true - app is free
    loading: false,
    subscribe: async () => {
      console.log('[useSubscription] Subscription functionality has been removed - app is 100% free');
    },
    refresh: async () => {
      console.log('[useSubscription] Subscription functionality has been removed - app is 100% free');
    },
  };
}
