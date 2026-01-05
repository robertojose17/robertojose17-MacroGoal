
# 🎯 SUBSCRIPTION SYSTEM - COMPLETE SETUP GUIDE

## ✅ SYSTEM STATUS: FULLY IMPLEMENTED

All subscription files, Edge Functions, and database tables are **complete and deployed**. This guide provides the final configuration steps and testing procedures.

---

## 📋 A) FILES VERIFICATION CHECKLIST

### ✅ Client-Side Files (All Present)
- [x] `hooks/useSubscription.ts` - Subscription state management hook
- [x] `app/paywall.tsx` - Subscription purchase UI
- [x] `utils/stripeConfig.ts` - Stripe configuration with price IDs
- [x] `utils/subscriptionDebug.ts` - Debug logging utilities
- [x] `app/(tabs)/profile.tsx` - Profile with subscription management

### ✅ Supabase Edge Functions (All Deployed)
- [x] `create-checkout-session` - Creates Stripe checkout sessions
- [x] `stripe-webhook` - Handles Stripe webhook events
- [x] `sync-subscription` - Syncs subscription status from Stripe
- [x] `create-portal-session` - Opens Stripe Customer Portal
- [x] `checkout-redirect` - Handles post-checkout redirects

### ✅ Database Tables (All Exist)
- [x] `users` - User profiles with subscription fields
- [x] `subscriptions` - Detailed subscription records
- [x] `user_stripe_customers` - Maps users to Stripe customers

### ✅ Configuration Files
- [x] `app.json` - Deep linking configured (`elitemacrotracker://`)
- [x] `app/_layout.tsx` - Deep link handlers implemented

---

## 🔑 B) REQUIRED ENVIRONMENT VARIABLES & SECRETS

### 1️⃣ Stripe Dashboard Configuration

**Get Your Stripe Keys:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret Key** (starts with `sk_test_`)
3. Keep this tab open - you'll need it in step 2

**Get Your Price IDs (NOT Product IDs!):**
1. Go to: https://dashboard.stripe.com/test/products
2. Click on your product (e.g., "Elite Macro Tracker Premium")
3. In the **Pricing** section, you'll see your prices
4. Click on each price to see its details
5. Copy the **Price ID** (starts with `price_`, NOT `prod_`)

Example:
- ✅ CORRECT: `price_1QqPxSDsUf4JA97FZvN8Ks3M` (Price ID)
- ❌ WRONG: `prod_TWVql2YFPhAszU` (Product ID - won't work!)

### 2️⃣ Update Client-Side Configuration

**File: `utils/stripeConfig.ts`**

Replace the placeholder price IDs with your actual Stripe Price IDs:

```typescript
export const STRIPE_CONFIG = {
  // ⚠️ REPLACE THESE WITH YOUR ACTUAL STRIPE PRICE IDs
  MONTHLY_PRICE_ID: 'price_YOUR_MONTHLY_PRICE_ID_HERE',
  YEARLY_PRICE_ID: 'price_YOUR_YEARLY_PRICE_ID_HERE',
  
  // Update these if your prices are different
  MONTHLY_PRICE: 9.99,
  YEARLY_PRICE: 99.99,
};
```

**Current values in the file:**
- Monthly: `price_1SZSojDsUf4JA97FuIWfvUfX`
- Yearly: `price_1SZSnyDsUf4JA97Fd7R9BMkD`

If these are your actual price IDs, you're good to go! Otherwise, replace them.

### 3️⃣ Set Supabase Edge Function Secrets

**Go to:** https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions

**Set these secrets:**

```bash
# Stripe Secret Key (from step 1)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Stripe Webhook Secret (you'll get this in step 4)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Supabase URLs (already set, but verify)
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**How to set secrets:**
1. Click "Edge Functions" in the left sidebar
2. Click "Manage secrets"
3. Add each secret with the exact name and value
4. Click "Save"

### 4️⃣ Configure Stripe Webhook

**Create Webhook Endpoint:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Enter this URL:
   ```
   https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Go back to Supabase Edge Function secrets (step 3)
8. Set `STRIPE_WEBHOOK_SECRET` to the signing secret you just copied

---

## 🧪 C) TESTING PROCEDURE

### Test 1: Verify Configuration

**Run this in your app:**
```typescript
import { STRIPE_CONFIG } from '@/utils/stripeConfig';

console.log('Monthly Price ID:', STRIPE_CONFIG.MONTHLY_PRICE_ID);
console.log('Yearly Price ID:', STRIPE_CONFIG.YEARLY_PRICE_ID);
```

**Expected output:**
```
✅ [Stripe Config] Configuration loaded successfully
[Stripe Config] Monthly Price ID: price_1SZSojDsUf4JA97FuIWfvUfX
[Stripe Config] Yearly Price ID: price_1SZSnyDsUf4JA97Fd7R9BMkD
[Stripe Config] Yearly savings: 17%
```

**If you see errors:**
- ❌ "STRIPE NOT CONFIGURED" → You're using placeholder values
- ❌ "You are using PRODUCT IDs" → You copied Product IDs instead of Price IDs

### Test 2: Create Checkout Session

**Steps:**
1. Open the app
2. Navigate to Profile → "View Plans" (or directly to `/paywall`)
3. Select a plan (Monthly or Yearly)
4. Tap "Start Premium"

**Expected behavior:**
- ✅ Browser/WebView opens with Stripe Checkout
- ✅ You see your product name and price
- ✅ Payment form is displayed

**If checkout doesn't open:**
- Check console logs for errors
- Verify `create-checkout-session` Edge Function is deployed
- Verify `STRIPE_SECRET_KEY` is set in Supabase secrets

### Test 3: Complete Payment (Test Mode)

**Use Stripe test card:**
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Steps:**
1. Complete the checkout form with test card
2. Click "Subscribe"

**Expected behavior:**
- ✅ Payment succeeds
- ✅ Redirected back to app
- ✅ Alert: "🎉 Welcome to Premium!"
- ✅ Profile shows "Premium Member" badge

**If payment succeeds but subscription doesn't activate:**
- Check Stripe webhook logs: https://dashboard.stripe.com/test/webhooks
- Verify webhook received `checkout.session.completed` event
- Check Supabase Edge Function logs for `stripe-webhook`
- Run "Restore Purchases" in the app

### Test 4: Verify Database Updates

**Run this SQL in Supabase SQL Editor:**
```sql
-- Check user type
SELECT id, email, user_type 
FROM users 
WHERE email = 'YOUR_TEST_EMAIL@example.com';

-- Check subscription record
SELECT * 
FROM subscriptions 
WHERE user_id = (
  SELECT id FROM users WHERE email = 'YOUR_TEST_EMAIL@example.com'
);
```

**Expected results:**
- `users.user_type` = `'premium'`
- `subscriptions.status` = `'active'`
- `subscriptions.stripe_subscription_id` = `'sub_...'`
- `subscriptions.plan_type` = `'monthly'` or `'yearly'`

### Test 5: Restore Subscription

**Steps:**
1. Go to Profile
2. Tap "Restore Purchases" (if not premium)
3. Wait for sync to complete

**Expected behavior:**
- ✅ If you have an active subscription in Stripe, it will be restored
- ✅ Profile updates to show "Premium Member"
- ✅ Alert: "Your subscription has been restored!"

### Test 6: Manage Subscription

**Steps:**
1. Go to Profile (as a premium user)
2. Tap "Manage Subscription"
3. Stripe Customer Portal opens

**Expected behavior:**
- ✅ Portal shows your subscription details
- ✅ You can cancel, update payment method, view invoices
- ✅ Changes sync back to the app

---

## 🔍 D) DEBUGGING CHECKLIST

### Issue: Checkout doesn't open

**Check:**
1. Console logs for errors
2. `create-checkout-session` Edge Function is deployed
3. `STRIPE_SECRET_KEY` is set in Supabase secrets
4. Price IDs in `stripeConfig.ts` are correct (start with `price_`)

**Debug command:**
```typescript
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
logSubscriptionStatus();
```

### Issue: Payment succeeds but subscription doesn't activate

**Check:**
1. Stripe webhook endpoint is configured correctly
2. Webhook events include `checkout.session.completed`
3. `STRIPE_WEBHOOK_SECRET` is set in Supabase secrets
4. Check Stripe webhook logs for delivery status
5. Check Supabase Edge Function logs for `stripe-webhook`

**Manual sync:**
```typescript
import { manualSyncSubscription } from '@/utils/subscriptionDebug';
manualSyncSubscription();
```

### Issue: "Restore Purchases" doesn't work

**Check:**
1. User has an active subscription in Stripe
2. `sync-subscription` Edge Function is deployed
3. User is logged in (check `supabase.auth.getUser()`)
4. Check Edge Function logs for errors

### Issue: Deep linking doesn't work after checkout

**Check:**
1. `app.json` has `"scheme": "elitemacrotracker"`
2. `app/_layout.tsx` has deep link handlers
3. Stripe success URL is: `elitemacrotracker://profile?subscription_success=true`
4. Test deep link manually: `npx uri-scheme open elitemacrotracker://profile --ios`

---

## 📊 E) PRODUCTION DEPLOYMENT CHECKLIST

### Before Going Live:

1. **Switch to Live Mode in Stripe:**
   - Go to: https://dashboard.stripe.com/settings/account
   - Toggle from "Test mode" to "Live mode"
   - Get your **Live Secret Key** (starts with `sk_live_`)
   - Get your **Live Price IDs** (create products in live mode)

2. **Update Supabase Secrets with Live Keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
   ```

3. **Update `stripeConfig.ts` with Live Price IDs:**
   ```typescript
   MONTHLY_PRICE_ID: 'price_YOUR_LIVE_MONTHLY_PRICE_ID',
   YEARLY_PRICE_ID: 'price_YOUR_LIVE_YEARLY_PRICE_ID',
   ```

4. **Create Live Webhook Endpoint:**
   - Same URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
   - Same events as test mode
   - Copy new live webhook secret

5. **Test with Real Card:**
   - Use a real credit card (will be charged)
   - Verify subscription activates
   - Cancel immediately if testing

6. **Enable Stripe Customer Portal:**
   - Go to: https://dashboard.stripe.com/settings/billing/portal
   - Configure branding, features, and policies
   - Enable "Allow customers to cancel subscriptions"

---

## 🎉 F) SUCCESS CRITERIA

Your subscription system is working correctly when:

- ✅ Paywall displays correct prices from `stripeConfig.ts`
- ✅ "Start Premium" opens Stripe Checkout
- ✅ Test payment succeeds and redirects back to app
- ✅ Profile shows "Premium Member" badge
- ✅ Database shows `user_type = 'premium'` and active subscription
- ✅ "Manage Subscription" opens Stripe Customer Portal
- ✅ "Restore Purchases" syncs subscription from Stripe
- ✅ Webhook logs show successful event processing
- ✅ Deep linking works after checkout

---

## 📞 G) SUPPORT & TROUBLESHOOTING

### Common Errors:

**"Invalid price ID"**
- You're using a Product ID instead of a Price ID
- Price ID must start with `price_`, not `prod_`

**"No such customer"**
- Webhook received event for customer that doesn't exist in database
- Run "Restore Purchases" to sync

**"Webhook signature verification failed"**
- `STRIPE_WEBHOOK_SECRET` is incorrect or not set
- Get the correct secret from Stripe webhook settings

**"Unauthorized"**
- User is not logged in
- Check `supabase.auth.getUser()` returns a user

### Debug Tools:

**Client-side:**
```typescript
import { logSubscriptionStatus, manualSyncSubscription } from '@/utils/subscriptionDebug';

// Log current subscription status
logSubscriptionStatus();

// Manually sync from Stripe
manualSyncSubscription();
```

**Stripe Dashboard:**
- Webhook logs: https://dashboard.stripe.com/test/webhooks
- Customer list: https://dashboard.stripe.com/test/customers
- Subscription list: https://dashboard.stripe.com/test/subscriptions

**Supabase Dashboard:**
- Edge Function logs: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/logs/edge-functions
- Database tables: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/editor

---

## ✅ FINAL CHECKLIST

Before marking subscription as complete:

- [ ] Price IDs updated in `stripeConfig.ts`
- [ ] Supabase secrets set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Stripe webhook endpoint created and configured
- [ ] Test payment completes successfully
- [ ] Subscription activates in database
- [ ] Profile shows premium badge
- [ ] "Manage Subscription" opens portal
- [ ] "Restore Purchases" works
- [ ] Deep linking works after checkout
- [ ] Webhook logs show successful events

---

## 🚀 YOU'RE READY TO LAUNCH!

Once all items in the final checklist are complete, your subscription system is production-ready!

**Next steps:**
1. Test thoroughly in test mode
2. Switch to live mode when ready
3. Update all keys and price IDs for production
4. Test with a real card
5. Launch! 🎉
