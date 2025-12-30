
# 🚀 Quick Reference: Direct Deep Links

## What Changed?

**Before:** Stripe → Redirect Page → Deep Link → App
**After:** Stripe → Deep Link → App ✨

## Key URLs

### Success
```
macrogoal://profile?subscription_success=true
```

### Cancel
```
macrogoal://paywall?subscription_cancelled=true
```

### Error
```
macrogoal://profile?subscription_error=true
```

## Edge Function

**File:** `supabase/functions/create-checkout-session/index.ts`

**Key Lines:**
```typescript
const successUrl = "macrogoal://profile?subscription_success=true";
const cancelUrl = "macrogoal://paywall?subscription_cancelled=true";
```

**Status:** ✅ Deployed (v21)

## Premium Activation

### Webhook (Primary)
- Handles: `checkout.session.completed`
- Updates: `subscriptions` table
- Updates: `users.user_type = 'premium'`
- Ensures: `user_stripe_customers` mapping

### App Sync (Secondary)
- Triggered: On deep link open
- Calls: `sync-subscription` Edge Function
- Retries: 5 times, 2-second delays
- Shows: Success alert

## Testing

### Test Card
```
Card: 4242 4242 4242 4242
Exp:  12/34
CVC:  123
ZIP:  12345
```

### Expected Flow
1. Complete checkout
2. Safari closes (< 1 sec)
3. App opens (< 1 sec)
4. Profile screen loads
5. Premium badge appears (< 3 sec)
6. Success alert shows

### Verify
```sql
-- Check subscription
SELECT status FROM subscriptions WHERE user_id = '<id>';
-- Should be: 'active'

-- Check user type
SELECT user_type FROM users WHERE id = '<id>';
-- Should be: 'premium'
```

## Logs to Check

### create-checkout-session
```
[Checkout] 🔗 Redirect URLs (DIRECT DEEP LINKS)
[Checkout] ✅ NO INTERMEDIATE REDIRECT PAGE
```

### stripe-webhook
```
[Webhook] ✅ Checkout completed
[Webhook] ✅ User type updated to: premium
```

### App
```
[DeepLink] ✅ Checkout success detected!
[useSubscription] ✅ Subscription synced
```

## Troubleshooting

### HTML Page Shows
- ❌ Should NOT happen
- Check Edge Function logs
- Verify deep link URLs
- Redeploy if needed

### App Doesn't Open
- Check app scheme: `macrogoal://`
- Verify deep link handling
- Test manually in Safari
- Rebuild app if needed

### Premium Not Active
- Check webhook logs
- Verify database updates
- Try manual sync
- Check RLS policies

## Quick Commands

### Check Logs
```bash
# Supabase Dashboard
Edge Functions > create-checkout-session > Logs
Edge Functions > stripe-webhook > Logs
```

### Check Database
```sql
SELECT * FROM subscriptions WHERE user_id = '<id>';
SELECT user_type FROM users WHERE id = '<id>';
```

### Test Deep Link
```
# In Safari on device
macrogoal://profile?subscription_success=true
```

## Success Criteria

✅ No HTML page visible
✅ Safari closes automatically
✅ App opens immediately
✅ Lands on Profile screen
✅ Premium badge appears
✅ Success alert shows
✅ Premium features unlock

## Files

### Modified
- `supabase/functions/create-checkout-session/index.ts`

### Documentation
- `STRIPE_DIRECT_DEEP_LINK_FIX_COMPLETE.md`
- `STRIPE_DIRECT_DEEP_LINK_TESTING.md`
- `IMPLEMENTATION_SUMMARY_DIRECT_DEEP_LINKS.md`
- `QUICK_REFERENCE_DIRECT_DEEP_LINKS.md` (this file)

### No Longer Used
- `supabase/functions/checkout-redirect/index.ts`

## Rollback

If needed, change back to:
```typescript
const successUrl = `${CORRECT_PROJECT_URL}/functions/v1/checkout-redirect?success=true&session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${CORRECT_PROJECT_URL}/functions/v1/checkout-redirect?cancelled=true`;
```

Then redeploy.

## Status

🎯 **READY TO TEST**
📅 **Deployed:** 2024-12-29
✅ **Version:** v21

---

**Need Help?**
- Check logs first
- Review testing guide
- Verify database updates
- Test with test cards
