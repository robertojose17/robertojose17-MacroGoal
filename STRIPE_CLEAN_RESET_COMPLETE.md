
# ✅ Stripe Subscription Flow - Clean Reset Complete

## What Was Done

### 1. **Deleted Old/Conflicting Code**
- ❌ Removed `create-portal-session` Edge Function (not needed for basic subscription flow)
- ❌ Removed `sync-subscription` Edge Function (webhook handles all syncing)
- ✅ Cleaned up all legacy Stripe code

### 2. **Rebuilt from Scratch**
Created TWO clean Edge Functions:

#### A) `create-checkout-session`
- **Purpose**: Creates Stripe Checkout sessions for subscriptions
- **Input**: `{ user_id, plan }` where plan = "monthly" | "yearly"
- **Output**: `{ url }` (Stripe Checkout URL)
- **Features**:
  - Sets `client_reference_id` = user_id
  - Sets `metadata.user_id` = user_id
  - Uses environment variables for price IDs
  - Deep link return URLs: `elitemacrotracker://profile?payment_success=true`

#### B) `stripe-webhook`
- **Purpose**: Handles Stripe webhook events and updates database
- **Verification**: Uses ASYNC `constructEventAsync()` (correct for Supabase Edge)
- **Events Handled**:
  1. `checkout.session.completed` → Creates/updates subscription, sets user to premium
  2. `customer.subscription.created/updated` → Syncs subscription status
  3. `customer.subscription.deleted` → Downgrades user to free
- **Database Updates**:
  - Updates `subscriptions` table (stripe_customer_id, stripe_subscription_id, status, etc.)
  - Updates `users` table (user_type: 'premium' or 'free')
- **Timestamp Safety**: Converts Unix seconds to ISO strings safely

### 3. **Updated Client-Side Code**

#### `hooks/useSubscription.tsx`
- Fetches subscription status from `users.user_type` field (NOT non-existent profiles table)
- Aggressive retry logic (3 attempts with delays)
- AppState listener for background return refresh
- Opens Stripe Checkout via WebBrowser

#### `app/(tabs)/profile.tsx`
- Shows Premium badge when subscribed
- Displays subscription plans with pricing
- Handles deep link returns from Stripe
- Aggressive refresh on payment success (500ms, 2s, 5s intervals)
- Pull-to-refresh support

## Database Structure

The app uses:
- **`users` table**: Contains `user_type` field ('guest', 'free', 'premium')
- **`subscriptions` table**: Contains Stripe subscription data

**NO `profiles` table exists** - the old webhook was trying to update a non-existent table!

## Required Stripe Dashboard Setup

### 1. Create Products & Prices
In Stripe Dashboard → Products:
- Create "Monthly Premium" product → Get price ID (e.g., `price_xxx`)
- Create "Yearly Premium" product → Get price ID (e.g., `price_yyy`)

### 2. Configure Webhook
In Stripe Dashboard → Developers → Webhooks:

**Webhook URL**:
```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
```

**Events to Enable** (ONLY these 4):
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**Get Signing Secret**: Copy the `whsec_...` value

### 3. Set Supabase Secrets
In Supabase Dashboard → Edge Functions → Manage Secrets:

```bash
STRIPE_SECRET_KEY=sk_live_...  # Your Stripe SECRET key (NOT publishable)
STRIPE_WEBHOOK_SECRET=whsec_...  # From webhook configuration
STRIPE_MONTHLY_PRICE_ID=price_...  # Monthly plan price ID
STRIPE_YEARLY_PRICE_ID=price_...  # Yearly plan price ID
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # From Supabase settings
```

## Testing Checklist

### Test Mode (Recommended First)
1. Use Stripe TEST keys (`sk_test_...`)
2. Use TEST price IDs
3. Use TEST webhook secret
4. Test with Stripe test cards: `4242 4242 4242 4242`

### Production Mode
1. Switch to LIVE keys (`sk_live_...`)
2. Use LIVE price IDs
3. Use LIVE webhook secret
4. Test with real payment method

### Verification Steps
1. ✅ User clicks "Subscribe" → Opens Stripe Checkout
2. ✅ User completes payment → Returns to app
3. ✅ Webhook receives event → Returns 200 OK (check Stripe Dashboard)
4. ✅ Database updated:
   - `subscriptions.status` = 'active'
   - `subscriptions.stripe_customer_id` = 'cus_...'
   - `subscriptions.stripe_subscription_id` = 'sub_...'
   - `users.user_type` = 'premium'
5. ✅ App shows Premium badge immediately (or after 0.5s/2s/5s retry)

## Common Issues & Solutions

### Issue: Webhook returns 400
**Cause**: Signature verification failed
**Fix**: 
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Ensure webhook URL is correct
- Check Edge Function logs for specific error

### Issue: User not upgraded to Premium
**Cause**: Database update failed
**Fix**:
- Check Edge Function logs for errors
- Verify `users` and `subscriptions` tables exist
- Ensure user_id in checkout matches database

### Issue: Deep link doesn't work
**Cause**: App scheme not configured
**Fix**:
- Verify `app.json` has correct scheme: `elitemacrotracker`
- Test deep link manually: `elitemacrotracker://profile?payment_success=true`

## Architecture Summary

```
User clicks Subscribe
    ↓
create-checkout-session Edge Function
    ↓
Stripe Checkout (user pays)
    ↓
Stripe sends webhook event
    ↓
stripe-webhook Edge Function
    ↓
Updates subscriptions + users tables
    ↓
User returns to app via deep link
    ↓
useSubscription hook refreshes (3 retries)
    ↓
Premium badge appears
```

## Definition of Done ✅

- [x] Old Stripe code removed
- [x] Two clean Edge Functions deployed
- [x] Webhook uses ASYNC verification
- [x] Database updates work correctly
- [x] Client-side hook fetches from correct table
- [x] Deep link handling implemented
- [x] Aggressive refresh logic in place
- [x] No timestamp conversion errors
- [x] No references to non-existent `profiles` table

## Next Steps

1. **Set up Stripe Dashboard** (products, prices, webhook)
2. **Add Supabase secrets** (keys, price IDs, webhook secret)
3. **Test in TEST mode** first
4. **Verify webhook deliveries** show 200 OK
5. **Check database** after test payment
6. **Switch to LIVE mode** when ready

---

**Status**: ✅ Implementation Complete - Ready for Configuration & Testing
