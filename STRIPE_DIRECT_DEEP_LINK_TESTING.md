
# 🧪 Stripe Direct Deep Link Testing Guide

## Quick Test (5 Minutes)

### Prerequisites
- App installed on physical iOS device (deep links don't work well in simulator)
- Logged into the app
- Stripe test mode enabled

### Test Steps

1. **Navigate to Paywall**
   - Open app
   - Go to Profile tab
   - Tap "Upgrade to Premium" or similar button

2. **Start Checkout**
   - Select a plan (Monthly or Yearly)
   - Tap "Subscribe" button
   - Safari/WebView should open with Stripe checkout

3. **Complete Payment**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: `12/34` (any future date)
   - CVC: `123` (any 3 digits)
   - ZIP: `12345` (any 5 digits)
   - Tap "Subscribe" or "Pay"

4. **Verify Redirect**
   - ✅ Safari/WebView should close automatically
   - ✅ App should open immediately
   - ✅ Should land on Profile screen
   - ✅ NO HTML page should be visible
   - ✅ NO raw code should be displayed

5. **Verify Premium Activation**
   - Wait 2-3 seconds for sync
   - ✅ Premium badge should appear
   - ✅ Success alert should show
   - ✅ Premium features should be unlocked

### Expected Results

**✅ SUCCESS:**
- Checkout → Safari closes → App opens → Profile screen → Premium active
- Total time: ~5 seconds
- No intermediate pages
- No manual actions needed

**❌ FAILURE:**
- HTML page displays
- Raw code visible
- Manual close required
- Premium not activated
- Wrong screen displayed

## Detailed Test Cases

### Test Case 1: Successful Payment

**Steps:**
1. Complete checkout with test card `4242 4242 4242 4242`
2. Observe redirect behavior

**Expected:**
- Deep link: `macrogoal://profile?subscription_success=true`
- App opens to Profile screen
- Alert: "🎉 Welcome to Premium!"
- Premium badge visible
- Subscription status: `active`

**Verify in Database:**
```sql
SELECT * FROM subscriptions WHERE user_id = '<your_user_id>';
-- status should be 'active'

SELECT user_type FROM users WHERE id = '<your_user_id>';
-- user_type should be 'premium'
```

### Test Case 2: Payment Cancellation

**Steps:**
1. Start checkout
2. Tap "Cancel" or back button in Safari

**Expected:**
- Deep link: `macrogoal://paywall?subscription_cancelled=true`
- App opens to Paywall screen
- Alert: "Checkout Cancelled"
- No premium activation

### Test Case 3: Payment Declined

**Steps:**
1. Complete checkout with declined card `4000 0000 0000 0002`
2. Observe behavior

**Expected:**
- Stripe shows error message
- User stays in checkout
- Can retry with valid card
- No deep link triggered until success or cancel

### Test Case 4: Network Error

**Steps:**
1. Start checkout
2. Disable internet during payment
3. Re-enable internet

**Expected:**
- Stripe handles error gracefully
- User can retry
- Webhook will sync when connection restored

### Test Case 5: Webhook Delay

**Steps:**
1. Complete checkout
2. Immediately check premium status

**Expected:**
- App may show "Processing..." briefly
- Webhook updates database within 1-2 seconds
- App syncs and shows premium
- If delay > 5 seconds, check webhook logs

## Monitoring During Tests

### 1. Edge Function Logs

**create-checkout-session:**
```
[Checkout] 🔗 Redirect URLs (DIRECT DEEP LINKS):
[Checkout]   - Success: macrogoal://profile?subscription_success=true
[Checkout]   - Cancel: macrogoal://paywall?subscription_cancelled=true
[Checkout] ✅ NO INTERMEDIATE REDIRECT PAGE - Direct to app!
```

**stripe-webhook:**
```
[Webhook] ✅ Checkout completed: cs_test_...
[Webhook] 💾 Updating subscription in database...
[Webhook] ✅ Subscription upserted successfully
[Webhook] ✅ User type updated to: premium
```

### 2. App Console Logs

```
[DeepLink] ✅ Checkout success detected!
[DeepLink] Syncing subscription after checkout...
[DeepLink] ✅ Subscription synced
[useSubscription] ✅ Subscription fetched: active
```

### 3. Database Verification

```sql
-- Check subscription
SELECT 
  user_id,
  status,
  plan_type,
  stripe_subscription_id,
  current_period_end
FROM subscriptions 
WHERE user_id = '<your_user_id>';

-- Check user type
SELECT 
  id,
  email,
  user_type,
  updated_at
FROM users 
WHERE id = '<your_user_id>';

-- Check customer mapping
SELECT 
  user_id,
  stripe_customer_id,
  updated_at
FROM user_stripe_customers 
WHERE user_id = '<your_user_id>';
```

## Troubleshooting

### Issue: HTML Page Displays

**Symptoms:**
- Raw HTML/CSS/JS code visible
- Page doesn't close automatically

**Solution:**
- This should NOT happen with the new implementation
- If it does, check Edge Function logs
- Verify `success_url` is set to deep link
- Redeploy `create-checkout-session` function

### Issue: App Doesn't Open

**Symptoms:**
- Safari closes but app doesn't open
- Stuck on home screen

**Solution:**
- Verify app scheme is `macrogoal://` in `app.json`
- Check deep link handling in `app/_layout.tsx`
- Test deep link manually: Open Safari, type `macrogoal://profile`
- Rebuild app if scheme was changed

### Issue: Premium Not Activated

**Symptoms:**
- App opens correctly
- But premium badge doesn't appear

**Solution:**
1. Check webhook logs - did it receive the event?
2. Check database - is subscription status `active`?
3. Check user_type - is it `premium`?
4. Try manual sync: Pull to refresh on Profile screen
5. Check for RLS policy issues

### Issue: Wrong Screen Displayed

**Symptoms:**
- App opens but not to Profile screen

**Solution:**
- Check deep link URL in Edge Function logs
- Verify navigation logic in `app/_layout.tsx`
- Check for navigation conflicts

### Issue: Webhook Not Firing

**Symptoms:**
- Payment succeeds
- But database not updated

**Solution:**
1. Check Stripe Dashboard > Developers > Webhooks
2. Verify webhook endpoint is correct
3. Check webhook signing secret matches
4. Look for failed webhook attempts in Stripe
5. Manually trigger webhook from Stripe Dashboard

## Performance Benchmarks

**Target Times:**
- Checkout completion → Safari close: < 1 second
- Safari close → App open: < 1 second
- App open → Premium visible: < 3 seconds
- Total flow: < 5 seconds

**Acceptable Times:**
- Checkout completion → Safari close: < 2 seconds
- Safari close → App open: < 2 seconds
- App open → Premium visible: < 5 seconds
- Total flow: < 10 seconds

**Investigate if:**
- Any step takes > 5 seconds
- Total flow takes > 15 seconds
- User sees loading states for extended periods

## Test Checklist

- [ ] Test successful payment with `4242 4242 4242 4242`
- [ ] Test payment cancellation
- [ ] Test declined card `4000 0000 0000 0002`
- [ ] Verify no HTML page displays
- [ ] Verify Safari closes automatically
- [ ] Verify app opens to Profile
- [ ] Verify premium badge appears
- [ ] Verify premium features unlock
- [ ] Check Edge Function logs
- [ ] Check webhook logs
- [ ] Verify database updates
- [ ] Test on physical iOS device
- [ ] Test on physical Android device (if applicable)
- [ ] Test with slow network
- [ ] Test with airplane mode (should fail gracefully)

## Success Criteria

✅ **All of these must be true:**
1. No HTML page visible at any point
2. Safari/WebView closes automatically
3. App opens immediately after payment
4. Lands on Profile screen
5. Premium badge appears within 5 seconds
6. Success alert displays
7. Premium features are unlocked
8. Database shows `status = 'active'`
9. Database shows `user_type = 'premium'`
10. Webhook logs show successful processing

## Next Steps After Testing

1. **If all tests pass:**
   - ✅ Mark as production-ready
   - ✅ Update documentation
   - ✅ Consider deleting `checkout-redirect` function
   - ✅ Monitor production usage

2. **If tests fail:**
   - ❌ Review Edge Function logs
   - ❌ Check webhook configuration
   - ❌ Verify deep link setup
   - ❌ Test with different devices
   - ❌ Consider rollback if critical

3. **Production Deployment:**
   - Switch Stripe to live mode
   - Update webhook endpoint to production
   - Test with real card (small amount)
   - Monitor first few real transactions
   - Have rollback plan ready

---

**Happy Testing! 🚀**

If you encounter any issues, check the logs first, then refer to the troubleshooting section above.
