
# RevenueCat Webhook Testing - User ID Fix

## The Problem

When testing the RevenueCat webhook from the RevenueCat dashboard, you're getting a **400 error** with the message:

```json
{
  "success": false,
  "error": "User not found in database",
  "user_id": "72fa7cba-864e-4d4c-aceb-31cec02e7722",
  "message": "The app_user_id from RevenueCat does not match any user in Supabase auth.users..."
}
```

## Why This Happens

RevenueCat's test events use **fake/dummy user IDs** that don't exist in your Supabase database. The webhook is correctly checking if the user exists before processing the event, and rejecting fake users.

## The Solution

You have **two options** to test the webhook properly:

### Option 1: Use a Real User ID (Recommended) ✅

1. **Open the app and go to Profile**
2. **Tap "Test RevenueCat Webhook"** (only visible in development mode)
3. **Copy your real User ID**
4. **Go to RevenueCat Dashboard** → Integrations → Webhooks
5. **Click "Send Test Event"**
6. **Edit the JSON payload** and replace the `"app_user_id"` value with your real User ID
7. **Send the test event** - it should now return **200 OK** ✅

### Option 2: Make a Real Purchase (Production Testing)

1. **Build the app** for TestFlight (iOS) or Internal Testing (Android)
2. **Make a real sandbox purchase** using a test account
3. **RevenueCat will automatically send a webhook** with the real user ID
4. **Check your Supabase database** to verify the subscription was created

## What the Webhook Does

The webhook is working correctly! It:

1. ✅ **Verifies the user exists** in Supabase `auth.users`
2. ✅ **Logs the event** to `revenuecat_events` table (even for orphan events)
3. ✅ **Updates the subscription** in the `subscriptions` table
4. ✅ **Returns proper error messages** when users don't exist

## Testing Checklist

- [ ] Get your real User ID from the app
- [ ] Copy it to clipboard
- [ ] Go to RevenueCat Dashboard → Webhooks
- [ ] Send test event with your real User ID
- [ ] Verify 200 OK response
- [ ] Check Supabase `revenuecat_events` table for the event
- [ ] Check Supabase `subscriptions` table for the subscription

## Common Mistakes

❌ **Using the default test user ID from RevenueCat** - This will always fail because it's a fake ID

✅ **Using your actual Supabase user ID** - This will work because the user exists in your database

## Need Help?

If you're still having issues:

1. Check the Supabase Edge Function logs: Dashboard → Edge Functions → revenuecat-webhook → Logs
2. Verify your webhook URL is correct: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
3. Verify your Authorization header is set in RevenueCat dashboard
4. Make sure you're using a real user ID from your database

## Next Steps

Once the webhook is working with test events:

1. **Set up App Store Connect** / **Google Play Console** with your products
2. **Configure RevenueCat** with your product IDs (`Monthly_MG`, `Yearly_MG`)
3. **Test with sandbox purchases** on a real device
4. **Monitor the webhook logs** to ensure events are being processed
5. **Verify subscriptions** are being created in Supabase

---

**The webhook is working correctly!** The error you're seeing is expected behavior when using fake user IDs. Use a real user ID from your database to test successfully.
