
# 🧪 Stripe Checkout Acceptance Test

## Test Environment
- **Device**: Physical iPhone (iOS 15+) or Android device
- **Stripe Mode**: Test mode
- **Network**: Stable internet connection

## Test Procedure

### Step 1: Start Checkout
1. Open the app on your device
2. Navigate to Profile tab
3. Tap "Upgrade to Premium" or similar button
4. Paywall screen should appear

**Expected**: Paywall shows pricing plans

### Step 2: Select Plan
1. Choose Monthly or Yearly plan
2. Tap "Subscribe Now" button
3. Wait for browser to open

**Expected**: 
- Loading indicator appears
- Browser opens with Stripe checkout page

### Step 3: Complete Payment
1. Enter test card details:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
2. Tap "Subscribe" or "Pay" button
3. Wait for processing

**Expected**: 
- Stripe processes payment
- Shows "Payment successful" or similar

### Step 4: Verify Redirect (CRITICAL)
**This is the main fix - verify carefully!**

1. After payment completes, observe the browser
2. You should see a **success page** with:
   - ✅ Green checkmark icon (✅)
   - ✅ "Payment Successful!" heading
   - ✅ "Your premium subscription is now active! Opening the app..." message
   - ✅ Animated spinner
   - ✅ "Open App Manually" button

3. Within 1-2 seconds, the app should:
   - ✅ Open automatically
   - ✅ Close the browser
   - ✅ Navigate to Profile screen

4. If app doesn't open automatically:
   - ✅ Tap "Open App Manually" button
   - ✅ App should open immediately

**Expected**: 
- ✅ Success page is visible (NOT blank/error page)
- ✅ App opens automatically OR manual button works
- ✅ Browser closes
- ✅ Lands on Profile screen

### Step 5: Verify Premium Activation
1. Check Profile screen for premium indicators:
   - ✅ "Premium" badge or status
   - ✅ Subscription details visible
   - ✅ "Manage Subscription" button

2. Check for success alert:
   - ✅ Alert appears: "🎉 Welcome to Premium!"
   - ✅ Message: "Your subscription is now active..."

3. Try accessing AI features:
   - ✅ Navigate to food logging
   - ✅ Try AI meal estimator
   - ✅ Should work without paywall

4. Try accessing paywall:
   - ✅ Paywall should not appear anymore
   - ✅ Or shows "Already Premium" message

**Expected**: 
- ✅ Premium badge visible
- ✅ Success alert shown
- ✅ AI features unlocked
- ✅ Paywall gone

### Step 6: Verify Persistence
1. Close the app completely (swipe up from app switcher)
2. Wait 5 seconds
3. Reopen the app
4. Navigate to Profile

**Expected**: 
- ✅ Premium status still active
- ✅ No need to log in again
- ✅ AI features still unlocked

## Pass/Fail Criteria

### ✅ PASS if ALL of the following are true:

1. ✅ Browser shows styled success page (not blank/error)
2. ✅ App opens automatically (or manual button works)
3. ✅ Lands on Profile screen
4. ✅ Premium badge appears immediately
5. ✅ Success alert is shown
6. ✅ AI features are unlocked
7. ✅ Paywall is gone
8. ✅ Premium persists after app restart

### ❌ FAIL if ANY of the following occur:

1. ❌ User stuck in browser after payment
2. ❌ Blank or error page shown
3. ❌ App doesn't open (even with manual button)
4. ❌ Premium not showing in app
5. ❌ AI features still locked
6. ❌ Paywall still appears
7. ❌ Premium lost after app restart

## Troubleshooting

### Issue: Stuck in browser
**Symptoms**: Browser shows blank page or doesn't redirect
**Cause**: Old Edge Functions deployed
**Fix**: Redeploy `checkout-redirect` and `create-checkout-session`

### Issue: Premium not activated
**Symptoms**: App opens but shows "Free" status
**Cause**: Database not updated or app not refreshing
**Fix**: 
1. Check Supabase logs for errors
2. Check database tables
3. Force close and reopen app

### Issue: Manual button doesn't work
**Symptoms**: Tapping button does nothing
**Cause**: Deep link scheme not configured
**Fix**: Verify `app.json` has `scheme: "macrogoal"`

## Test Results

**Date**: _________________

**Tester**: _________________

**Device**: _________________

**OS Version**: _________________

### Results:

- [ ] Step 1: Start Checkout - PASS / FAIL
- [ ] Step 2: Select Plan - PASS / FAIL
- [ ] Step 3: Complete Payment - PASS / FAIL
- [ ] Step 4: Verify Redirect - PASS / FAIL
- [ ] Step 5: Verify Premium Activation - PASS / FAIL
- [ ] Step 6: Verify Persistence - PASS / FAIL

### Overall Result:

- [ ] ✅ PASS - All steps completed successfully
- [ ] ❌ FAIL - One or more steps failed

### Notes:

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

## Sign-off

**Tester Signature**: _________________

**Date**: _________________

---

## Additional Tests (Optional)

### Test Cancellation Flow
1. Start checkout
2. Tap "Cancel" in browser
3. Verify app opens and shows paywall

### Test Failed Payment
1. Use declined card: `4000 0000 0000 0002`
2. Verify error message shown
3. Verify can retry with different card

### Test Webhook Backup
1. Complete payment
2. Close browser immediately (before redirect)
3. Wait 10 seconds
4. Open app manually
5. Verify premium still activates

---

**This test must PASS before deploying to production!**
