
# 🎯 Complete Stripe Subscription Setup Guide

## ✅ System Status

### Files Present:
- ✅ `hooks/useSubscription.ts` - Client subscription hook
- ✅ `app/paywall.tsx` - Premium paywall screen
- ✅ `supabase/functions/create-checkout-session/index.ts` - Checkout Edge Function
- ✅ `supabase/functions/stripe-webhook/index.ts` - Webhook Edge Function
- ✅ `utils/stripeConfig.ts` - Stripe configuration

### Edge Functions Deployed:
- ✅ `create-checkout-session` (version 32, ACTIVE)
- ✅ `stripe-webhook` (version 34, ACTIVE, JWT verification disabled)

### Database Schema:
- ✅ `users` table has all required subscription columns:
  - `user_type` (free/premium)
  - `subscription_status`
  - `subscription_plan`
  - `subscription_expires_at`
  - `stripe_customer_id`
  - `stripe_subscription_id`

---

## 📋 Required Configuration

### A) Environment Variables

#### 1. Client-Side (`.env` file in project root)
```bash
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
```

#### 2. Supabase Edge Function Secrets
Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_URL=myapp://
```

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Create Stripe Products & Get Price IDs

1. **Go to Stripe Dashboard:**
   - Test Mode: https://dashboard.stripe.com/test/products
   - Live Mode: https://dashboard.stripe.com/products

2. **Create Monthly Product:**
   - Click "Add product"
   - Name: "Elite Macro Tracker - Monthly"
   - Description: "Monthly premium subscription"
   - Pricing model: "Recurring"
   - Price: $9.99
   - Billing period: Monthly
   - Click "Save product"
   - **Copy the Price ID** (starts with `price_`, NOT `prod_`)

3. **Create Yearly Product:**
   - Click "Add product"
   - Name: "Elite Macro Tracker - Yearly"
   - Description: "Yearly premium subscription (save 40%)"
   - Pricing model: "Recurring"
   - Price: $59.99
   - Billing period: Yearly
   - Click "Save product"
   - **Copy the Price ID** (starts with `price_`, NOT `prod_`)

4. **Update Client Environment:**
   Create/update `.env` file in project root:
   ```bash
   EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1234567890abcdef
   EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_0987654321fedcba
   ```

---

### Step 2: Get Stripe API Keys

1. **Go to API Keys:**
   - Test Mode: https://dashboard.stripe.com/test/apikeys
   - Live Mode: https://dashboard.stripe.com/apikeys

2. **Copy Secret Key:**
   - Click "Reveal test key" (or "Reveal live key")
   - Copy the key (starts with `sk_test_` or `sk_live_`)

3. **Set in Supabase:**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```

---

### Step 3: Configure Stripe Webhook

1. **Go to Webhooks:**
   - Test Mode: https://dashboard.stripe.com/test/webhooks
   - Live Mode: https://dashboard.stripe.com/webhooks

2. **Add Endpoint:**
   - Click "Add endpoint"
   - Endpoint URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
   - Description: "Elite Macro Tracker Subscription Webhook"

3. **Select Events:**
   - Click "Select events"
   - Search and select:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
   - Click "Add events"

4. **Save and Get Signing Secret:**
   - Click "Add endpoint"
   - Click on the newly created endpoint
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

5. **Set in Supabase:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

---

### Step 4: Set Remaining Supabase Secrets

1. **Get Supabase Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api
   - Copy "service_role" key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

2. **Set All Secrets:**
   ```bash
   supabase secrets set SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   supabase secrets set APP_URL=myapp://
   ```

---

## ✅ Testing the Complete Flow

### Test 1: Open Paywall
```typescript
// In your app
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/paywall');
```

**Expected:** Paywall screen opens with Monthly/Yearly plans

---

### Test 2: Create Checkout Session
1. Select a plan (Monthly or Yearly)
2. Tap "Start Premium"

**Expected:**
- Loading indicator appears
- Browser/in-app browser opens with Stripe Checkout
- URL looks like: `https://checkout.stripe.com/c/pay/cs_test_...`

**Troubleshooting:**
- If nothing happens: Check console for errors
- If "Failed to start checkout": Check Edge Function logs
  ```bash
  supabase functions logs create-checkout-session
  ```

---

### Test 3: Complete Payment
1. Use Stripe test card: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., `12/34`)
3. CVC: Any 3 digits (e.g., `123`)
4. Name: Any name
5. Click "Subscribe"

**Expected:**
- Payment processes successfully
- Redirects back to app with success URL

---

### Test 4: Verify Webhook
```bash
# Check webhook logs
supabase functions logs stripe-webhook
```

**Expected Output:**
```
Webhook event: checkout.session.completed
User upgraded to premium: <user_id>
```

**Troubleshooting:**
- If no logs: Webhook not configured correctly in Stripe
- If error logs: Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

---

### Test 5: Verify User Profile
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  email,
  user_type,
  subscription_status,
  subscription_plan,
  subscription_expires_at,
  stripe_customer_id,
  stripe_subscription_id
FROM users
WHERE email = 'your-test-email@example.com';
```

**Expected:**
- `user_type` = `'premium'`
- `subscription_status` = `'active'`
- `subscription_plan` = `'price_xxxxx'` (your price ID)
- `subscription_expires_at` = future date
- `stripe_customer_id` = `'cus_xxxxx'`
- `stripe_subscription_id` = `'sub_xxxxx'`

---

### Test 6: Verify in App
```typescript
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const { isSubscribed, loading, status } = useSubscription();
  
  if (loading) return <Text>Loading...</Text>;
  
  return (
    <View>
      <Text>Premium: {isSubscribed ? 'Yes' : 'No'}</Text>
      <Text>Status: {status}</Text>
    </View>
  );
}
```

**Expected:**
- `isSubscribed` = `true`
- `status` = `'active'`

---

## 🔄 Switching to Production

### 1. Create Live Products in Stripe
- Switch to Live mode in Stripe Dashboard
- Create the same products/prices as in Test mode
- Copy the **live** Price IDs

### 2. Update Client Environment
```bash
# Update .env with LIVE price IDs
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_LIVE_xxxxxxxxxxxxx
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_LIVE_xxxxxxxxxxxxx
```

### 3. Update Supabase Secrets
```bash
# Use LIVE Stripe keys
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_LIVE_xxxxxxxxxxxxx
```

### 4. Create Live Webhook
- Go to: https://dashboard.stripe.com/webhooks (Live mode)
- Add endpoint: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
- Select same events as test mode
- Copy new signing secret and update Supabase secrets

---

## 🐛 Troubleshooting Guide

### Issue: Checkout doesn't open

**Symptoms:** Tapping "Start Premium" does nothing or shows error

**Solutions:**
1. Check environment variables are set:
   ```bash
   # In your app, add console.log
   console.log('Monthly Price ID:', process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID);
   console.log('Yearly Price ID:', process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID);
   ```
2. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```
3. Check Edge Function logs:
   ```bash
   supabase functions logs create-checkout-session
   ```

---

### Issue: Webhook returns 400/500

**Symptoms:** Payment succeeds but user not upgraded

**Solutions:**
1. Verify webhook secret matches:
   - Stripe Dashboard → Webhooks → Your endpoint → Signing secret
   - Must match `STRIPE_WEBHOOK_SECRET` in Supabase
2. Check webhook logs:
   ```bash
   supabase functions logs stripe-webhook
   ```
3. Verify events are selected in Stripe webhook configuration

---

### Issue: User not upgraded after payment

**Symptoms:** Payment succeeds, webhook returns 200, but user still shows as free

**Solutions:**
1. Check database columns exist:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN (
     'user_type',
     'subscription_status',
     'subscription_plan',
     'subscription_expires_at',
     'stripe_customer_id',
     'stripe_subscription_id'
   );
   ```
2. Check webhook logs for errors
3. Verify `userId` is passed correctly in checkout session

---

### Issue: "Invalid price ID" error

**Symptoms:** Error when creating checkout session

**Solutions:**
1. Verify you're using **Price IDs** (start with `price_`), NOT Product IDs (start with `prod_`)
2. Check Price IDs exist in Stripe Dashboard
3. Ensure you're using Test price IDs in Test mode, Live price IDs in Live mode

---

## 📞 Pre-Launch Checklist

Before going live, verify:

- [ ] All environment variables are set (client + Supabase)
- [ ] Edge Functions are deployed and ACTIVE
- [ ] Webhook endpoint is configured in Stripe with correct events
- [ ] Database schema includes all subscription columns
- [ ] Test card completes checkout successfully
- [ ] Webhook logs show successful events
- [ ] User profile updates to premium after payment
- [ ] App correctly shows premium status
- [ ] Live Stripe products/prices are created
- [ ] Live webhook endpoint is configured
- [ ] Live API keys are set in Supabase secrets

---

## 🎯 Quick Reference

### Webhook Endpoint URL:
```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
```

### Required Webhook Events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Test Card:
- Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Useful Commands:
```bash
# View Edge Function logs
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook

# List Edge Functions
supabase functions list

# Set secrets
supabase secrets set KEY_NAME=value

# List secrets
supabase secrets list
```

---

## 🎉 Success Criteria

Your subscription system is working correctly when:

1. ✅ User can open paywall and see plans
2. ✅ Tapping "Start Premium" opens Stripe Checkout
3. ✅ Test card payment completes successfully
4. ✅ Webhook receives `checkout.session.completed` event
5. ✅ User profile updates to `user_type: 'premium'`
6. ✅ App shows premium features/status
7. ✅ Subscription updates/cancellations are handled correctly

---

## 📚 Additional Resources

- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
</write file>

Now let me create a quick verification script to help users check their setup:

<write file="utils/subscriptionVerification.ts">
/**
 * Subscription System Verification Utility
 * 
 * Use this to verify your subscription setup is complete.
 * Run this in your app during development to check configuration.
 */

import { supabase } from '@/app/integrations/supabase/client';

export interface VerificationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export async function verifySubscriptionSetup(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Check client environment variables
  const monthlyPriceId = process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID;

  results.push({
    category: 'Client Config',
    check: 'Monthly Price ID',
    status: monthlyPriceId && monthlyPriceId.startsWith('price_') ? 'pass' : 'fail',
    message: monthlyPriceId 
      ? monthlyPriceId.startsWith('price_') 
        ? `✅ ${monthlyPriceId}`
        : `❌ Invalid format: ${monthlyPriceId} (must start with "price_")`
      : '❌ Not set (EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID)',
  });

  results.push({
    category: 'Client Config',
    check: 'Yearly Price ID',
    status: yearlyPriceId && yearlyPriceId.startsWith('price_') ? 'pass' : 'fail',
    message: yearlyPriceId 
      ? yearlyPriceId.startsWith('price_') 
        ? `✅ ${yearlyPriceId}`
        : `❌ Invalid format: ${yearlyPriceId} (must start with "price_")`
      : '❌ Not set (EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID)',
  });

  // 2. Check database schema
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (user.user) {
      const { data: profile, error } = await supabase
        .from('users')
        .select('user_type, subscription_status, subscription_plan, subscription_expires_at, stripe_customer_id, stripe_subscription_id')
        .eq('id', user.user.id)
        .single();

      if (error) {
        results.push({
          category: 'Database Schema',
          check: 'Users Table Columns',
          status: 'fail',
          message: `❌ Error querying users table: ${error.message}`,
        });
      } else {
        const hasAllColumns = 
          'user_type' in profile &&
          'subscription_status' in profile &&
          'subscription_plan' in profile &&
          'subscription_expires_at' in profile &&
          'stripe_customer_id' in profile &&
          'stripe_subscription_id' in profile;

        results.push({
          category: 'Database Schema',
          check: 'Users Table Columns',
          status: hasAllColumns ? 'pass' : 'fail',
          message: hasAllColumns 
            ? '✅ All subscription columns exist'
            : '❌ Missing subscription columns in users table',
        });
      }
    } else {
      results.push({
        category: 'Database Schema',
        check: 'Users Table Columns',
        status: 'warning',
        message: '⚠️ Not authenticated - cannot verify schema',
      });
    }
  } catch (error) {
    results.push({
      category: 'Database Schema',
      check: 'Users Table Columns',
      status: 'fail',
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // 3. Check Edge Functions
  try {
    // Test create-checkout-session endpoint
    const { error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId: 'test', userId: 'test' },
    });

    results.push({
      category: 'Edge Functions',
      check: 'create-checkout-session',
      status: checkoutError ? 'warning' : 'pass',
      message: checkoutError 
        ? `⚠️ Function exists but returned error (expected for test data): ${checkoutError.message}`
        : '✅ Function is deployed and responding',
    });
  } catch (error) {
    results.push({
      category: 'Edge Functions',
      check: 'create-checkout-session',
      status: 'fail',
      message: `❌ Function not found or not deployed`,
    });
  }

  // 4. Check webhook endpoint (can't test directly from client, but provide info)
  results.push({
    category: 'Stripe Webhook',
    check: 'Webhook Configuration',
    status: 'warning',
    message: '⚠️ Cannot verify from client. Check Stripe Dashboard → Webhooks',
  });

  return results;
}

export function printVerificationResults(results: VerificationResult[]) {
  console.log('\n🔍 Subscription System Verification\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const categories = [...new Set(results.map(r => r.category))];
  
  categories.forEach(category => {
    console.log(`📋 ${category}`);
    console.log('───────────────────────────────────────────────────────');
    
    const categoryResults = results.filter(r => r.category === category);
    categoryResults.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.check}`);
      console.log(`   ${result.message}`);
    });
    console.log('');
  });

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warning').length;

  console.log('═══════════════════════════════════════════════════════');
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    console.log('❌ Subscription system is NOT ready for production');
    console.log('📖 See SUBSCRIPTION_COMPLETE_SETUP_GUIDE.md for setup instructions\n');
  } else if (warnCount > 0) {
    console.log('⚠️ Subscription system has warnings - review before production');
    console.log('📖 See SUBSCRIPTION_COMPLETE_SETUP_GUIDE.md for details\n');
  } else {
    console.log('✅ Subscription system is ready!');
    console.log('🎉 All checks passed - you can start testing\n');
  }
}

// Example usage:
// import { verifySubscriptionSetup, printVerificationResults } from '@/utils/subscriptionVerification';
// 
// async function checkSetup() {
//   const results = await verifySubscriptionSetup();
//   printVerificationResults(results);
// }
</write file>

Now let me update the paywall to use the correct environment variable names:

<write file="app/paywall.tsx">
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/hooks/useSubscription';

// Get price IDs from environment variables
const STRIPE_MONTHLY_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || '';
const STRIPE_YEARLY_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID || '';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { createCheckoutSession } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const premiumFeatures = [
    { icon: 'chart.bar.fill', title: 'Advanced Analytics', description: '7/30-day trends & adherence' },
    { icon: 'target', title: 'Multiple Goal Phases', description: 'Cut, maintain, bulk cycles' },
    { icon: 'fork.knife', title: 'Custom Recipes', description: 'Multi-ingredient meal builder' },
    { icon: 'checkmark.circle.fill', title: 'Habit Tracking', description: 'Streaks & completion stats' },
    { icon: 'arrow.down.doc.fill', title: 'Data Export', description: 'CSV export for all data' },
    { icon: 'sparkles', title: 'AI Suggestions', description: 'Smart nutrition tips' },
  ];

  async function handleSubscribe() {
    // Verify price IDs are configured
    if (!STRIPE_MONTHLY_PRICE_ID || !STRIPE_YEARLY_PRICE_ID) {
      console.error('❌ Stripe price IDs not configured');
      console.error('Please set EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID and EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID');
      alert('Subscription not configured. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const priceId = selectedPlan === 'monthly' ? STRIPE_MONTHLY_PRICE_ID : STRIPE_YEARLY_PRICE_ID;
      console.log('Creating checkout session with price ID:', priceId);
      
      const checkoutUrl = await createCheckoutSession(priceId);
      
      if (checkoutUrl) {
        console.log('Opening checkout URL:', checkoutUrl);
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
          await Linking.openURL(checkoutUrl);
        } else {
          console.error('Cannot open URL:', checkoutUrl);
          alert('Unable to open checkout. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleSubscribe:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={isDark ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace-premium" size={60} color="#FFD700" />
          <Text style={[styles.title, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Unlock Premium
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            Take your fitness journey to the next level
          </Text>
        </View>

        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: isDark ? colors.dark.text : colors.light.text }]}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save 40%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>$59.99/year</Text>
            <Text style={[styles.planDetail, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
              Just $4.99/month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: isDark ? colors.dark.text : colors.light.text }]}>Monthly</Text>
            </View>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>$9.99/month</Text>
            <Text style={[styles.planDetail, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
              Billed monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol ios_icon_name={feature.icon} android_material_icon_name="check-circle" size={24} color="#FFD700" />
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>Start Premium</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Cancel anytime. Terms apply.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#FFD700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planName: {
    ...typography.h3,
  },
  saveBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  saveText: {
    ...typography.caption,
    color: '#000',
    fontWeight: '700',
  },
  planPrice: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  planDetail: {
    ...typography.body,
  },
  featuresContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.caption,
  },
  subscribeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    ...typography.h3,
    color: '#000',
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'center',
  },
});
