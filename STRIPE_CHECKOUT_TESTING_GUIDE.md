
# 🧪 Stripe Checkout Testing Guide

## Quick Test (5 minutes)

### Prerequisites
- App running on physical iPhone or Android device
- Stripe test mode enabled
- Test price IDs configured in `utils/stripeConfig.ts`

### Test Steps

1. **Open the app** on your device

2. **Navigate to paywall**:
   - Go to Profile tab
   - Tap "Upgrade to Premium" (or similar)

3. **Select a plan**:
   - Choose Monthly or Yearly
   - Tap "Subscribe Now"

4. **Complete test payment**:
   - Browser opens with Stripe checkout
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)
   - Tap "Subscribe"

5. **Verify redirect** (CRITICAL):
   - ✅ You should see a success page with:
     - Green checkmark icon
     - "Payment Successful!" message
     - "Opening the app..." text
     - Spinner animation
   - ✅ App should open automatically within 1-2 seconds
   - ✅ If not, tap "Open App Manually" button
   - ✅ You should land on the Profile screen

6. **Verify premium activation**:
   - ✅ Profile shows "Premium" badge or status
   - ✅ Subscription details are visible
   - ✅ Try accessing AI features (should work)
   - ✅ Paywall should not appear anymore

7. **Verify persistence**:
   - Close and reopen the app
   - ✅ Premium status should still be active
   - ✅ No need to log in again

### Expected Results

✅ **Browser closes automatically** or shows "Open App" button
✅ **App opens** and navigates to Profile
✅ **Premium badge** appears immediately
✅ **AI features** are unlocked
✅ **Premium persists** after app restart

### Common Issues

#### Issue: Stuck in browser after payment
**Cause**: Old version of Edge Functions deployed
**Fix**: Redeploy `checkout-redirect` and `create-checkout-session` functions

#### Issue: Premium not showing in app
**Cause**: Database not updated or app not refreshing
**Fix**: 
1. Check Supabase Edge Function logs for errors
2. Check database tables (`subscriptions`, `users`)
3. Force close and reopen app

#### Issue: "Open App" button doesn't work
**Cause**: Deep link scheme not configured
**Fix**: Check `app.json` has `scheme: "macrogoal"`

## Detailed Testing

### 1. Test Successful Payment

**Steps**:
1. Complete checkout with test card `4242 4242 4242 4242`
2. Observe redirect page
3. Verify app opens
4. Check premium status

**Expected**:
- Success page shows "Payment Successful!"
- App opens automatically
- Premium activated immediately
- Alert shows "Welcome to Premium!"

### 2. Test Cancelled Payment

**Steps**:
1. Start checkout
2. Tap "Cancel" or back button in browser
3. Observe redirect page
4. Verify app opens

**Expected**:
- Cancel page shows "Checkout Cancelled"
- App opens automatically
- Lands on paywall screen
- Alert shows "Checkout Cancelled"

### 3. Test Failed Payment

**Steps**:
1. Use declined test card: `4000 0000 0000 0002`
2. Complete checkout
3. Observe error

**Expected**:
- Stripe shows error message
- User stays on checkout page
- Can retry with different card

### 4. Test Webhook Backup

**Steps**:
1. Complete payment
2. Immediately close browser (before redirect)
3. Wait 10 seconds
4. Open app manually

**Expected**:
- Premium should still activate (via webhook)
- May take a few seconds longer
- App should show premium status

### 5. Test Subscription Sync

**Steps**:
1. Complete payment and activate premium
2. Go to Stripe dashboard
3. Cancel the subscription
4. Wait 30 seconds
5. Open app

**Expected**:
- App should detect cancellation
- Premium status should update to "Cancelled"
- User should see cancellation notice

## Debugging

### Check Stripe Dashboard

1. Go to Stripe Dashboard → Payments → Checkout Sessions
2. Find your latest session
3. Verify:
   - Status: "Complete"
   - Payment status: "Paid"
   - Success URL: Contains `checkout-redirect`
   - Customer: Has ID
   - Subscription: Has ID

### Check Supabase Logs

1. Go to Supabase Dashboard → Edge Functions → Logs
2. Filter by function: `checkout-redirect`
3. Look for:
   - "Checkout successful, verifying with Stripe..."
   - "Payment verified as PAID"
   - "Subscriptions table updated"
   - "Users table updated - user is now PREMIUM"

### Check Database

1. Go to Supabase Dashboard → Table Editor
2. Check `subscriptions` table:
   - Find your user_id
   - Verify `status = 'active'`
   - Verify `stripe_subscription_id` is set
3. Check `users` table:
   - Find your user_id
   - Verify `user_type = 'premium'`

### Check App Logs

1. Open Xcode (iOS) or Android Studio (Android)
2. View console logs
3. Look for:
   - "[DeepLink] Checkout success detected!"
   - "[DeepLink] Subscription synced"
   - "[useSubscription] Premium status confirmed!"

## Test Cards

### Successful Payments
- `4242 4242 4242 4242` - Visa (always succeeds)
- `5555 5555 5555 4444` - Mastercard (always succeeds)

### Failed Payments
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

### 3D Secure
- `4000 0025 0000 3155` - Requires authentication

## Production Testing

⚠️ **Before going live**:

1. Switch Stripe to **live mode**
2. Update price IDs in `utils/stripeConfig.ts` to **live price IDs**
3. Test with **real card** (will be charged!)
4. Verify webhook is configured for **live mode**
5. Test full flow end-to-end
6. Verify cancellation and refund flows

## Support

If issues persist:

1. Check all Edge Function logs
2. Verify Stripe webhook is receiving events
3. Check database tables for data
4. Review app deep link configuration
5. Test on different devices/OS versions

## Success Criteria

✅ Payment completes successfully
✅ Browser shows success page (not blank/error)
✅ App opens automatically (or manual button works)
✅ Premium activates immediately
✅ Premium persists after app restart
✅ Webhook backup works if redirect fails
✅ Cancellation flow works correctly
