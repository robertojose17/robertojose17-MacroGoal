
/**
 * Stripe Configuration
 * 
 * IMPORTANT: When switching to LIVE mode:
 * 1. Replace STRIPE_PUBLISHABLE_KEY with your live publishable key (pk_live_...)
 * 2. Replace PRICE_IDS with your live price IDs (price_...)
 * 3. Update Supabase secrets: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
 * 4. Redeploy all Stripe-related Edge Functions
 */

// ============================================
// LIVE MODE CONFIGURATION
// ============================================
// Replace these with your LIVE Stripe keys
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_LIVE_PUBLISHABLE_KEY'; // TODO: Replace with live key

export const PRICE_IDS = {
  monthly: 'price_YOUR_LIVE_MONTHLY_PRICE_ID', // TODO: Replace with live monthly price ID
  annual: 'price_YOUR_LIVE_ANNUAL_PRICE_ID',   // TODO: Replace with live annual price ID (if applicable)
};

// ============================================
// TEST MODE CONFIGURATION (for reference)
// ============================================
// Keep these commented out for reference
// export const STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
// export const PRICE_IDS = {
//   monthly: 'price_test_...',
//   annual: 'price_test_...',
// };

export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  priceIds: PRICE_IDS,
};

// Validation helper
export function validateStripeConfig() {
  if (STRIPE_PUBLISHABLE_KEY.includes('test')) {
    console.warn('⚠️ WARNING: Using TEST Stripe keys. Switch to LIVE keys for production!');
    return false;
  }
  
  if (Object.values(PRICE_IDS).some(id => id.includes('test'))) {
    console.warn('⚠️ WARNING: Using TEST price IDs. Switch to LIVE price IDs for production!');
    return false;
  }
  
  console.log('✅ Stripe configured for LIVE mode');
  return true;
}
