
# 🧪 Stripe Redirect Testing Guide

## Quick Test (5 minutes)

### Prerequisites
- App running on device or simulator
- Stripe account with test mode enabled
- Test credit card: `4242 4242 4242 4242`

### Test Steps

#### 1. Test Successful Payment
```bash
# 1. Open app and navigate to paywall
# 2. Select a plan (monthly or yearly)
# 3. Click "Subscribe Now"
# 4. In Stripe checkout, use test card:
#    Card: 4242 4242 4242 4242
#    Expiry: Any future date (e.g., 12/25)
#    CVC: Any 3 digits (e.g., 123)
#    ZIP: Any 5 digits (e.g., 12345)
# 5. Click "Subscribe"
```

**Expected Result:**
- ✅ Browser closes automatically
- ✅ You see alert: "Payment Successful! Processing your subscription..."
- ✅ You're on the profile screen
- ✅ Within 20 seconds, you see: "🎉 Welcome to Premium!"
- ✅ Premium features are unlocked

**❌ FAILURE - If you see:**
- HTML page with code
- "Page not found" error
- Stuck on loading screen

#### 2. Test Cancelled Payment
```bash
# 1. Open app and navigate to paywall
# 2. Select a plan
# 3. Click "Subscribe Now"
# 4. In Stripe checkout, click "Back" or "Cancel"
```

**Expected Result:**
- ✅ Browser closes automatically
- ✅ You see alert: "Checkout Cancelled"
- ✅ You're back on the paywall screen

#### 3. Verify Database Updates
```sql
-- Check subscription status
SELECT user_id, status, plan_type, stripe_subscription_id
FROM subscriptions
WHERE user_id = 'YOUR_USER_ID';

-- Check user type
SELECT id, email, user_type
FROM users
WHERE id = 'YOUR_USER_ID';

-- Check customer mapping
SELECT user_id, stripe_customer_id
FROM user_stripe_customers
WHERE user_id = 'YOUR_USER_ID';
```

**Expected Result:**
- ✅ `subscriptions.status` = 'active' or 'trialing'
- ✅ `users.user_type` = 'premium'
- ✅ `user_stripe_customers` has mapping

## Detailed Testing

### Check App Logs
```bash
# Look for these log messages:

# When opening checkout:
[useSubscription] 💳 Creating checkout session
[Checkout] ✅ Using direct deep links - app will handle via expo-linking

# When returning from checkout:
[DeepLink] ✅ Checkout success detected!
[DeepLink] 🔄 Sync attempt 1/10
[DeepLink] 🎉 Premium status confirmed!
```

### Check Edge Function Logs
```bash
# In Supabase Dashboard > Edge Functions > Logs

# create-checkout-session:
[Checkout] 🚀 Creating Stripe checkout session...
[Checkout] ✅ Session created successfully!
[Checkout] 🎯 After payment, user will be redirected DIRECTLY to app!

# stripe-webhook:
[Webhook] ✅ Checkout completed
[Webhook] ✅ Subscription upserted successfully
[Webhook] ✅ User type updated to: premium
```

### Check Stripe Dashboard
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click on your webhook endpoint
3. Look for recent events:
   - ✅ `checkout.session.completed` - Status 200
   - ✅ `customer.subscription.created` - Status 200

## Common Issues & Solutions

### Issue: Seeing HTML page after payment
**Solution:** 
- This should NOT happen anymore
- If it does, verify `create-checkout-session` was deployed correctly
- Check that success_url starts with `macrogoal://`

### Issue: Premium not activating
**Solution:**
1. Check webhook logs in Stripe dashboard
2. Verify webhook secret is correct in Supabase secrets
3. Check Edge Function logs for errors
4. Wait up to 20 seconds for retry logic

### Issue: Deep link not working
**Solution:**
1. Verify `scheme: "macrogoal"` in app.json
2. Rebuild app if you changed app.json
3. Test deep link manually: `macrogoal://profile?subscription_success=true`

### Issue: "Not authenticated" error
**Solution:**
1. Make sure you're logged in
2. Check that auth token is being passed to Edge Function
3. Verify Supabase session is valid

## Performance Benchmarks

### Expected Timings:
- Checkout session creation: < 2 seconds
- Stripe checkout page load: < 3 seconds
- Payment processing: 2-5 seconds
- Redirect back to app: < 1 second
- Premium activation: 2-20 seconds (with retries)

### Total Time:
- **Best case:** ~10 seconds (checkout to premium)
- **Typical:** ~15 seconds
- **Worst case:** ~30 seconds (with retries)

## Success Metrics

After testing, you should have:
- ✅ 0 HTML pages shown to users
- ✅ 100% successful redirects back to app
- ✅ 100% premium activation rate (within 20 seconds)
- ✅ Clear user feedback at each step
- ✅ No errors in logs

## Test Checklist

- [ ] Successful payment flow works
- [ ] Cancelled payment flow works
- [ ] Premium features unlock correctly
- [ ] Database updates correctly
- [ ] Webhook events are received
- [ ] No HTML pages shown
- [ ] Logs show correct messages
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Works with monthly plan
- [ ] Works with yearly plan

---

**Ready to test?** Start with the Quick Test above! 🚀
