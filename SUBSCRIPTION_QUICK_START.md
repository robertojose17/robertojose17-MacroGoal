
# 🚀 SUBSCRIPTION SYSTEM - QUICK START

## ⚡ 3-STEP SETUP (5 Minutes)

### STEP 1: Get Your Stripe Price IDs

1. Go to: https://dashboard.stripe.com/test/products
2. Click your product → Copy **Price IDs** (NOT Product IDs!)
   - Monthly: `price_...`
   - Yearly: `price_...`

### STEP 2: Update Configuration File

**Edit: `utils/stripeConfig.ts`**

```typescript
export const STRIPE_CONFIG = {
  MONTHLY_PRICE_ID: 'price_YOUR_MONTHLY_ID_HERE',  // ← Paste here
  YEARLY_PRICE_ID: 'price_YOUR_YEARLY_ID_HERE',    // ← Paste here
  
  MONTHLY_PRICE: 9.99,   // ← Update if different
  YEARLY_PRICE: 99.99,   // ← Update if different
};
```

### STEP 3: Set Supabase Secrets

1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions
2. Click "Manage secrets"
3. Add these secrets:

```bash
STRIPE_SECRET_KEY=sk_test_...           # From Stripe Dashboard → API Keys
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe Dashboard → Webhooks
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...    # From Supabase Settings → API
```

### STEP 4: Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** → Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

---

## ✅ TEST IT (2 Minutes)

1. Open app → Profile → "View Plans"
2. Select a plan → "Start Premium"
3. Use test card: `4242 4242 4242 4242`
4. Complete payment
5. ✅ You should see "Premium Member" badge!

---

## 🐛 TROUBLESHOOTING

**Checkout doesn't open?**
- Check console logs
- Verify price IDs start with `price_` (not `prod_`)

**Payment succeeds but no premium?**
- Check Stripe webhook logs
- Tap "Restore Purchases" in Profile

**Still not working?**
- See full guide: `SUBSCRIPTION_SETUP_COMPLETE_GUIDE.md`
- Run debug: `import { logSubscriptionStatus } from '@/utils/subscriptionDebug'; logSubscriptionStatus();`

---

## 📋 CURRENT CONFIGURATION

**Price IDs in `stripeConfig.ts`:**
- Monthly: `price_1SZSojDsUf4JA97FuIWfvUfX`
- Yearly: `price_1SZSnyDsUf4JA97Fd7R9BMkD`

**If these are YOUR price IDs, you're ready to test!**
**If not, update them in Step 2 above.**

---

## 🎯 WHAT'S ALREADY DONE

✅ All code files implemented
✅ All Edge Functions deployed
✅ Database tables created
✅ Deep linking configured
✅ UI components complete

**You only need to:**
1. Add your Stripe price IDs
2. Set Supabase secrets
3. Configure webhook
4. Test!

---

## 🚀 READY TO LAUNCH?

Once testing works, switch to **Live Mode**:
1. Get live price IDs from Stripe
2. Update `stripeConfig.ts` with live IDs
3. Update Supabase secrets with live keys
4. Create live webhook endpoint
5. Test with real card
6. Launch! 🎉
