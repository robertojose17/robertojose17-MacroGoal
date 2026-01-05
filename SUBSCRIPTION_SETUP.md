
# 🔐 Stripe Subscription Setup Guide

## 📋 Required Environment Variables

### 1️⃣ Client-Side (.env or app.json)
```bash
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
```

### 2️⃣ Supabase Edge Function Secrets
Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # or sk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_URL=myapp://  # Your app's deep link scheme
```

---

## 🚀 Step-by-Step Setup

### Step 1: Create Stripe Products & Prices
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create two products:
   - **Monthly Premium** → Price: $9.99/month → Copy `price_id`
   - **Yearly Premium** → Price: $59.99/year → Copy `price_id`
3. Add these to your `.env`:
   ```
   EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxxxx
   EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxxxx
   ```

### Step 2: Deploy Supabase Edge Functions
```bash
# Deploy checkout session function
supabase functions deploy create-checkout-session

# Deploy webhook function
supabase functions deploy stripe-webhook
```

### Step 3: Set Edge Function Secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set SUPABASE_URL=https://xxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
supabase secrets set APP_URL=myapp://
```

### Step 4: Configure Stripe Webhook
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://xxxxx.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (`whsec_xxxxx`) and add to Edge Function secrets

### Step 5: Update Database Schema
Ensure your `users` table has these columns:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

---

## ✅ Testing the Flow

### Test Subscription Flow:
1. **Open Paywall**: Navigate to `/paywall` in your app
2. **Select Plan**: Choose Monthly or Yearly
3. **Tap "Start Premium"**: Should open Stripe Checkout in browser
4. **Use Test Card**: `4242 4242 4242 4242`, any future date, any CVC
5. **Complete Payment**: Should redirect back to app
6. **Verify Webhook**: Check Supabase logs for webhook event
7. **Check Profile**: User should now show `user_type: 'premium'`

### Verify Webhook:
```bash
# Check Edge Function logs
supabase functions logs stripe-webhook

# Should see:
# "Webhook event: checkout.session.completed"
# "User upgraded to premium: <user_id>"
```

### Test in App:
```typescript
const { isSubscribed, loading } = useSubscription();

if (isSubscribed) {
  // Show premium features
}
```

---

## 🔄 Switching to Production

1. **Stripe**: Switch to Live mode in dashboard
2. **Create Live Products**: Repeat Step 1 with live prices
3. **Update Secrets**: Replace `sk_test_` with `sk_live_`
4. **Update Webhook**: Create new webhook endpoint for live mode
5. **Update Client**: Use live price IDs in `.env`

---

## 🐛 Troubleshooting

### Checkout doesn't open:
- Check `EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID` is set
- Verify Edge Function is deployed: `supabase functions list`

### Webhook fails (400/500):
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Edge Function logs for errors

### User not upgraded after payment:
- Verify webhook endpoint is receiving events in Stripe dashboard
- Check `users` table has required columns
- Ensure `userId` is passed correctly in checkout session

---

## 📞 Support Checklist

Before asking for help, verify:
- [ ] All environment variables are set
- [ ] Edge Functions are deployed
- [ ] Webhook endpoint is configured in Stripe
- [ ] Database schema includes subscription columns
- [ ] Test card completes checkout successfully
- [ ] Webhook logs show event received
