
# 🚨 CRITICAL ACTION REQUIRED BEFORE LAUNCH

## ⚠️ WEBHOOK IS CURRENTLY FAILING

I can see from the logs that your Stripe webhook is returning **400 errors**. This means webhooks are NOT working, which will prevent premium activation after payment.

**This MUST be fixed before launch!**

---

## 🔧 IMMEDIATE FIX REQUIRED

### Problem
The webhook endpoint is receiving requests from Stripe but returning 400 errors. This is likely due to:
1. Missing or incorrect `STRIPE_WEBHOOK_SECRET`
2. Webhook signature verification failing

### Solution

#### Step 1: Get Your Webhook Signing Secret

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

2. **If you already have a webhook endpoint configured:**
   - Click on the endpoint
   - Click "Signing secret" → "Reveal"
   - Copy the secret (starts with `whsec_...`)

3. **If you DON'T have a webhook endpoint:**
   - Click "Add endpoint"
   - Enter URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Click "Add endpoint"
   - Copy the signing secret (starts with `whsec_...`)

#### Step 2: Update Supabase Secret

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Click on **Secrets**
5. Find or add `STRIPE_WEBHOOK_SECRET`
6. Paste the webhook signing secret from Step 1
7. Click "Save"

#### Step 3: Verify Webhook is Working

1. Go back to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Click "Send test webhook"
6. **Expected**: You should see a **200 response** (success)
7. **If you see 400**: Double-check the webhook secret matches

---

## ✅ VERIFICATION CHECKLIST

Before launching, verify ALL of these:

### Stripe Configuration
- [ ] Webhook endpoint is configured in Stripe Dashboard
- [ ] Webhook URL is: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook events include: `checkout.session.completed`, `customer.subscription.*`
- [ ] Webhook signing secret is copied
- [ ] Test webhook returns **200 response**

### Supabase Configuration
- [ ] `STRIPE_SECRET_KEY` is set (starts with `sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` is set (starts with `whsec_...`)
- [ ] Both secrets match your Stripe Dashboard

### App Configuration
- [ ] `utils/stripeConfig.ts` has live publishable key (`pk_live_...`)
- [ ] `utils/stripeConfig.ts` has live price IDs (`price_...`)
- [ ] App scheme is `macrogoal://` in `app.json`

### Test End-to-End
- [ ] Create a test subscription with a real card
- [ ] Verify payment succeeds in Stripe Dashboard
- [ ] Verify webhook fires successfully (200 response)
- [ ] Verify user is redirected back to app
- [ ] Verify premium status activates within 30 seconds
- [ ] Verify user can access premium features

---

## 🧪 HOW TO TEST

### Test 1: Webhook Test (5 minutes)

1. Go to Stripe Dashboard → Webhooks
2. Click your webhook endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Click "Send test webhook"
6. **Expected**: 200 response
7. **If 400**: Fix webhook secret (see above)

### Test 2: Real Payment Test (10 minutes)

1. Open your app
2. Navigate to paywall
3. Select a plan
4. Click "Subscribe Now"
5. Use a real card (will be charged)
6. Complete payment
7. **Expected**: 
   - Redirected back to app
   - See "Payment Successful!" alert
   - Premium activates within 30 seconds
   - Can access premium features

### Test 3: Restore Subscription (2 minutes)

1. After Test 2, force-close the app
2. Reopen the app
3. Go to Profile
4. Click "Restore Subscription"
5. **Expected**: Premium status confirmed

---

## 🚨 IF WEBHOOK STILL FAILS

If webhook continues to return 400 after updating the secret:

### Check 1: Verify Secret Format
```bash
# Webhook secret should start with: whsec_
# Example: whsec_abc123def456...
```

### Check 2: Check Edge Function Logs
1. Go to Supabase Dashboard → Edge Functions
2. Click on `stripe-webhook`
3. Check logs for error messages
4. Look for: "No signature header" or "Invalid signature"

### Check 3: Redeploy Webhook Function
The webhook function is already deployed with `verify_jwt: false`, but if needed, you can redeploy it by making a small change to the code and saving.

---

## 📞 SUPPORT

If you're still having issues after following these steps:

1. **Check Stripe Dashboard → Webhooks** for detailed error messages
2. **Check Supabase Dashboard → Edge Functions → Logs** for function errors
3. **Verify all secrets are correct** (no typos, no extra spaces)

---

## ⏱️ TIME ESTIMATE

- **Webhook Configuration**: 5 minutes
- **Testing**: 15 minutes
- **Total**: 20 minutes

---

## 🎯 NEXT STEPS

1. ✅ Fix webhook configuration (above)
2. ✅ Test end-to-end with real payment
3. ✅ Verify premium activation works
4. 🚀 **LAUNCH!**

---

**Last Updated**: January 2025
**Status**: ⚠️ ACTION REQUIRED - Webhook not configured
**Priority**: 🔴 CRITICAL - Must fix before launch
