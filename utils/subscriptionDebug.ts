
/**
 * Subscription System Debug Utilities
 * 
 * Use these functions to verify your subscription system is configured correctly
 */

import { STRIPE_CONFIG } from './stripeConfig';

export const debugSubscriptionConfig = () => {
  console.log('========================================');
  console.log('SUBSCRIPTION SYSTEM DEBUG');
  console.log('========================================');
  
  console.log('\n📋 STRIPE CONFIGURATION:');
  console.log('Monthly Price ID:', STRIPE_CONFIG.MONTHLY_PRICE_ID);
  console.log('Yearly Price ID:', STRIPE_CONFIG.YEARLY_PRICE_ID);
  console.log('Monthly Price: $' + STRIPE_CONFIG.MONTHLY_PRICE);
  console.log('Yearly Price: $' + STRIPE_CONFIG.YEARLY_PRICE);
  console.log('Yearly Monthly Equivalent: $' + STRIPE_CONFIG.YEARLY_MONTHLY_EQUIVALENT);
  console.log('Yearly Savings: ' + STRIPE_CONFIG.YEARLY_SAVINGS_PERCENT + '%');
  
  console.log('\n⚠️  CONFIGURATION STATUS:');
  
  const monthlyConfigured = !STRIPE_CONFIG.MONTHLY_PRICE_ID.includes('TEST_ID_HERE');
  const yearlyConfigured = !STRIPE_CONFIG.YEARLY_PRICE_ID.includes('TEST_ID_HERE');
  
  if (monthlyConfigured) {
    console.log('✅ Monthly Price ID configured');
  } else {
    console.log('❌ Monthly Price ID NOT configured - Update utils/stripeConfig.ts');
  }
  
  if (yearlyConfigured) {
    console.log('✅ Yearly Price ID configured');
  } else {
    console.log('❌ Yearly Price ID NOT configured - Update utils/stripeConfig.ts');
  }
  
  console.log('\n📝 NEXT STEPS:');
  if (!monthlyConfigured || !yearlyConfigured) {
    console.log('1. Go to https://dashboard.stripe.com/test/products');
    console.log('2. Create products and prices');
    console.log('3. Copy the Price IDs');
    console.log('4. Update utils/stripeConfig.ts');
    console.log('5. Restart the app');
  } else {
    console.log('✅ Configuration looks good!');
    console.log('Make sure you have also:');
    console.log('1. Set STRIPE_SECRET_KEY in Supabase Edge Functions');
    console.log('2. Set STRIPE_WEBHOOK_SECRET in Supabase Edge Functions');
    console.log('3. Set STRIPE_MONTHLY_PRICE_ID in Supabase Edge Functions');
    console.log('4. Set STRIPE_YEARLY_PRICE_ID in Supabase Edge Functions');
    console.log('5. Created webhook endpoint in Stripe Dashboard');
  }
  
  console.log('\n📚 DOCUMENTATION:');
  console.log('- Quick Start: QUICK_START_SUBSCRIPTION.md');
  console.log('- Full Guide: STRIPE_SETUP_GUIDE.md');
  console.log('- Summary: SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md');
  
  console.log('\n========================================');
  
  return {
    configured: monthlyConfigured && yearlyConfigured,
    monthlyPriceId: STRIPE_CONFIG.MONTHLY_PRICE_ID,
    yearlyPriceId: STRIPE_CONFIG.YEARLY_PRICE_ID,
  };
};

/**
 * Call this function in your app to verify configuration
 * Example: import { debugSubscriptionConfig } from '@/utils/subscriptionDebug';
 *          debugSubscriptionConfig();
 */
