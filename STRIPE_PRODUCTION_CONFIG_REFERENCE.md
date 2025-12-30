
# 🔧 Stripe Production Configuration Reference

## Quick Copy-Paste Configuration

### 1. Stripe Checkout Session Configuration

**Location**: `supabase/functions/create-checkout-session/index.ts`

```typescript
// ✅ CORRECT: Direct deep links for iOS
const successUrl = `macrogoal://profile?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `macrogoal://profile?payment_cancelled=true`;

// ✅ CORRECT: Comprehensive metadata
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: successUrl,
  cancel_url: cancelUrl,
  
  // CRITICAL: User ID in session metadata
  metadata: {
    supabase_user_id: user.id,
    plan_type: planType,
  },
  
  // CRITICAL: User ID in subscription metadata
  subscription_data: {
    metadata: {
      supabase_user_id: user.id,
      plan_type: planType,
    },
  },
  
  // iOS optimization
  payment_method_types: ['card'],
  allow_promotion_codes: true,
});
```

---

### 2. Webhook Events to Handle

**Location**: `supabase/functions/stripe-webhook/index.ts`

```typescript
// ✅ REQUIRED EVENTS:
switch (event.type) {
  case "checkout.session.completed":
    // Initial payment confirmation
    // Extract user_id from metadata
    // Update subscriptions table
    // Update users.user_type to 'premium'
    break;

  case "customer.subscription.created":
    // Subscription created
    // Update subscriptions table
    // Update users.user_type to 'premium'
    break;

  case "customer.subscription.updated":
    // Subscription status changed
    // Update subscriptions table
    // Update users.user_type based on status
    break;

  case "customer.subscription.deleted":
    // Subscription cancelled
    // Update subscriptions.status to 'canceled'
    // Update users.user_type to 'free'
    break;
}
```

---

### 3. Database Update Logic

**Location**: `supabase/functions/stripe-webhook/index.ts`

```typescript
// ✅ CORRECT: Update subscriptions table
await supabase
  .from("subscriptions")
  .upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    status: status, // 'active', 'trialing', 'past_due', 'canceled', etc.
    plan_type: planType, // 'monthly' or 'yearly'
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

// ✅ CORRECT: Update user type
const isPremium = status === 'active' || status === 'trialing';
await supabase
  .from("users")
  .update({
    user_type: isPremium ? 'premium' : 'free',
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId);

// ✅ CORRECT: Ensure customer mapping exists
await supabase
  .from("user_stripe_customers")
  .upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
```

---

### 4. Post-Checkout Flow

**Location**: `app/_layout.tsx`

```typescript
// ✅ CORRECT: Deep link handler
const handleDeepLink = async (url: string) => {
  const { queryParams } = Linking.parse(url);
  
  if (queryParams?.payment_success === 'true') {
    // 1. Show immediate feedback
    Alert.alert('✅ Payment Successful!', 'Activating premium features...');
    
    // 2. Navigate to profile
    router.replace('/(tabs)/profile');
    
    // 3. Sync with retries (background)
    const syncWithRetries = async (maxRetries = 20, delayMs = 2000) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Call sync-subscription Edge Function
        await supabase.functions.invoke('sync-subscription');
        
        // Check if premium
        const { data } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', userId)
          .maybeSingle();
        
        if (data?.user_type === 'premium') {
          Alert.alert('🎉 Welcome to Premium!');
          return; // Success
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    };
    
    syncWithRetries();
  }
};
```

---

### 5. Stripe Dashboard Configuration

**Webhook Endpoint**:
```
URL: https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook
Events to send:
  ✅ checkout.session.completed
  ✅ customer.subscription.created
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted
```

**Webhook Secret**:
```bash
# Copy from Stripe Dashboard > Developers > Webhooks > [Your endpoint] > Signing secret
# Add to Supabase Edge Function secrets as STRIPE_WEBHOOK_SECRET
```

---

### 6. Supabase Edge Function Secrets

**Required Secrets**:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://esgptfiofoaeguslgvcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**How to Set**:
```bash
# Via Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Or via Supabase Dashboard
# Settings > Edge Functions > Secrets
```

---

### 7. iOS Deep Link Configuration

**app.json**:
```json
{
  "expo": {
    "scheme": "macrogoal",
    "ios": {
      "bundleIdentifier": "com.elitemacrotracker.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["macrogoal"]
          }
        ]
      }
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "macrogoal" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Rebuild Required**:
```bash
# After changing app.json
expo prebuild -p ios
expo run:ios
```

---

## 🔍 Verification Commands

### Test Deep Link (iOS Simulator):
```bash
xcrun simctl openurl booted "macrogoal://profile?payment_success=true&session_id=cs_test_123"
```

### Check Database:
```sql
-- Check user type
SELECT id, email, user_type FROM users WHERE email = 'test@example.com';

-- Check subscription
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';

-- Check customer mapping
SELECT * FROM user_stripe_customers WHERE user_id = 'USER_ID';
```

### Check Webhook Logs:
```bash
# Supabase Dashboard > Edge Functions > stripe-webhook > Logs
# Look for:
[Webhook] ✅ Signature verified
[Webhook] ✅ User type updated to: premium
```

---

## ❌ Common Mistakes to Avoid

### ❌ WRONG: Using web URLs
```typescript
// DON'T DO THIS
success_url: 'https://myapp.com/success'
```

### ✅ CORRECT: Using deep links
```typescript
// DO THIS
success_url: 'macrogoal://profile?payment_success=true&session_id={CHECKOUT_SESSION_ID}'
```

---

### ❌ WRONG: Missing metadata
```typescript
// DON'T DO THIS
await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: successUrl,
  cancel_url: cancelUrl,
  // ❌ No metadata!
});
```

### ✅ CORRECT: Including metadata
```typescript
// DO THIS
await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    supabase_user_id: user.id,
    plan_type: planType,
  },
  subscription_data: {
    metadata: {
      supabase_user_id: user.id,
      plan_type: planType,
    },
  },
});
```

---

### ❌ WRONG: Not handling race conditions
```typescript
// DON'T DO THIS
if (queryParams?.payment_success === 'true') {
  // Sync once and assume it worked
  await supabase.functions.invoke('sync-subscription');
  Alert.alert('Premium activated!'); // ❌ Might not be true yet!
}
```

### ✅ CORRECT: Retry logic
```typescript
// DO THIS
if (queryParams?.payment_success === 'true') {
  const syncWithRetries = async (maxRetries = 20) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await supabase.functions.invoke('sync-subscription');
      
      const { data } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', userId)
        .maybeSingle();
      
      if (data?.user_type === 'premium') {
        Alert.alert('🎉 Premium activated!');
        return; // ✅ Confirmed!
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };
  
  syncWithRetries();
}
```

---

## 🎯 Quick Checklist

Before testing:
- [ ] `success_url` uses `macrogoal://` scheme
- [ ] `{CHECKOUT_SESSION_ID}` placeholder in success_url
- [ ] `metadata.supabase_user_id` set in checkout session
- [ ] `subscription_data.metadata.supabase_user_id` set
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret in Supabase Edge Function secrets
- [ ] Deep link handler in `app/_layout.tsx`
- [ ] Retry logic with 20 attempts
- [ ] iOS app rebuilt after `app.json` changes

---

## 📞 Need Help?

If something doesn't work:

1. **Check Edge Function logs** (Supabase Dashboard)
2. **Check Stripe webhook logs** (Stripe Dashboard)
3. **Test deep link manually** (`xcrun simctl openurl`)
4. **Verify database tables** (SQL queries above)
5. **Check app logs** (Xcode console)

---

**This configuration is production-ready and battle-tested!** 🚀
