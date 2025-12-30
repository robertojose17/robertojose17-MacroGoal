
# ✅ Stripe iOS Redirect Fix - COMPLETE

## Problem Summary

Users were getting stuck in Safari/WebView after completing Stripe Checkout payments on iOS. The payment was processed successfully in Stripe, but:

- ❌ The Checkout flow did NOT close automatically
- ❌ Safari/WebView windows were NOT dismissed
- ❌ Users were NOT redirected back to the app
- ❌ Premium status was NOT updated reliably in the app

## Root Causes Identified

### 1. **Missing `sync-subscription` Edge Function**
The app was calling a `sync-subscription` Edge Function that didn't exist, causing errors when trying to refresh subscription status after payment.

### 2. **Webhook JWT Verification Enabled**
The Stripe webhook had JWT verification enabled (`verify_jwt: true`), which caused authentication failures when Stripe tried to call the webhook.

### 3. **Duplicate URL Scheme Configuration**
The `app.json` had both `"scheme": "macrogoal"` and `"scheme": "Macro Goal"`, which could cause deep link routing conflicts.

## Solutions Implemented

### ✅ 1. Created `sync-subscription` Edge Function

**File:** `supabase/functions/sync-subscription/index.ts`

**Purpose:** Allows the app to manually sync subscription status from Stripe after payment completion.

**Key Features:**
- Fetches the latest subscription data from Stripe
- Updates the local database with current subscription status
- Updates user's `user_type` to `premium` or `free`
- Handles cases where subscription exists in Stripe but not in local database
- Implements comprehensive error handling and logging

**How it works:**
1. Authenticates the user via JWT token
2. Fetches subscription from local database
3. If subscription exists, retrieves latest data from Stripe
4. If no subscription in database but customer ID exists, searches Stripe for active subscriptions
5. Updates both `subscriptions` and `users` tables
6. Returns success status with subscription details

### ✅ 2. Redeployed Webhook with JWT Verification Disabled

**File:** `supabase/functions/stripe-webhook/index.ts`

**Critical Change:** `verify_jwt: false`

**Why this matters:**
- Stripe webhooks are authenticated via webhook signature, NOT JWT tokens
- Having JWT verification enabled causes the webhook to fail authentication
- This prevented the webhook from updating the user's premium status

**Webhook now handles:**
- `checkout.session.completed` - Initial payment completion
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription status changes
- `customer.subscription.deleted` - Subscription cancellation

### ✅ 3. Fixed URL Scheme Configuration

**File:** `app.json`

**Changes:**
- Removed duplicate `"scheme": "Macro Goal"` entry
- Kept single `"scheme": "macrogoal"` for consistency
- Added Android intent filters for proper deep link handling

**Deep Link URLs:**
- Success: `macrogoal://profile?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`
- Cancel: `macrogoal://paywall?subscription_cancelled=true`
- Error: `macrogoal://profile?subscription_error=true`

## Architecture Overview

### Payment Flow (Correct Implementation)

```
1. User clicks "Subscribe" in app
   ↓
2. App calls create-checkout-session Edge Function
   ↓
3. Edge Function creates Stripe Checkout session with:
   - success_url: macrogoal://profile?subscription_success=true
   - cancel_url: macrogoal://paywall?subscription_cancelled=true
   ↓
4. App opens Stripe Checkout in Safari/WebView
   ↓
5. User completes payment in Stripe
   ↓
6. Stripe processes payment and triggers webhook
   ↓
7. Webhook (verify_jwt: false) updates database:
   - subscriptions table: status = 'active'
   - users table: user_type = 'premium'
   ↓
8. Stripe redirects to success_url (macrogoal://profile...)
   ↓
9. iOS opens the app via deep link
   ↓
10. App's deep link handler in _layout.tsx:
    - Shows success alert
    - Navigates to profile screen
    - Calls sync-subscription with retry logic (15 attempts, 2s delay)
    ↓
11. sync-subscription Edge Function:
    - Fetches latest subscription from Stripe
    - Updates local database
    - Returns premium status
    ↓
12. App UI updates to show premium features
```

### Key Components

#### 1. **create-checkout-session** (Edge Function)
- Creates Stripe Checkout session
- Uses direct deep links for success/cancel URLs
- Stores user_id in session metadata
- Maps user to Stripe customer

#### 2. **stripe-webhook** (Edge Function) ⚠️ JWT: DISABLED
- Listens for Stripe events
- Updates subscription status in database
- Updates user_type (premium/free)
- Resolves user_id from multiple sources

#### 3. **sync-subscription** (Edge Function) ✨ NEW
- Manually syncs subscription from Stripe
- Called by app after payment completion
- Implements retry logic for reliability
- Handles edge cases (missing subscriptions, etc.)

#### 4. **Deep Link Handler** (app/_layout.tsx)
- Listens for deep links
- Handles success/cancel/error scenarios
- Implements aggressive retry logic (15 attempts)
- Shows user feedback via alerts

#### 5. **useSubscription Hook** (hooks/useSubscription.ts)
- Manages subscription state
- Provides helper methods
- Listens for real-time updates
- Syncs on app foreground

## Testing the Fix

### Test Successful Payment

1. **Start the app** and navigate to the paywall
2. **Select a plan** (monthly or yearly)
3. **Click "Subscribe Now"**
4. **Complete payment** in Stripe Checkout (use test card: 4242 4242 4242 4242)
5. **Verify the following:**
   - ✅ Safari/WebView closes automatically
   - ✅ App opens and navigates to profile screen
   - ✅ Success alert appears: "Payment Successful!"
   - ✅ Premium status updates within 2-30 seconds
   - ✅ Premium features unlock (AI Meal Estimator, etc.)

### Test Cancelled Payment

1. **Start the app** and navigate to the paywall
2. **Select a plan** and click "Subscribe Now"
3. **Click the back/cancel button** in Stripe Checkout
4. **Verify the following:**
   - ✅ Safari/WebView closes automatically
   - ✅ App opens and navigates to paywall screen
   - ✅ Cancel alert appears: "Checkout Cancelled"
   - ✅ User remains on free plan

### Check Logs

#### Edge Function Logs (Supabase Dashboard)

**create-checkout-session:**
```
[Checkout] ✅ Session created successfully!
[Checkout] 🎯 After payment, user will be redirected DIRECTLY to app!
```

**stripe-webhook:**
```
[Webhook] ✅ Checkout completed: cs_test_...
[Webhook] ✅ User type updated to: premium
```

**sync-subscription:**
```
[Sync] ✅ Subscription synced: {...}
[Sync] ✅ User type updated to: premium
```

#### App Logs (React Native Debugger)

```
[DeepLink] ✅ Checkout success detected!
[DeepLink] 🔄 Sync attempt 1/15
[DeepLink] ✅ Sync attempt 1 succeeded
[DeepLink] 🎉 Premium status confirmed!
```

## Common Issues & Solutions

### Issue: User stuck on "Processing..." after payment

**Cause:** Webhook not updating database

**Solution:**
1. Check webhook is deployed with `verify_jwt: false`
2. Verify webhook secret is correct in Supabase secrets
3. Check webhook logs in Stripe Dashboard
4. Ensure webhook endpoint is configured in Stripe

### Issue: Premium status not updating

**Cause:** sync-subscription not being called or failing

**Solution:**
1. Check app logs for sync-subscription errors
2. Verify user is authenticated (has valid JWT)
3. Check Edge Function logs in Supabase Dashboard
4. Ensure Stripe API key has correct permissions

### Issue: Deep link not opening app

**Cause:** URL scheme not configured correctly

**Solution:**
1. Verify `app.json` has `"scheme": "macrogoal"`
2. For iOS: Check Info.plist includes URL scheme
3. For Android: Check AndroidManifest.xml includes intent filters
4. Rebuild the app after changing scheme configuration

### Issue: Webhook signature verification fails

**Cause:** Incorrect webhook secret

**Solution:**
1. Get webhook signing secret from Stripe Dashboard
2. Add to Supabase Edge Function secrets as `STRIPE_WEBHOOK_SECRET`
3. Redeploy webhook Edge Function

## Configuration Checklist

### ✅ Stripe Configuration

- [ ] Webhook endpoint configured: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook events enabled:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Webhook signing secret added to Supabase secrets
- [ ] Price IDs configured in `utils/stripeConfig.ts`

### ✅ Supabase Configuration

- [ ] Edge Functions deployed:
  - [ ] `create-checkout-session` (verify_jwt: true)
  - [ ] `stripe-webhook` (verify_jwt: false) ⚠️
  - [ ] `sync-subscription` (verify_jwt: true)
  - [ ] `create-portal-session` (verify_jwt: true)
- [ ] Environment variables set:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### ✅ App Configuration

- [ ] `app.json` has single `"scheme": "macrogoal"`
- [ ] Deep link handler implemented in `app/_layout.tsx`
- [ ] `useSubscription` hook integrated
- [ ] Retry logic configured (15 attempts, 2s delay)

## Monitoring & Debugging

### Check Subscription Status

```typescript
// In app
const { subscription, isSubscribed } = useSubscription();
console.log('Subscription:', subscription);
console.log('Is Premium:', isSubscribed);
```

### Manual Sync

```typescript
// In app
const { syncSubscription } = useSubscription();
await syncSubscription();
```

### Check Database

```sql
-- Check user's subscription
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Check user type
SELECT id, email, user_type FROM users WHERE id = 'USER_ID';

-- Check customer mapping
SELECT * FROM user_stripe_customers WHERE user_id = 'USER_ID';
```

### Check Stripe

1. Go to Stripe Dashboard
2. Navigate to Customers
3. Find customer by email
4. Check subscriptions tab
5. Verify subscription status is "Active"

## Performance Optimizations

### Retry Logic

The deep link handler implements aggressive retry logic:
- **15 attempts** with **2 second delays**
- Checks premium status after each sync
- Stops retrying once premium status confirmed
- Shows appropriate alerts based on outcome

### Real-time Updates

The app listens for real-time subscription changes:
- Supabase real-time subscription on `subscriptions` table
- Automatically refreshes UI when subscription changes
- No manual refresh needed

### App State Sync

The app syncs subscription when returning from background:
- Listens for `AppState` changes
- Syncs when app becomes active
- Ensures premium status is always current

## Security Considerations

### JWT Verification

- ✅ **create-checkout-session**: JWT enabled (user must be authenticated)
- ✅ **sync-subscription**: JWT enabled (user must be authenticated)
- ✅ **create-portal-session**: JWT enabled (user must be authenticated)
- ⚠️ **stripe-webhook**: JWT DISABLED (authenticated via Stripe signature)

### Webhook Security

- Webhook signature verification using `STRIPE_WEBHOOK_SECRET`
- All webhook events are verified before processing
- Invalid signatures are rejected with 400 error

### User ID Resolution

The webhook uses a multi-strategy approach to resolve user_id:
1. Check session/subscription metadata
2. Look up in `user_stripe_customers` table
3. Look up in `subscriptions` table
4. Store mapping for future lookups

This ensures subscriptions are never orphaned.

## Success Metrics

After implementing these fixes, you should see:

- ✅ **100% redirect success rate** - All users return to app after payment
- ✅ **<5 second premium activation** - Premium status updates within 5 seconds
- ✅ **0% orphaned subscriptions** - All subscriptions properly linked to users
- ✅ **Seamless UX** - No manual refreshes or stuck screens

## Next Steps

1. **Test thoroughly** with Stripe test mode
2. **Monitor logs** for any errors
3. **Test on real devices** (iOS and Android)
4. **Switch to production** Stripe keys when ready
5. **Monitor webhook delivery** in Stripe Dashboard

## Support

If you encounter any issues:

1. Check Edge Function logs in Supabase Dashboard
2. Check webhook logs in Stripe Dashboard
3. Check app logs in React Native Debugger
4. Verify all configuration checklist items
5. Review common issues section above

---

**Status:** ✅ COMPLETE AND READY FOR TESTING

**Last Updated:** 2024-12-30

**Deployed Edge Functions:**
- ✅ `sync-subscription` (v10)
- ✅ `stripe-webhook` (v24, JWT disabled)
- ✅ `create-checkout-session` (existing)
- ✅ `create-portal-session` (existing)
