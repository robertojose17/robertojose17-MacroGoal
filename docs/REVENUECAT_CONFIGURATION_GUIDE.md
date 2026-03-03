
# 🔧 RevenueCat Configuration Guide

## Quick Start

Your app is already configured with RevenueCat! This guide explains what's configured and how to verify everything is set up correctly.

---

## 📋 Current Configuration

### API Key (Production)

```typescript
// config/revenueCatConfig.ts
export const REVENUECAT_API_KEY = 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE';
```

**Status:** ✅ Production key configured  
**Environment:** Production (not test/sandbox)

### Entitlement ID

```typescript
export const ENTITLEMENT_ID = 'Macrogoal Pro';
```

**What it means:** Users with an active subscription will have the "Macrogoal Pro" entitlement.

**How to check in code:**
```typescript
const { isPro } = useRevenueCat();

if (isPro) {
  // User has "Macrogoal Pro" entitlement
  // Unlock premium features
}
```

### Product IDs

```typescript
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};
```

**Status:** ✅ Configured  
**Must match:** App Store Connect product IDs

---

## 🍎 App Store Connect Setup

### Required Configuration

1. **Bundle ID:** `com.robertojose17.macrogoal`
2. **Apple ID:** `6755788871`
3. **Team ID:** `RQ6JHH38HA`

### Products in App Store Connect

You must create these products in App Store Connect:

| Product ID | Type | Name | Price |
|------------|------|------|-------|
| `monthly` | Auto-Renewable Subscription | Macrogoal Pro Monthly | Your choice |
| `yearly` | Auto-Renewable Subscription | Macrogoal Pro Annual | Your choice |

**Steps to create products:**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app (Macrogoal)
3. Go to "Features" → "In-App Purchases"
4. Click "+" to create new subscription
5. Select "Auto-Renewable Subscription"
6. Enter Product ID: `monthly` (exactly as shown)
7. Set subscription duration: 1 month
8. Add pricing
9. Submit for review
10. Repeat for `yearly` product (duration: 1 year)

**Important:** Product IDs must match EXACTLY. Case-sensitive.

---

## 🎯 RevenueCat Dashboard Setup

### 1. Create Entitlement

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project
3. Go to "Entitlements"
4. Click "New Entitlement"
5. Enter identifier: `Macrogoal Pro` (exactly as shown)
6. Save

### 2. Attach Products to Entitlement

1. Open "Macrogoal Pro" entitlement
2. Click "Attach Products"
3. Select `monthly` product
4. Select `yearly` product
5. Save

**Result:** When a user purchases `monthly` or `yearly`, they get the "Macrogoal Pro" entitlement.

### 3. Create Offering

1. Go to "Offerings"
2. Click "New Offering"
3. Enter identifier: `default` (or custom name)
4. Make it the "Current Offering"
5. Add packages:
   - **Monthly Package:**
     - Identifier: `$rc_monthly` (or custom)
     - Product: `monthly`
   - **Annual Package:**
     - Identifier: `$rc_annual` (or custom)
     - Product: `yearly`
6. Save

**Result:** The app will fetch this offering and display both packages in the paywall.

### 4. Link App Store Connect

1. Go to "Project Settings" → "Integrations"
2. Click "App Store Connect"
3. Follow the wizard to link your account
4. Import products from App Store Connect
5. Verify `monthly` and `yearly` appear in RevenueCat

---

## 🧪 Testing Configuration

### Sandbox Testing (iOS)

1. **Create Sandbox Test Account:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Users and Access → Sandbox Testers
   - Create a new sandbox tester
   - Use a unique email (e.g., `test+sandbox@example.com`)

2. **Sign in on Device:**
   - Settings → App Store → Sign Out
   - Open your app
   - Attempt a purchase
   - Sign in with sandbox account when prompted

3. **Test Purchase:**
   - Open app → Profile → "Upgrade to Premium"
   - Select a plan
   - Complete purchase (you won't be charged)
   - Verify "Premium Active" appears

4. **Test Restore:**
   - Uninstall app
   - Reinstall app
   - Tap "Restore Purchases"
   - Verify subscription restored

### Verify in RevenueCat Dashboard

1. Go to "Customers"
2. Search for your test user (by email or RevenueCat ID)
3. Verify:
   - Active subscription appears
   - "Macrogoal Pro" entitlement is active
   - Expiration date is shown

---

## 🔍 Troubleshooting

### Issue: "No offerings available"

**Cause:** RevenueCat can't find the "default" offering.

**Solution:**
1. Go to RevenueCat Dashboard → Offerings
2. Verify an offering exists
3. Verify it's marked as "Current Offering"
4. Verify it has packages attached
5. Restart the app

### Issue: "Products not found"

**Cause:** Product IDs don't match between App Store Connect and RevenueCat.

**Solution:**
1. Go to App Store Connect → In-App Purchases
2. Verify products exist: `monthly`, `yearly`
3. Verify product IDs match EXACTLY (case-sensitive)
4. Go to RevenueCat Dashboard → Products
5. Verify products are imported
6. Re-link App Store Connect if needed

### Issue: "Purchase succeeds but entitlement not active"

**Cause:** Products not attached to entitlement.

**Solution:**
1. Go to RevenueCat Dashboard → Entitlements
2. Open "Macrogoal Pro"
3. Verify `monthly` and `yearly` are attached
4. If not, click "Attach Products" and add them
5. Test purchase again

### Issue: "Sandbox purchases not working"

**Cause:** Not signed in with sandbox account.

**Solution:**
1. Settings → App Store → Sign Out
2. Delete app
3. Reinstall app
4. Attempt purchase
5. Sign in with sandbox account when prompted
6. Complete purchase

---

## 📊 Monitoring

### RevenueCat Dashboard

**Overview Tab:**
- Active subscriptions
- Monthly Recurring Revenue (MRR)
- New subscriptions
- Churn rate

**Customers Tab:**
- Individual customer details
- Subscription history
- Entitlements
- Purchase events

**Charts Tab:**
- Revenue trends
- Subscription growth
- Conversion rates

**Events Tab:**
- Real-time purchase events
- Renewals
- Cancellations
- Expirations

### How to Check a Specific User

1. Go to "Customers"
2. Search by:
   - Email (if you set it via `Purchases.setEmail()`)
   - RevenueCat App User ID (Supabase user ID)
   - Transaction ID
3. View:
   - Active subscriptions
   - Entitlements
   - Purchase history
   - Subscription status

---

## 🔐 Security

### API Keys

**Public API Key (iOS):** `appl_TZdEZxwrVNJdRUPcoavoXaVUCSE`

- ✅ Safe to include in app code
- ✅ Safe to commit to Git
- ✅ Used for SDK initialization
- ❌ Do NOT use secret API key in app

**Secret API Key:**
- ⚠️ NEVER include in app code
- ⚠️ NEVER commit to Git
- ✅ Only use in server-side code (if needed)
- ✅ Store in environment variables

### User Identification

The app identifies users with Supabase user IDs:

```typescript
// hooks/useRevenueCat.ts
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await Purchases.logIn(user.id);
}
```

**Benefits:**
- Links RevenueCat customer to Supabase user
- Enables cross-device subscription sync
- Allows customer lookup in dashboard

---

## 🚀 Going to Production

### Pre-Launch Checklist

- [ ] Products created in App Store Connect
- [ ] Products approved and "Ready to Submit"
- [ ] Products imported to RevenueCat
- [ ] Entitlement "Macrogoal Pro" created
- [ ] Products attached to entitlement
- [ ] Offering created with packages
- [ ] Offering set as "Current Offering"
- [ ] Sandbox testing completed
- [ ] TestFlight testing completed
- [ ] Production API key configured (already done ✅)
- [ ] App submitted to App Store

### Post-Launch Monitoring

1. **First 24 Hours:**
   - Monitor RevenueCat dashboard for purchases
   - Check for errors in "Events" tab
   - Verify entitlements activate correctly

2. **First Week:**
   - Monitor conversion rates
   - Check for failed purchases
   - Review customer feedback

3. **Ongoing:**
   - Weekly revenue reports
   - Monthly churn analysis
   - Quarterly pricing optimization

---

## 📞 Support

### RevenueCat Support

- **Documentation:** https://www.revenuecat.com/docs
- **Community:** https://community.revenuecat.com
- **Support:** support@revenuecat.com

### Common Questions

**Q: Can I change product IDs?**  
A: Yes, but you must update them in 3 places:
1. App Store Connect
2. RevenueCat Dashboard
3. `config/revenueCatConfig.ts`

**Q: Can I change the entitlement ID?**  
A: Yes, but you must update it in 2 places:
1. RevenueCat Dashboard
2. `config/revenueCatConfig.ts` (ENTITLEMENT_ID)

**Q: How do I test without being charged?**  
A: Use sandbox testing with a sandbox Apple ID. You'll never be charged in sandbox.

**Q: How do I cancel a sandbox subscription?**  
A: Sandbox subscriptions auto-renew every few minutes for testing. They expire automatically after a few renewals.

**Q: Can I use RevenueCat for Android too?**  
A: Yes! RevenueCat supports both iOS and Android. You'll need to:
1. Add Android products to Google Play Console
2. Link Google Play to RevenueCat
3. The same code works for both platforms

---

## ✅ Configuration Complete

Your app is fully configured with RevenueCat! 

**Next Steps:**
1. Test sandbox purchases
2. Submit app to App Store
3. Monitor dashboard after launch
4. Optimize pricing based on data

🎉 You're ready to start accepting subscriptions!
