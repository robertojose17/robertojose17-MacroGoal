
# 🚀 Quick Start: Test Your Subscription in 5 Minutes

## ⚡ Fastest Way to Test

### Step 1: Set Environment Variables (2 minutes)

1. **Get your Stripe Price IDs:**
   - Go to: https://dashboard.stripe.com/test/products
   - Click on your product → Copy the **Price ID** (starts with `price_`)
   - Do this for both Monthly and Yearly

2. **Create `.env` file in project root:**
   ```bash
   EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_1234567890abcdef
   EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_0987654321fedcba
   ```

3. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

### Step 2: Set Supabase Secrets (2 minutes)

Run these commands (replace with your actual values):

```bash
# Get these from Stripe Dashboard → API Keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Get this from Stripe Dashboard → Webhooks → Your endpoint → Signing secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# These are already known
supabase secrets set SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
supabase secrets set APP_URL=myapp://
```

---

### Step 3: Configure Stripe Webhook (1 minute)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the signing secret and update Supabase secret (if not done in Step 2)

---

### Step 4: Test! (1 minute)

1. **Open paywall in your app:**
   ```typescript
   router.push('/paywall');
   ```

2. **Select a plan and tap "Start Premium"**

3. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`

4. **Complete payment**

5. **Verify it worked:**
   ```typescript
   const { isSubscribed } = useSubscription();
   console.log('Premium:', isSubscribed); // Should be true
   ```

---

## ✅ Quick Verification

Run this in your app to verify setup:

```typescript
import { verifySubscriptionSetup, printVerificationResults } from '@/utils/subscriptionVerification';

async function quickCheck() {
  const results = await verifySubscriptionSetup();
  printVerificationResults(results);
}

// Call this when app starts
quickCheck();
```

---

## 🐛 Quick Troubleshooting

### Issue: "Checkout doesn't open"
**Fix:** Check console for errors. Verify `.env` file exists and has correct price IDs.

### Issue: "Payment succeeds but user not upgraded"
**Fix:** Check webhook logs:
```bash
supabase functions logs stripe-webhook
```

### Issue: "Invalid price ID"
**Fix:** Ensure you're using **Price IDs** (start with `price_`), NOT Product IDs (start with `prod_`)

---

## 📚 Need More Details?

See **SUBSCRIPTION_COMPLETE_SETUP_GUIDE.md** for comprehensive instructions.

---

## 🎉 That's It!

If all steps worked, your subscription system is ready to use!

**What's Working:**
- ✅ Users can subscribe via Stripe Checkout
- ✅ Webhooks update user to premium automatically
- ✅ App reflects premium status immediately
- ✅ Subscription management works end-to-end

**Next:** Switch to production mode when ready (see SUBSCRIPTION_FINAL_CHECKLIST.md)
