
# 🧪 Stripe iOS Redirect - Testing Guide

## Quick Test (5 minutes)

### Prerequisites
- App running on iOS device or simulator
- Stripe test mode enabled
- Test card: `4242 4242 4242 4242`

### Test Steps

1. **Open the app** and log in
2. **Navigate to Profile** → Click "Upgrade to Premium"
3. **Select Monthly plan** → Click "Subscribe Now"
4. **In Stripe Checkout:**
   - Email: test@example.com
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
5. **Click "Subscribe"**
6. **Wait for redirect** (should happen automatically)

### Expected Results

✅ **Immediate (0-2 seconds):**
- Safari/WebView closes
- App opens automatically
- You see the Profile screen
- Alert appears: "✅ Payment Successful!"

✅ **Within 5-10 seconds:**
- Another alert: "🎉 Welcome to Premium!"
- Profile screen shows "Premium" badge
- AI Meal Estimator unlocks

✅ **In logs:**
```
[DeepLink] ✅ Checkout success detected!
[DeepLink] 🔄 Sync attempt 1/15
[DeepLink] ✅ Sync attempt 1 succeeded
[DeepLink] 🎉 Premium status confirmed!
```

### What to Check

#### 1. Redirect Behavior
- [ ] Safari/WebView closes automatically (no manual close needed)
- [ ] App opens via deep link
- [ ] Navigates to correct screen (Profile)
- [ ] No "stuck" screens or loading states

#### 2. Premium Activation
- [ ] Success alert appears
- [ ] Premium badge shows in profile
- [ ] AI features unlock
- [ ] Happens within 10 seconds

#### 3. Database Updates
```sql
-- Check subscription status
SELECT status, plan_type FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
-- Should show: status = 'active', plan_type = 'monthly'

-- Check user type
SELECT user_type FROM users WHERE id = 'YOUR_USER_ID';
-- Should show: user_type = 'premium'
```

## Test Cancellation Flow

1. **Navigate to paywall**
2. **Click "Subscribe Now"**
3. **In Stripe Checkout, click the back/close button**
4. **Expected:**
   - ✅ Safari/WebView closes
   - ✅ App opens and shows paywall
   - ✅ Alert: "Checkout Cancelled"
   - ✅ User remains on free plan

## Test Error Handling

### Scenario 1: Network Error During Sync

1. **Turn off WiFi/cellular** after payment completes
2. **Expected:**
   - ✅ App still redirects back
   - ✅ Shows "Almost There!" alert
   - ✅ Retries when network returns
   - ✅ Premium activates once network is back

### Scenario 2: Webhook Delay

1. **Complete payment**
2. **If webhook is slow (>10 seconds):**
   - ✅ App shows "Almost There!" alert
   - ✅ Continues retrying in background
   - ✅ Premium activates once webhook completes

## Verify Edge Functions

### Check Deployment Status

```bash
# In Supabase Dashboard → Edge Functions
# Verify all functions are deployed and active:
- create-checkout-session (verify_jwt: true)
- stripe-webhook (verify_jwt: false) ⚠️ CRITICAL
- sync-subscription (verify_jwt: true)
- create-portal-session (verify_jwt: true)
```

### Check Logs

#### create-checkout-session
```
[Checkout] ✅ Session created successfully!
[Checkout] 🎯 After payment, user will be redirected DIRECTLY to app!
```

#### stripe-webhook
```
[Webhook] ✅ Checkout completed: cs_test_...
[Webhook] ✅ User type updated to: premium
```

#### sync-subscription
```
[Sync] ✅ Subscription synced
[Sync] ✅ User type updated to: premium
```

## Troubleshooting

### Issue: App doesn't open after payment

**Check:**
1. URL scheme in `app.json`: `"scheme": "macrogoal"`
2. Deep link handler in `app/_layout.tsx` is active
3. iOS Info.plist includes URL scheme (rebuild app if changed)

**Fix:**
```bash
# Rebuild the app
npx expo prebuild --clean
npx expo run:ios
```

### Issue: Premium status doesn't update

**Check:**
1. Webhook logs in Stripe Dashboard
2. Edge Function logs in Supabase Dashboard
3. App logs for sync errors

**Manual Fix:**
```typescript
// In app, call manually:
const { syncSubscription } = useSubscription();
await syncSubscription();
```

### Issue: Webhook not firing

**Check:**
1. Webhook endpoint in Stripe Dashboard
2. Webhook secret in Supabase secrets
3. Webhook events are enabled

**Verify:**
```
Endpoint: https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
Events: checkout.session.completed, customer.subscription.*
Status: Active
```

## Performance Benchmarks

### Target Metrics
- **Redirect time:** <2 seconds
- **Premium activation:** <10 seconds
- **Success rate:** >99%

### Measure Performance

```typescript
// Add to deep link handler
const startTime = Date.now();

// After premium confirmed
const endTime = Date.now();
console.log(`Premium activation took ${endTime - startTime}ms`);
```

## Test on Real Device

### iOS Device Setup

1. **Install TestFlight** or build locally
2. **Enable test mode** in Stripe
3. **Use test card:** 4242 4242 4242 4242
4. **Test on cellular** (not just WiFi)
5. **Test with low signal** (airplane mode on/off)

### Android Device Setup

1. **Build APK** or use development build
2. **Verify intent filters** in AndroidManifest.xml
3. **Test deep link handling**
4. **Test on different Android versions**

## Automated Testing (Optional)

### Test Script

```typescript
// test-stripe-flow.ts
import { test, expect } from '@playwright/test';

test('Stripe checkout flow', async ({ page }) => {
  // Navigate to paywall
  await page.goto('macrogoal://paywall');
  
  // Click subscribe
  await page.click('text=Subscribe Now');
  
  // Fill Stripe form
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="cardExpiry"]', '12/25');
  await page.fill('[name="cardCvc"]', '123');
  await page.fill('[name="billingPostalCode"]', '12345');
  
  // Submit
  await page.click('text=Subscribe');
  
  // Wait for redirect
  await page.waitForURL('macrogoal://profile*');
  
  // Verify premium status
  await expect(page.locator('text=Premium')).toBeVisible();
});
```

## Success Criteria

✅ **All tests pass:**
- [ ] Successful payment redirects correctly
- [ ] Cancelled payment redirects correctly
- [ ] Premium status updates within 10 seconds
- [ ] No manual intervention needed
- [ ] Works on both WiFi and cellular
- [ ] Works on iOS and Android

✅ **Logs are clean:**
- [ ] No errors in Edge Function logs
- [ ] No errors in app logs
- [ ] Webhook delivery succeeds in Stripe Dashboard

✅ **User experience is smooth:**
- [ ] No stuck screens
- [ ] Clear feedback at each step
- [ ] Premium features unlock immediately
- [ ] No confusion about subscription status

## Ready for Production?

Before switching to production Stripe keys:

- [ ] All tests pass in test mode
- [ ] Tested on real iOS devices
- [ ] Tested on real Android devices
- [ ] Tested with poor network conditions
- [ ] Webhook delivery is reliable (>99%)
- [ ] Edge Function logs are clean
- [ ] Database updates are consistent
- [ ] User feedback is positive

---

**Status:** ✅ READY FOR TESTING

**Test Duration:** ~5 minutes per test

**Recommended Tests:** 3-5 successful payments + 1-2 cancellations
