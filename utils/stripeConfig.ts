
/**
 * REMOVED: Stripe configuration has been removed.
 * This app is now 100% free with no subscription functionality.
 * 
 * This file is kept as a stub to prevent import errors.
 */

export const STRIPE_PUBLISHABLE_KEY = '';

export const PRICE_IDS = {
  monthly: '',
  annual: '',
};

export const PRICING = {
  monthly: 0,
  yearly: 0,
};

export const STRIPE_CONFIG = {
  publishableKey: '',
  priceIds: PRICE_IDS,
  MONTHLY_PRICE_ID: '',
  YEARLY_PRICE_ID: '',
  MONTHLY_PRICE: 0,
  YEARLY_PRICE: 0,
  YEARLY_SAVINGS_PERCENT: 0,
  YEARLY_MONTHLY_EQUIVALENT: '0',
};

export function validateStripeConfig() {
  console.log('[Stripe] Stripe functionality has been removed - app is 100% free');
  return true;
}
