
/**
 * Stripe Configuration
 * 
 * IMPORTANT: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
 * 
 * To get your Price IDs:
 * 1. Go to https://dashboard.stripe.com/test/products
 * 2. Create a product called "Elite Macro Tracker Premium"
 * 3. Add two prices:
 *    - Monthly: $9.99/month (recurring)
 *    - Yearly: $99.99/year (recurring)
 * 4. Copy the Price IDs (they start with "price_") and paste them below
 * 
 * For testing, use TEST mode Price IDs (they will have "test" in the dashboard URL)
 */

export const STRIPE_CONFIG = {
  // Replace these with your actual Stripe TEST Price IDs
  MONTHLY_PRICE_ID: 'price_MONTHLY_TEST_ID_HERE',
  YEARLY_PRICE_ID: 'price_YEARLY_TEST_ID_HERE',
  
  // Pricing display (update if you change prices)
  MONTHLY_PRICE: 9.99,
  YEARLY_PRICE: 99.99,
  
  // Calculated values
  get YEARLY_MONTHLY_EQUIVALENT() {
    return (this.YEARLY_PRICE / 12).toFixed(2);
  },
  get YEARLY_SAVINGS_PERCENT() {
    const monthlyCost = this.MONTHLY_PRICE * 12;
    const savings = ((monthlyCost - this.YEARLY_PRICE) / monthlyCost) * 100;
    return Math.round(savings);
  },
};

/**
 * Environment Variables Required in Supabase Edge Functions:
 * 
 * Set these in your Supabase project settings:
 * https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
 * 
 * 1. STRIPE_SECRET_KEY - Your Stripe Secret Key (starts with sk_test_)
 * 2. STRIPE_WEBHOOK_SECRET - Your Stripe Webhook Secret (starts with whsec_)
 * 3. STRIPE_MONTHLY_PRICE_ID - Same as MONTHLY_PRICE_ID above
 * 4. STRIPE_YEARLY_PRICE_ID - Same as YEARLY_PRICE_ID above
 * 
 * To get your Stripe keys:
 * 1. Go to https://dashboard.stripe.com/test/apikeys
 * 2. Copy the "Secret key" (click "Reveal test key")
 * 3. For webhook secret, create a webhook endpoint pointing to:
 *    https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
 * 4. Copy the webhook signing secret
 */

// Validate configuration on load
if (STRIPE_CONFIG.MONTHLY_PRICE_ID.includes('TEST_ID_HERE') || STRIPE_CONFIG.YEARLY_PRICE_ID.includes('TEST_ID_HERE')) {
  console.warn('⚠️  STRIPE NOT CONFIGURED!');
  console.warn('⚠️  Please update utils/stripeConfig.ts with your actual Stripe Price IDs');
  console.warn('⚠️  See QUICK_START_SUBSCRIPTION.md for setup instructions');
} else {
  console.log('✅ [Stripe Config] Configuration loaded successfully');
  console.log('[Stripe Config] Monthly Price ID:', STRIPE_CONFIG.MONTHLY_PRICE_ID);
  console.log('[Stripe Config] Yearly Price ID:', STRIPE_CONFIG.YEARLY_PRICE_ID);
  console.log('[Stripe Config] Yearly savings:', STRIPE_CONFIG.YEARLY_SAVINGS_PERCENT + '%');
}
