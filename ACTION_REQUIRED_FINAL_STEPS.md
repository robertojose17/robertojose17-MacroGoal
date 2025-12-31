
# ⚡ ACTION REQUIRED: Final Steps Before Launch

## 🎯 Critical Actions You Must Take

### ✅ Step 1: Verify Stripe Configuration (5 minutes)

**Check your Stripe Dashboard**:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Switch to **LIVE mode** (toggle in top-left)
3. Copy your **Live Publishable Key** (starts with `pk_live_`)
4. Copy your **Live Secret Key** (starts with `sk_live_`)

**Update your app**:

File: `utils/stripeConfig.ts`
```typescript
// Replace this line:
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SZK7g7srrOKlxJ1UOLSMuXKrzygctxiHiTnEzuH5AqcU2WNEjxuhLochFQqUWSmVBDWlhbmQIR9q95YXZiB9keG00tqZCYrJn';

// With YOUR live publishable key:
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_KEY_HERE';
```

---

### ✅ Step 2: Configure Stripe Webhook (10 minutes)

**In Stripe Dashboard**:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

**Update Supabase Secrets**:

1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions
2. Click **"Secrets"** tab
3. Add/Update these secrets:
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

---

### ✅ Step 3: Test on iOS Device (15 minutes)

**Build and install app**:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Rebuild for iOS
expo prebuild -p ios

# Run on connected iOS device
expo run:ios --device
```

**Test the flow**:

1. Open app on iOS device
2. Navigate to **Profile** > **Upgrade to Premium**
3. Select **Monthly** plan
4. Enter test card: `4242 4242 4242 4242`
5. Complete payment
6. **Verify**:
   - ✅ Safari redirects to app automatically
   - ✅ Alert shows: "Payment Successful!"
   - ✅ App navigates to Profile
   - ✅ Within 10-40 seconds: Alert shows "Welcome to Premium!"
   - ✅ Profile shows "Premium" badge

---

### ✅ Step 4: Verify Webhook Logs (5 minutes)

**Check Supabase Logs**:

1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/functions/stripe-webhook/logs
2. Look for recent logs
3. **Expected logs**:
   ```
   [Webhook] ✅ Signature verified
   [Webhook] 📦 Event type: checkout.session.completed
   [Webhook] ✅ User type updated to: premium
   ```

**Check Stripe Logs**:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Check **"Recent events"** tab
4. **Expected**: All events show "Succeeded" status

---

### ✅ Step 5: Verify Database (5 minutes)

**Run these SQL queries in Supabase**:

1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/editor
2. Run:

```sql
-- Check user type (should be 'premium')
SELECT id, email, user_type 
FROM users 
WHERE email = 'YOUR_TEST_EMAIL';

-- Check subscription (should be 'active')
SELECT user_id, status, stripe_subscription_id, plan_type
FROM subscriptions 
WHERE user_id = 'YOUR_USER_ID';

-- Check customer mapping (should have stripe_customer_id)
SELECT user_id, stripe_customer_id
FROM user_stripe_customers 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected Results**:
- `users.user_type` = `'premium'`
- `subscriptions.status` = `'active'`
- `subscriptions.stripe_subscription_id` = `'sub_...'`
- `user_stripe_customers.stripe_customer_id` = `'cus_...'`

---

### ✅ Step 6: Test Deep Link Manually (Optional, 5 minutes)

**Test deep link on iOS Simulator**:

```bash
# Open iOS Simulator
# Then run:
xcrun simctl openurl booted "macrogoal://profile?payment_success=true&session_id=cs_test_123"
```

**Expected**:
- ✅ App opens automatically
- ✅ Navigates to Profile screen
- ✅ Shows success alert

---

## 🚨 Troubleshooting

### Issue: App doesn't open from deep link

**Solution**:
```bash
# Rebuild app with URL scheme
expo prebuild -p ios
expo run:ios --device
```

---

### Issue: Premium status not updating

**Solution**:
1. Check webhook logs in Supabase
2. Check webhook logs in Stripe Dashboard
3. Verify webhook secret is correct
4. Manually trigger sync:
   ```typescript
   // In app, call:
   await supabase.functions.invoke('sync-subscription');
   ```

---

### Issue: Webhook shows "signature verification failed"

**Solution**:
1. Copy webhook secret from Stripe Dashboard
2. Update Supabase secret: `STRIPE_WEBHOOK_SECRET`
3. Redeploy webhook function (already done!)

---

## ✅ Final Checklist

Before going live:

- [ ] Stripe account in **LIVE mode**
- [ ] Live publishable key in `utils/stripeConfig.ts`
- [ ] Live secret key in Supabase secrets
- [ ] Live webhook secret in Supabase secrets
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook events selected (4 events)
- [ ] iOS app rebuilt with `expo prebuild -p ios`
- [ ] Test payment completed successfully
- [ ] Safari redirects to app automatically
- [ ] Premium status updates within 60 seconds
- [ ] Webhook logs show successful processing
- [ ] Database shows correct data
- [ ] Deep link works manually

---

## 🎉 You're Ready!

Once all checkboxes are checked, you're ready to launch! 🚀

**Estimated Time**: 45 minutes total

**What's Already Done**:
- ✅ Edge Functions deployed
- ✅ Deep link handler implemented
- ✅ Retry logic implemented
- ✅ Database structure ready
- ✅ Webhook handler ready

**What You Need to Do**:
- [ ] Update Stripe keys (5 min)
- [ ] Configure webhook (10 min)
- [ ] Test on device (15 min)
- [ ] Verify logs (5 min)
- [ ] Verify database (5 min)
- [ ] Test deep link (5 min)

---

## 📞 Need Help?

If you get stuck:

1. **Check logs first**:
   - Supabase Edge Function logs
   - Stripe webhook logs
   - Xcode console logs

2. **Verify configuration**:
   - Stripe keys are correct
   - Webhook secret is correct
   - Deep link scheme is correct

3. **Test manually**:
   - Deep link with `xcrun simctl openurl`
   - Webhook with Stripe CLI
   - Database queries with SQL

4. **Review documentation**:
   - `STRIPE_IOS_REDIRECT_FIX_PRODUCTION_READY.md`
   - `STRIPE_PRODUCTION_CONFIG_REFERENCE.md`
   - `LAUNCH_READY_STRIPE_FIX_SUMMARY.md`

---

**Everything is ready. Just follow these steps and you'll be live!** 🚀
