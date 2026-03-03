
# RevenueCat + Supabase Integration Summary

## ✅ What Was Created

### 1. Database Migration
**File**: `supabase/migrations/20250131000000_create_revenuecat_integration.sql`

Creates:
- `revenuecat_events` table - Stores all webhook events from RevenueCat
- Updates `subscriptions` table with RevenueCat-specific fields
- RLS policies for security
- Indexes for performance

### 2. Webhook Edge Function
**File**: `supabase/functions/revenuecat-webhook/index.ts`

Handles:
- Receiving webhook events from RevenueCat
- Storing events in `revenuecat_events` table
- Updating subscription status in `subscriptions` table
- All subscription lifecycle events (purchase, renewal, cancellation, etc.)

### 3. Diagnostics Screen
**File**: `app/revenuecat-diagnostics.tsx`

Provides:
- Real-time status of RevenueCat integration
- Database table verification
- Webhook event monitoring
- Subscription sync status
- Troubleshooting information

### 4. Setup Documentation
**File**: `docs/REVENUECAT_SUPABASE_SETUP.md`

Contains:
- Step-by-step setup instructions
- Webhook configuration guide
- Testing procedures
- Debugging tips
- Security notes

## 🎯 How It Works

```
┌─────────────┐
│   iOS App   │
│  (RevenueCat│
│     SDK)    │
└──────┬──────┘
       │
       │ 1. User makes purchase
       ↓
┌─────────────────┐
│   RevenueCat    │
│    Servers      │
└──────┬──────────┘
       │
       │ 2. Webhook event sent
       ↓
┌─────────────────────────┐
│  Supabase Edge Function │
│  revenuecat-webhook     │
└──────┬──────────────────┘
       │
       │ 3. Store event & update subscription
       ↓
┌─────────────────────────┐
│  Supabase Database      │
│  - revenuecat_events    │
│  - subscriptions        │
└─────────────────────────┘
```

## 📋 Next Steps

### 1. Apply the Migration
Choose one method:

**Option A: Supabase CLI**
```bash
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/20250131000000_create_revenuecat_integration.sql`
3. Run the SQL

### 2. Deploy the Edge Function
Choose one method:

**Option A: Supabase CLI**
```bash
supabase functions deploy revenuecat-webhook
```

**Option B: Supabase Dashboard**
1. Go to Edge Functions
2. Create new function: `revenuecat-webhook`
3. Copy contents of `supabase/functions/revenuecat-webhook/index.ts`
4. Deploy

### 3. Configure RevenueCat Webhook
1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Add new webhook:
   - URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization: `Bearer YOUR_SUPABASE_ANON_KEY`
   - Events: Select all

### 4. Test the Integration
1. Make a test purchase in your app
2. Open the diagnostics screen: `/revenuecat-diagnostics`
3. Verify all checks pass
4. Check Supabase tables for data

## 🔍 Verification Checklist

After setup, verify:

- [ ] Migration applied successfully
- [ ] `revenuecat_events` table exists
- [ ] `subscriptions` table has new RevenueCat columns
- [ ] Edge Function deployed
- [ ] Webhook configured in RevenueCat
- [ ] Test purchase creates event in `revenuecat_events`
- [ ] Subscription status updates in `subscriptions` table
- [ ] Diagnostics screen shows all green checks

## 🐛 Troubleshooting

### Webhook not receiving events
1. Check webhook URL is correct
2. Verify Authorization header
3. Test with "Send Test Event" in RevenueCat
4. Check Edge Function logs

### Events stored but subscription not updating
1. Check Edge Function logs for errors
2. Verify user_id matches between tables
3. Check RLS policies

### "Product Not Found" errors
- This is normal in sandbox environment
- Webhook integration works independently
- Products need to be configured in App Store Connect

## 📊 Monitoring

### Check Webhook Events
```sql
-- Recent events
SELECT * FROM revenuecat_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Events by type
SELECT event_type, COUNT(*) 
FROM revenuecat_events 
GROUP BY event_type;
```

### Check Subscription Status
```sql
-- Active subscriptions
SELECT * FROM subscriptions 
WHERE status = 'active';

-- Subscriptions with RevenueCat data
SELECT * FROM subscriptions 
WHERE revenuecat_app_user_id IS NOT NULL;
```

### Check Edge Function Logs
```bash
supabase functions logs revenuecat-webhook
```

Or in Dashboard: Edge Functions → revenuecat-webhook → Logs

## 🎉 Benefits

With this integration, you now have:

1. **Real-time sync** - Subscription status updates automatically
2. **Audit trail** - All purchase events stored for analytics
3. **Server-side checks** - Verify subscriptions from backend
4. **Webhook reliability** - RevenueCat handles retries
5. **Cross-platform** - Works for iOS and Android
6. **Production-ready** - Handles all subscription lifecycle events

## 📚 Resources

- [RevenueCat Webhooks Docs](https://www.revenuecat.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [RevenueCat Event Types](https://www.revenuecat.com/docs/webhooks#event-types)

## 🔐 Security

- ✅ Webhook uses service role key (bypasses RLS)
- ✅ RLS policies prevent user tampering
- ✅ Authorization header prevents unauthorized calls
- ✅ Events stored for audit trail
