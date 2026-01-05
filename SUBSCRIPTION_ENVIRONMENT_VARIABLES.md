
# 🔑 SUBSCRIPTION SYSTEM - ENVIRONMENT VARIABLES REFERENCE

## 📍 WHERE TO SET EACH VARIABLE

### 1️⃣ CLIENT-SIDE (In Code)

**File: `utils/stripeConfig.ts`**

These are **hardcoded in the source code** (not environment variables):

```typescript
export const STRIPE_CONFIG = {
  // ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PRICE IDs
  MONTHLY_PRICE_ID: 'price_1SZSojDsUf4JA97FuIWfvUfX',
  YEARLY_PRICE_ID: 'price_1SZSnyDsUf4JA97Fd7R9BMkD',
  
  // Update if your prices are different
  MONTHLY_PRICE: 9.99,
  YEARLY_PRICE: 99.99,
};
```

**Why hardcoded?**
- Price IDs are not sensitive (they're visible in Stripe Checkout anyway)
- Makes the code simpler and more reliable
- No need for environment variable management on the client

**How to get these values:**
1. Go to: https://dashboard.stripe.com/test/products
2. Click your product
3. Copy the **Price ID** (starts with `price_`, NOT `prod_`)

---

### 2️⃣ SUPABASE EDGE FUNCTIONS (Secrets)

**Where to set:** https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions

Click "Manage secrets" and add these:

| Secret Name | Example Value | Where to Get It |
|------------|---------------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_test_51SZKI8DsUf4JA97F...` | Stripe Dashboard → Developers → API Keys → Secret Key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_EuaTsQ3bDtr9GEel...` | Stripe Dashboard → Developers → Webhooks → Signing Secret |
| `SUPABASE_URL` | `https://esgptfiofoaeguslgvcq.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase Dashboard → Settings → API → Service Role Key |

**⚠️ CRITICAL:**
- These are **server-side secrets** - never expose them in client code
- `STRIPE_SECRET_KEY` can charge cards - keep it secret!
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep it secret!

---

### 3️⃣ APP CONFIGURATION (app.json)

**File: `app.json`**

```json
{
  "expo": {
    "scheme": "elitemacrotracker",
    // ... other config
  }
}
```

**This is already configured!** No changes needed.

**What it does:**
- Enables deep linking for post-checkout redirects
- Format: `elitemacrotracker://profile?subscription_success=true`

---

## 🔍 DETAILED VARIABLE DESCRIPTIONS

### `STRIPE_SECRET_KEY`

**Purpose:** Authenticates requests to Stripe API from Edge Functions

**Format:** `sk_test_...` (test mode) or `sk_live_...` (live mode)

**Used by:**
- `create-checkout-session` - Creates checkout sessions
- `stripe-webhook` - Verifies webhook signatures
- `sync-subscription` - Fetches subscription data
- `create-portal-session` - Creates customer portal sessions

**How to get:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Reveal test key" under "Secret key"
3. Copy the entire key (starts with `sk_test_`)

**Security:**
- ⚠️ NEVER commit this to git
- ⚠️ NEVER expose in client-side code
- ⚠️ Only set in Supabase Edge Function secrets

---

### `STRIPE_WEBHOOK_SECRET`

**Purpose:** Verifies that webhook events are actually from Stripe

**Format:** `whsec_...`

**Used by:**
- `stripe-webhook` - Verifies webhook signature before processing

**How to get:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
4. Select events (see below)
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

**Required webhook events:**
- `checkout.session.completed` - When payment succeeds
- `customer.subscription.created` - When subscription is created
- `customer.subscription.updated` - When subscription changes
- `customer.subscription.deleted` - When subscription is cancelled
- `invoice.payment_succeeded` - When recurring payment succeeds
- `invoice.payment_failed` - When recurring payment fails

**Security:**
- ⚠️ NEVER commit this to git
- ⚠️ Without this, malicious actors could fake webhook events

---

### `SUPABASE_URL`

**Purpose:** Base URL for Supabase API calls from Edge Functions

**Format:** `https://[project-ref].supabase.co`

**Value:** `https://esgptfiofoaeguslgvcq.supabase.co`

**Used by:**
- All Edge Functions that need to update the database

**How to get:**
1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api
2. Copy "Project URL"

**Note:** This is not sensitive, but it's set as a secret for consistency

---

### `SUPABASE_SERVICE_ROLE_KEY`

**Purpose:** Authenticates Edge Functions to bypass RLS and update any data

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)

**Used by:**
- `stripe-webhook` - Updates user subscription status
- `sync-subscription` - Fetches and updates subscription data
- `create-portal-session` - Fetches customer ID

**How to get:**
1. Go to: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api
2. Copy "service_role" key (under "Project API keys")

**Security:**
- ⚠️ NEVER commit this to git
- ⚠️ NEVER expose in client-side code
- ⚠️ This key bypasses ALL Row Level Security policies
- ⚠️ Only use in trusted server-side code

---

### `MONTHLY_PRICE_ID` & `YEARLY_PRICE_ID`

**Purpose:** Identifies which Stripe price to charge

**Format:** `price_...`

**Used by:**
- `app/paywall.tsx` - Sends to checkout session
- `create-checkout-session` - Creates checkout with this price

**How to get:**
1. Go to: https://dashboard.stripe.com/test/products
2. Click your product (e.g., "Elite Macro Tracker Premium")
3. In the "Pricing" section, click on a price
4. Copy the "Price ID" (starts with `price_`)

**Common mistake:**
- ❌ Copying Product ID (`prod_...`) instead of Price ID (`price_...`)
- ✅ Always use Price ID, never Product ID

**Why not environment variables?**
- Not sensitive (visible in Stripe Checkout anyway)
- Easier to manage in code
- No risk of misconfiguration

---

## 📋 QUICK REFERENCE TABLE

| Variable | Location | Sensitive? | Format | Example |
|----------|----------|------------|--------|---------|
| `MONTHLY_PRICE_ID` | `stripeConfig.ts` | No | `price_...` | `price_1SZSojDsUf4JA97FuIWfvUfX` |
| `YEARLY_PRICE_ID` | `stripeConfig.ts` | No | `price_...` | `price_1SZSnyDsUf4JA97Fd7R9BMkD` |
| `STRIPE_SECRET_KEY` | Supabase Secrets | ⚠️ YES | `sk_test_...` | `sk_test_51SZKI8DsUf4JA97F...` |
| `STRIPE_WEBHOOK_SECRET` | Supabase Secrets | ⚠️ YES | `whsec_...` | `whsec_EuaTsQ3bDtr9GEel...` |
| `SUPABASE_URL` | Supabase Secrets | No | `https://...` | `https://esgptfiofoaeguslgvcq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secrets | ⚠️ YES | `eyJhbGc...` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

---

## 🔄 TEST MODE vs LIVE MODE

### Test Mode (Development)

**Stripe Keys:**
- Secret Key: `sk_test_...`
- Webhook Secret: `whsec_...` (from test webhook)
- Price IDs: `price_...` (from test products)

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- More: https://stripe.com/docs/testing

### Live Mode (Production)

**Stripe Keys:**
- Secret Key: `sk_live_...`
- Webhook Secret: `whsec_...` (from live webhook)
- Price IDs: `price_...` (from live products)

**⚠️ IMPORTANT:**
- Create separate products in live mode
- Create separate webhook endpoint in live mode
- Update ALL keys and price IDs when switching to live
- Test with a real card before launching

---

## ✅ VERIFICATION CHECKLIST

Before testing, verify:

- [ ] `stripeConfig.ts` has your actual price IDs (not placeholders)
- [ ] Price IDs start with `price_` (not `prod_`)
- [ ] Supabase secrets are set (4 secrets total)
- [ ] `STRIPE_SECRET_KEY` starts with `sk_test_` (test mode)
- [ ] `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
- [ ] Stripe webhook endpoint is created and active
- [ ] Webhook events include `checkout.session.completed`
- [ ] `app.json` has `"scheme": "elitemacrotracker"`

---

## 🐛 COMMON ERRORS

**"Invalid price ID"**
- You're using a Product ID (`prod_...`) instead of Price ID (`price_...`)
- Solution: Get the correct Price ID from Stripe Dashboard

**"No such customer"**
- Webhook received event for customer not in database
- Solution: Run "Restore Purchases" in the app

**"Webhook signature verification failed"**
- `STRIPE_WEBHOOK_SECRET` is incorrect or not set
- Solution: Get the correct secret from Stripe webhook settings

**"Unauthorized"**
- User is not logged in
- Solution: Ensure user is authenticated before calling Edge Functions

---

## 📞 NEED HELP?

**Check these resources:**
1. Full setup guide: `SUBSCRIPTION_SETUP_COMPLETE_GUIDE.md`
2. Quick start: `SUBSCRIPTION_QUICK_START.md`
3. Stripe Dashboard: https://dashboard.stripe.com/test
4. Supabase Dashboard: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq

**Debug tools:**
```typescript
import { logSubscriptionStatus, manualSyncSubscription } from '@/utils/subscriptionDebug';

// Log current status
logSubscriptionStatus();

// Manually sync from Stripe
manualSyncSubscription();
```
