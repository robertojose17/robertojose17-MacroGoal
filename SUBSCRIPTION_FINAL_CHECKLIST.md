
# ✅ Stripe Subscription - Final Pre-Launch Checklist

## 🎯 Overview

This checklist ensures your Stripe subscription system is **100% ready for production**. Complete each section before launching.

---

## 📦 A) Files & Code Verification

### Client-Side Files
- [x] `hooks/useSubscription.ts` - Subscription hook exists and is complete
- [x] `app/paywall.tsx` - Paywall screen exists and uses correct env vars
- [x] `utils/subscriptionVerification.ts` - Verification utility exists

### Edge Functions
- [x] `supabase/functions/create-checkout-session/index.ts` - Deployed (version 32)
- [x] `supabase/functions/stripe-webhook/index.ts` - Deployed (version 34, JWT disabled)

### Database Schema
- [x] `users` table has all required columns:
  - [x] `user_type` (with 'premium' option)
  - [x] `subscription_status`
  - [x] `subscription_plan`
  - [x] `subscription_expires_at`
  - [x] `stripe_customer_id`
  - [x] `stripe_subscription_id`

---

## 🔑 B) Environment Variables & Secrets

### Client-Side (.env file)
Create a `.env` file in your project root with:

```bash
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
```

**How to get these:**
1. Go to https://dashboard.stripe.com/test/products (or /products for live)
2. Click on your product
3. Copy the **Price ID** (starts with `price_`, NOT `prod_`)

**Checklist:**
- [ ] `.env` file created in project root
- [ ] `EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID` is set
- [ ] `EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID` is set
- [ ] Both IDs start with `price_` (not `prod_`)
- [ ] Restart your dev server after setting these

---

### Supabase Edge Function Secrets

Set these in Supabase Dashboard:
https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_URL=myapp://
```

**How to get these:**

1. **STRIPE_SECRET_KEY:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Click "Reveal test key"
   - Copy the key (starts with `sk_test_`)

2. **STRIPE_WEBHOOK_SECRET:**
   - Go to https://dashboard.stripe.com/test/webhooks
   - Click on your webhook endpoint
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

3. **SUPABASE_URL:**
   - Already set: `https://esgptfiofoaeguslgvcq.supabase.co`

4. **SUPABASE_SERVICE_ROLE_KEY:**
   - Go to https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api
   - Copy the "service_role" key (long JWT token)

5. **APP_URL:**
   - Your app's deep link scheme (e.g., `myapp://`)
   - Used for redirecting back to app after checkout

**Checklist:**
- [ ] All 5 secrets are set in Supabase
- [ ] `STRIPE_SECRET_KEY` starts with `sk_test_` (or `sk_live_` for production)
- [ ] `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is the service role key (not anon key)

---

## 🔗 C) Stripe Configuration

### 1. Products & Prices
**Checklist:**
- [ ] Created "Monthly Premium" product in Stripe
- [ ] Created "Yearly Premium" product in Stripe
- [ ] Both products have recurring prices
- [ ] Copied Price IDs (not Product IDs) to `.env`

---

### 2. Webhook Endpoint
**URL:** `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`

**Checklist:**
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Endpoint URL is correct (see above)
- [ ] Selected events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Webhook signing secret copied to Supabase secrets

**How to verify:**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click on your endpoint
3. Verify URL matches exactly
4. Verify all 3 events are selected

---

## 🧪 D) Testing Verification

### Test 1: Environment Variables
Run this in your app:
```typescript
console.log('Monthly:', process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID);
console.log('Yearly:', process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID);
```

**Expected:** Both should print `price_xxxxx` (not undefined)

**Checklist:**
- [ ] Both price IDs print correctly
- [ ] Both start with `price_`

---

### Test 2: Open Paywall
```typescript
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/paywall');
```

**Expected:** Paywall screen opens with Monthly/Yearly plans

**Checklist:**
- [ ] Paywall opens without errors
- [ ] Both plans are visible
- [ ] "Start Premium" button is visible

---

### Test 3: Create Checkout Session
1. Select a plan
2. Tap "Start Premium"

**Expected:** Browser opens with Stripe Checkout

**Checklist:**
- [ ] Loading indicator appears
- [ ] Browser/in-app browser opens
- [ ] URL starts with `https://checkout.stripe.com/`
- [ ] Checkout form is visible

**If it fails:**
- Check console for errors
- Run: `supabase functions logs create-checkout-session`

---

### Test 4: Complete Payment
1. Use test card: `4242 4242 4242 4242`
2. Expiry: `12/34`
3. CVC: `123`
4. Click "Subscribe"

**Expected:** Payment succeeds and redirects back to app

**Checklist:**
- [ ] Payment processes successfully
- [ ] Redirects back to app (or shows success page)

---

### Test 5: Verify Webhook
```bash
supabase functions logs stripe-webhook
```

**Expected Output:**
```
Webhook event: checkout.session.completed
User upgraded to premium: <user_id>
```

**Checklist:**
- [ ] Webhook logs show `checkout.session.completed`
- [ ] Logs show "User upgraded to premium"
- [ ] No error messages in logs

**If webhook fails:**
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint URL is correct
- Verify events are selected in Stripe

---

### Test 6: Verify Database
```sql
SELECT 
  email,
  user_type,
  subscription_status,
  subscription_plan,
  stripe_customer_id
FROM users
WHERE email = 'your-test-email@example.com';
```

**Expected:**
- `user_type` = `'premium'`
- `subscription_status` = `'active'`
- `subscription_plan` = `'price_xxxxx'`
- `stripe_customer_id` = `'cus_xxxxx'`

**Checklist:**
- [ ] User type is 'premium'
- [ ] Subscription status is 'active'
- [ ] Subscription plan matches your price ID
- [ ] Stripe customer ID is set

---

### Test 7: Verify in App
```typescript
import { useSubscription } from '@/hooks/useSubscription';

const { isSubscribed, loading, status } = useSubscription();
console.log('Subscribed:', isSubscribed);
console.log('Status:', status);
```

**Expected:**
- `isSubscribed` = `true`
- `status` = `'active'`

**Checklist:**
- [ ] `isSubscribed` returns true
- [ ] `status` returns 'active'
- [ ] Premium features are unlocked in app

---

## 🚀 E) Production Readiness

### Before Going Live:

1. **Create Live Products:**
   - [ ] Switch to Live mode in Stripe Dashboard
   - [ ] Create same products/prices as test mode
   - [ ] Copy live Price IDs

2. **Update Client Environment:**
   - [ ] Update `.env` with live price IDs
   - [ ] Rebuild app with production config

3. **Update Supabase Secrets:**
   - [ ] Set `STRIPE_SECRET_KEY` to live key (`sk_live_`)
   - [ ] Set `STRIPE_WEBHOOK_SECRET` to live webhook secret

4. **Create Live Webhook:**
   - [ ] Go to https://dashboard.stripe.com/webhooks (Live mode)
   - [ ] Add endpoint: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
   - [ ] Select same 3 events
   - [ ] Copy signing secret and update Supabase

5. **Final Verification:**
   - [ ] Test with real card (small amount)
   - [ ] Verify webhook receives live events
   - [ ] Verify user upgrades to premium
   - [ ] Test subscription cancellation
   - [ ] Test subscription renewal

---

## 🎯 Success Criteria

Your subscription system is **READY FOR PRODUCTION** when:

- ✅ All environment variables are set (client + Supabase)
- ✅ Edge Functions are deployed and responding
- ✅ Webhook endpoint is configured with correct events
- ✅ Database schema includes all subscription columns
- ✅ Test payment completes successfully
- ✅ Webhook receives and processes events
- ✅ User profile updates to premium
- ✅ App correctly shows premium status
- ✅ Live mode is configured (for production)

---

## 📞 Need Help?

If any test fails, see:
- **SUBSCRIPTION_COMPLETE_SETUP_GUIDE.md** - Detailed setup instructions
- **Troubleshooting section** - Common issues and solutions

**Common Issues:**
- "Checkout doesn't open" → Check environment variables
- "Webhook fails" → Verify webhook secret matches
- "User not upgraded" → Check database columns exist
- "Invalid price ID" → Ensure using Price IDs (not Product IDs)

---

## 🎉 You're Done!

Once all checkboxes are complete, your subscription system is ready to accept payments!

**Next Steps:**
1. Test the complete flow one more time
2. Switch to production mode when ready
3. Monitor Stripe Dashboard for live subscriptions
4. Check webhook logs regularly for any issues
