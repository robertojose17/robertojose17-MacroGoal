
/**
 * REMOVED: Subscription functionality has been removed.
 * This app is now 100% free with no premium features.
 * 
 * This file is kept as a stub to prevent import errors,
 * but all subscription logic has been removed.
 */

export type SubscriptionStatus = 'active' | 'inactive';
export type PlanType = null;

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
}

export interface UseSubscriptionReturn {
  subscription: null;
  loading: false;
  isSubscribed: true; // Always true - app is free
  hasActiveSubscription: true; // Always true - app is free
  planType: null;
  refreshSubscription: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  createCheckoutSession: (priceId: string, planType: 'monthly' | 'yearly') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

/**
 * Stub hook - app is now 100% free
 * All features are unlocked by default
 */
export function useSubscription(): UseSubscriptionReturn {
  const noOp = async () => {
    console.log('[useSubscription] Subscription functionality has been removed - app is 100% free');
  };

  return {
    subscription: null,
    loading: false,
    isSubscribed: true, // Always true - everything is free
    hasActiveSubscription: true, // Always true - everything is free
    planType: null,
    refreshSubscription: noOp,
    syncSubscription: noOp,
    refreshUserProfile: noOp,
    createCheckoutSession: noOp,
    openCustomerPortal: noOp,
  };
}
