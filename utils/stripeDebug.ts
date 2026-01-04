
/**
 * REMOVED: Stripe debugging utilities have been removed.
 * This app is now 100% free with no subscription functionality.
 * 
 * This file is kept as a stub to prevent import errors.
 */

export function validateStripeConfig(): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  return { ok: true, errors: [], warnings: [] };
}

export function logStripeConfig() {
  console.log('[Stripe] Stripe functionality has been removed - app is 100% free');
  return { ok: true, errors: [], warnings: [] };
}

export function logSubscriptionAttempt(priceId: string, planType: string) {
  console.log('[Stripe] Stripe functionality has been removed - app is 100% free');
}
