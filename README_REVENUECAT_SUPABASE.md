
# RevenueCat + Supabase Integration

## Overview

This integration connects RevenueCat (in-app purchase management) with Supabase (database) to automatically sync subscription status and purchase events.

## What Was Created

### 1. Database Migration
**File**: `supabase/migrations/20250131000000_create_revenuecat_integration.sql`

Creates:
- `revenuecat_events` table - Audit trail of all webhook events
- Updates `subscriptions` table with RevenueCat fields
- RLS policies for security
- Indexes for performance

### 2. Webhook Handler
**File**: `supabase/functions/revenuecat-webhook/index.ts`

Handles:
- Receiving webhook events from RevenueCat
- Storing events in database
- Updating subscription status
- All subscription lifecycle events

### 3. Diagnostics Screen
**File**: `app/revenuecat-diagnostics.tsx`

Provides:
- Real-time integration status
- Database verification
- Event monitoring
- Troubleshooting info

Access via: Profile → RevenueCat Diagnostics (bottom of page)

## Quick Setup

### Step 1: Apply Migration
Go to Supabase Dashboard → SQL Editor → Run the SQL from:
`supabase/migrations/20250131000000_create_revenuecat_integration.sql`

### Step 2: Deploy Edge Function
Go to Supabase Dashboard → Edge Functions → Create new function:
- Name: `revenuecat-webhook`
- Code: Copy from `supabase/functions/revenuecat-webhook/index.ts`

### Step 3: Configure Webhook
Go to RevenueCat Dashboard → Integrations → Webhooks → Add:
- URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
- Authorization: `Bearer YOUR_SUPABASE_ANON_KEY`
- Events: Select all

### Step 4: Test
1. Make a test purchase
2. Open app → Profile → RevenueCat Diagnostics
3. Verify all checks pass
4. Check `revenuecat_events` table in Supabase

## Documentation

- **English (Detailed)**: `docs/REVENUECAT_SUPABASE_SETUP.md`
- **English (Summary)**: `docs/REVENUECAT_INTEGRATION_SUMMARY.md`
- **Español (Guía Rápida)**: `docs/REVENUECAT_SUPABASE_GUIA_RAPIDA.md`

## How It Works

```
User Purchase → RevenueCat → Webhook → Supabase Edge Function → Database
```

1. User makes in-app purchase
2. RevenueCat processes payment
3. RevenueCat sends webhook event
4. Edge Function receives event
5. Event stored in `revenuecat_events`
6. Subscription updated in `subscriptions`

## Benefits

- ✅ Real-time subscription sync
- ✅ Complete audit trail
- ✅ Server-side verification
- ✅ Automatic retries
- ✅ Cross-platform support

## Troubleshooting

### Webhook not receiving events
- Check URL is correct
- Verify Authorization header
- Test with "Send Test Event" in RevenueCat

### Events stored but subscription not updating
- Check Edge Function logs
- Verify user_id matches
- Check RLS policies

### "Product Not Found" errors
- Normal in sandbox environment
- Webhook works independently
- Will sync correctly once products are configured

## Support

For issues:
1. Check Edge Function logs in Supabase
2. Verify webhook configuration in RevenueCat
3. Use diagnostics screen in app
4. Check `revenuecat_events` table for raw data
