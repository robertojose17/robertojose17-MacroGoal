
# ⚡ QUICK START: Launch in 30 Minutes

## 🎯 What You Need

- [ ] Stripe account (LIVE mode)
- [ ] iOS device or simulator
- [ ] 30 minutes

---

## 🚀 Step-by-Step (30 minutes)

### 1️⃣ Update Stripe Keys (5 min)

**Get your keys**:
- Go to: https://dashboard.stripe.com/apikeys
- Switch to **LIVE mode**
- Copy **Publishable key** and **Secret key**

**Update app**:
```typescript
// File: utils/stripeConfig.ts
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_KEY';
```

**Update Supabase**:
- Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions
- Click **Secrets**
- Set: `STRIPE_SECRET_KEY=sk_live_YOUR_KEY`

---

### 2️⃣ Configure Webhook (5 min)

**In Stripe Dashboard**:
- Go to: https://dashboard.stripe.com/webhooks
- Click **Add endpoint**
- URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`
- Copy **Signing secret**

**Update Supabase**:
- Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions
- Click **Secrets**
- Set: `STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET`

---

### 3️⃣ Build & Test (15 min)

**Build app**:
```bash
expo prebuild -p ios
expo run:ios --device
```

**Test payment**:
1. Open app
2. Go to Profile > Upgrade to Premium
3. Select plan
4. Enter card: `4242 4242 4242 4242`
5. Complete payment

**Expected**:
- ✅ Safari redirects to app
- ✅ Alert: "Payment Successful!"
- ✅ Within 40s: "Welcome to Premium!"
- ✅ Profile shows "Premium" badge

---

### 4️⃣ Verify (5 min)

**Check logs**:
- Supabase: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/functions/stripe-webhook/logs
- Stripe: https://dashboard.stripe.com/webhooks

**Check database**:
```sql
SELECT user_type FROM users WHERE email = 'YOUR_EMAIL';
-- Should return: 'premium'
```

---

## ✅ Done!

If all steps passed, you're ready to launch! 🚀

---

## 🚨 Quick Troubleshooting

**App doesn't open from Safari**:
```bash
expo prebuild -p ios
expo run:ios --device
```

**Premium not updating**:
- Check webhook logs
- Verify webhook secret
- Wait up to 60 seconds

**Webhook failing**:
- Verify webhook secret in Supabase
- Check Stripe webhook logs

---

## 📚 Full Documentation

- **Detailed Guide**: `STRIPE_IOS_REDIRECT_FIX_PRODUCTION_READY.md`
- **Configuration**: `STRIPE_PRODUCTION_CONFIG_REFERENCE.md`
- **Summary**: `LAUNCH_READY_STRIPE_FIX_SUMMARY.md`
- **Actions**: `ACTION_REQUIRED_FINAL_STEPS.md`

---

**You're ready to launch!** 🎉
