
# RevenueCat + Supabase Integration Setup Guide

This guide explains how to connect RevenueCat with Supabase to sync in-app purchase data to your database.

## 🎯 What This Integration Does

- **Syncs subscription status** from RevenueCat to Supabase in real-time
- **Stores purchase events** for audit trail and analytics
- **Enables server-side subscription checks** (not just client-side)
- **Handles all subscription lifecycle events** (purchase, renewal, cancellation, expiration, etc.)

## 📋 Prerequisites

Before starting, ensure you have:

1. ✅ RevenueCat account with API key configured in `config/revenueCatConfig.ts`
2. ✅ Products created in App Store Connect
3. ✅ Products linked to RevenueCat in the dashboard
4. ✅ Supabase project set up
5. ✅ App successfully making test purchases (even if they show "Product Not Found" - that's expected in sandbox)

## 🚀 Step-by-Step Setup

### Step 1: Apply Database Migration

The migration creates two tables:
- `revenuecat_events` - Stores all webhook events for audit trail
- Updates `subscriptions` table with RevenueCat-specific fields

**Option A: Using Supabase CLI (Recommended)**
```bash
# If you have Supabase CLI installed
supabase db push
```

**Option B: Manual SQL Execution**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20250131000000_create_revenuecat_integration.sql`
3. Paste and run the SQL

**Option C: Using the apply_migration tool**
The migration file has been created at `supabase/migrations/20250131000000_create_revenuecat_integration.sql`. You can apply it using the Supabase dashboard or CLI.

### Step 2: Deploy the Webhook Edge Function

**Option A: Using Supabase CLI**
```bash
supabase functions deploy revenuecat-webhook
```

**Option B: Manual Deployment via Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Create new function named `revenuecat-webhook`
3. Copy contents of `supabase/functions/revenuecat-webhook/index.ts`
4. Deploy

### Step 3: Get Your Webhook URL

After deploying, your webhook URL will be:
```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
```

### Step 4: Configure RevenueCat Webhook

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your app
3. Navigate to **Integrations** → **Webhooks**
4. Click **+ New**
5. Configure:
   - **URL**: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization Header**: `Bearer YOUR_SUPABASE_ANON_KEY`
     - Get your anon key from Supabase Dashboard → Settings → API
   - **Events to Send**: Select all (recommended) or at minimum:
     - ✅ INITIAL_PURCHASE
     - ✅ RENEWAL
     - ✅ CANCELLATION
     - ✅ EXPIRATION
     - ✅ BILLING_ISSUE
     - ✅ PRODUCT_CHANGE
6. Click **Add Webhook**

### Step 5: Test the Webhook

**Option A: Test Purchase (Recommended)**
1. Make a test purchase in your app (sandbox environment)
2. Check Supabase Dashboard → Table Editor → `revenuecat_events`
3. You should see a new event with type `INITIAL_PURCHASE`
4. Check `subscriptions` table - your user's subscription should be updated

**Option B: Manual Test via RevenueCat**
1. In RevenueCat Dashboard → Integrations → Webhooks
2. Click on your webhook
3. Click **Send Test Event**
4. Check Supabase tables for the test event

### Step 6: Verify Integration

Check that everything is working:

1. **Database Tables Created**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM revenuecat_events LIMIT 5;
   SELECT * FROM subscriptions WHERE revenuecat_app_user_id IS NOT NULL;
   ```

2. **Webhook Receiving Events**
   - Go to Supabase Dashboard → Edge Functions → revenuecat-webhook → Logs
   - You should see logs like: `[RevenueCat Webhook] 📨 Received webhook request`

3. **Subscription Status Syncing**
   - Make a test purchase
   - Check `subscriptions` table
   - `status` should be `active`
   - `entitlement_ids` should contain `["Macrogoal Pro"]`

## 📊 Database Schema

### `revenuecat_events` Table
Stores all webhook events for audit trail:
- `id` - UUID primary key
- `event_type` - Type of event (INITIAL_PURCHASE, RENEWAL, etc.)
- `app_user_id` - RevenueCat user ID (matches Supabase user_id)
- `product_id` - Product identifier
- `entitlement_ids` - Array of entitlement IDs
- `purchased_at` - Purchase timestamp
- `expiration_at` - Expiration timestamp
- `store` - Store (APP_STORE, PLAY_STORE)
- `environment` - Environment (SANDBOX, PRODUCTION)
- `raw_event` - Full webhook payload (JSONB)

### `subscriptions` Table (Updated)
New RevenueCat fields:
- `revenuecat_app_user_id` - RevenueCat user ID
- `entitlement_ids` - Active entitlements
- `store` - Purchase store
- `product_id` - Current product
- `period_type` - Subscription period (NORMAL, TRIAL, INTRO)
- `purchased_at` - Purchase date
- `expiration_at` - Expiration date
- `will_renew` - Auto-renew status
- `unsubscribe_detected_at` - Cancellation date
- `billing_issues_detected_at` - Billing issue date

## 🔍 Debugging

### Check Webhook Logs
```bash
# Using Supabase CLI
supabase functions logs revenuecat-webhook
```

Or in Dashboard: Edge Functions → revenuecat-webhook → Logs

### Common Issues

**1. Webhook not receiving events**
- ✅ Check webhook URL is correct
- ✅ Verify Authorization header has correct anon key
- ✅ Check RevenueCat webhook status (should be green)
- ✅ Test with "Send Test Event" in RevenueCat

**2. Events stored but subscription not updating**
- ✅ Check Edge Function logs for errors
- ✅ Verify `user_id` in subscriptions table matches RevenueCat `app_user_id`
- ✅ Check RLS policies on subscriptions table

**3. "Product Not Found" errors**
- ℹ️ This is normal in sandbox until products are fully configured in App Store Connect
- ℹ️ Webhook integration works independently of product availability
- ℹ️ Once products are live, purchases will sync correctly

## 🎉 Success Indicators

You'll know the integration is working when:

1. ✅ Test purchases appear in `revenuecat_events` table
2. ✅ `subscriptions` table updates with `status: 'active'`
3. ✅ `entitlement_ids` contains your entitlement name
4. ✅ Edge Function logs show successful processing
5. ✅ RevenueCat webhook shows green status

## 📱 Using Subscription Status in Your App

Now that subscriptions sync to Supabase, you can:

**Client-side (Current approach - already working)**
```typescript
import { useRevenueCat } from '@/hooks/useRevenueCat';

function MyComponent() {
  const { isPro, isLoading } = useRevenueCat();
  
  if (isPro) {
    // Show premium features
  }
}
```

**Server-side (New capability)**
```typescript
// In any Edge Function or API route
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single();

if (subscription?.status === 'active') {
  // User has active subscription
}
```

## 🔐 Security Notes

- ✅ Webhook uses service role key (bypasses RLS) - this is correct
- ✅ RLS policies prevent users from modifying webhook data
- ✅ Users can only read their own events
- ✅ Authorization header prevents unauthorized webhook calls

## 📚 Additional Resources

- [RevenueCat Webhooks Documentation](https://www.revenuecat.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [RevenueCat Event Types](https://www.revenuecat.com/docs/webhooks#event-types)

## ❓ Need Help?

If you encounter issues:
1. Check Edge Function logs
2. Verify webhook configuration in RevenueCat
3. Test with "Send Test Event" in RevenueCat Dashboard
4. Check `revenuecat_events` table for raw event data
