
# iOS In-App Purchase - Configuration Checklist

## ✅ What You Need to Do (Manual Steps)

### 1. App Store Connect Configuration

#### A. Create Products
**Location**: App Store Connect → Your App → Features → In-App Purchases

**Action Required**:
- [ ] Create product: `Monthly_MG`
  - Type: Auto-Renewable Subscription
  - Duration: 1 Month
  - Price: $9.99 (or your preferred price)
  - Localized name: "Monthly Premium"
  - Localized description: "Access to all premium features for one month"
  
- [ ] Create product: `Yearly_MG`
  - Type: Auto-Renewable Subscription
  - Duration: 1 Year
  - Price: $49.99 (or your preferred price)
  - Localized name: "Annual Premium"
  - Localized description: "Access to all premium features for one year"

- [ ] Create Subscription Group: "Macrogoal Pro"
  - Add both products to this group

- [ ] Submit products for review

**Wait Time**: 2-4 hours for Apple to sync products

---

#### B. Create Sandbox Testers
**Location**: App Store Connect → Users and Access → Sandbox Testers

**Action Required**:
- [ ] Create at least 2 sandbox testers
  - Email: Use unique emails (e.g., `test1@yourdomain.com`)
  - Password: Strong password
  - Country: United States (or your target market)

**Important**: Do NOT sign in with these accounts in Settings → App Store on your device. Sign-in happens automatically during purchase.

---

### 2. RevenueCat Dashboard Configuration

#### A. Create/Configure Project
**Location**: https://app.revenuecat.com

**Action Required**:
- [ ] Create new project (or select existing)
- [ ] Add iOS app
  - Bundle ID: `com.robertojose17.macrogoal` (from app.json)
  - App Name: "Macro Goal"

#### B. Connect to App Store
**Action Required**:
- [ ] Upload App Store Connect API Key
  - OR use Shared Secret (less secure)
- [ ] Verify connection is successful

#### C. Import Products
**Action Required**:
- [ ] Go to: Products → Import from App Store Connect
- [ ] Verify `Monthly_MG` and `Yearly_MG` appear in list
- [ ] If not, wait 2-4 hours and try again

#### D. Create Entitlement
**Action Required**:
- [ ] Go to: Entitlements
- [ ] Create entitlement: "Macrogoal Pro"
- [ ] Attach products:
  - [x] Monthly_MG
  - [x] Yearly_MG

#### E. Create Offering
**Action Required**:
- [ ] Go to: Offerings
- [ ] Create offering: "default"
- [ ] Add packages:
  - Package 1: "Monthly" → Monthly_MG
  - Package 2: "Annual" → Yearly_MG
- [ ] Set as "Current" offering

#### F. Configure Webhook
**Action Required**:
- [ ] Go to: Integrations → Webhooks
- [ ] Click "Add Webhook"
- [ ] Enter details:
  - **URL**: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
  - **Authorization**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA`
  - **Events**: Select all (or minimum: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION)
- [ ] Save webhook
- [ ] Test webhook (click "Send Test Event")

---

### 3. Supabase Configuration

#### A. Apply Database Migrations
**Location**: Supabase Dashboard → SQL Editor

**Action Required**:
- [ ] Run Migration 1: `supabase/migrations/20250131000000_create_revenuecat_integration.sql`
  - Copy entire file content
  - Paste in SQL Editor
  - Click "Run"
  - Verify: No errors

- [ ] Run Migration 2: `supabase/migrations/20250131000001_add_revenue_tracking.sql`
  - Copy entire file content
  - Paste in SQL Editor
  - Click "Run"
  - Verify: No errors

**Verification**:
- [ ] Go to: Table Editor
- [ ] Verify `revenuecat_events` table exists
- [ ] Verify `subscriptions` table has new columns:
  - `revenuecat_app_user_id`
  - `entitlement_ids`
  - `amount_usd`

#### B. Deploy Edge Function
**Location**: Supabase Dashboard → Edge Functions

**Action Required**:
- [ ] Click "Deploy New Function"
- [ ] Name: `revenuecat-webhook`
- [ ] Copy content from: `supabase/functions/revenuecat-webhook/index.ts`
- [ ] Paste in editor
- [ ] Click "Deploy"
- [ ] Verify: Function shows as "Active"

**Get Function URL**:
- [ ] Copy function URL (should be: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`)
- [ ] Use this URL in RevenueCat webhook configuration (step 2F above)

---

### 4. Xcode Configuration

#### A. Enable In-App Purchase Capability
**Location**: Xcode → Your Target → Signing & Capabilities

**Action Required**:
- [ ] Open project in Xcode
- [ ] Select your app target
- [ ] Go to "Signing & Capabilities" tab
- [ ] Click "+ Capability"
- [ ] Search for "In-App Purchase"
- [ ] Add capability
- [ ] Verify: "In-App Purchase" appears in capabilities list

**CRITICAL**: This MUST be enabled for StoreKit to work!

#### B. Verify Bundle Identifier
**Action Required**:
- [ ] Verify Bundle Identifier matches: `com.robertojose17.macrogoal`
- [ ] This MUST match App Store Connect and RevenueCat configuration

---

### 5. Code Configuration (Already Done)

These files are already configured correctly:

- ✅ `config/revenueCatConfig.ts`
  - API Key: `appl_TZdEZxwrVNJdRUPcoavoXaVUCSE`
  - Product IDs: `Monthly_MG`, `Yearly_MG`
  - Entitlement: "Macrogoal Pro"

- ✅ `utils/revenueCap.ts`
  - Revenue cap: $500 USD
  - Enforcement: Before purchase

- ✅ `hooks/useRevenueCat.ts`
  - Revenue cap check integrated
  - Error handling complete

- ✅ `supabase/functions/revenuecat-webhook/index.ts`
  - Price extraction
  - USD conversion
  - Event storage

---

## 🧪 Testing Checklist

### Before Testing
- [ ] All configuration steps above completed
- [ ] Waited 2-4 hours after creating products in App Store Connect
- [ ] Webhook test event sent successfully in RevenueCat

### Test on Physical Device
- [ ] Device signed out of real Apple ID (Settings → App Store)
- [ ] App built and running on device
- [ ] Navigate to Profile → Upgrade to Pro

### Test Scenarios
- [ ] **Purchase Flow**
  - Tap "Subscribe Now"
  - Enter Sandbox Tester credentials
  - Confirm purchase
  - See "Success! 🎉" message
  - Profile shows "Pro Member" badge

- [ ] **Backend Verification**
  - Check `revenuecat_events` table for new row
  - Check `subscriptions` table for updated status
  - Verify `amount_usd` is populated

- [ ] **Restore Purchases**
  - Delete app
  - Reinstall
  - Tap "Restore Purchases"
  - See "Pro Member" badge

- [ ] **Revenue Cap**
  - Manually insert $500 in `revenuecat_events`
  - Try to purchase
  - See "Spending Limit Reached" message

- [ ] **Error Handling**
  - Cancel purchase → No error, returns to paywall
  - Turn off internet → "Network Error" message
  - Invalid product → "No subscription plans available"

### Diagnostic Screen
- [ ] Navigate to Profile → RevenueCat Diagnostics
- [ ] All checks show green (success) or blue (info)
- [ ] No red (error) checks

---

## 📋 Final Verification

Before submitting to TestFlight/Production:

- [ ] All configuration steps completed
- [ ] All test scenarios passed
- [ ] Diagnostic screen shows all green
- [ ] Logs show expected messages
- [ ] No errors in Xcode console
- [ ] No errors in Supabase Edge Function logs
- [ ] Webhook events appearing in database

---

## 🎯 What's Already Done (No Action Needed)

### Code Implementation
- ✅ Revenue cap enforcement (`utils/revenueCap.ts`)
- ✅ IAP flow with error handling (`hooks/useRevenueCat.ts`)
- ✅ Database schema (`supabase/migrations/`)
- ✅ Webhook handler (`supabase/functions/revenuecat-webhook/`)
- ✅ Paywall UI (`components/RevenueCatPaywall.tsx`)
- ✅ Subscription button (`components/SubscriptionButton.tsx`)
- ✅ Diagnostic screen (`app/revenuecat-diagnostics.tsx`)

### Configuration Files
- ✅ RevenueCat config (`config/revenueCatConfig.ts`)
- ✅ Supabase client (`lib/supabase/client.ts`)
- ✅ App config (`app.json`)

### Documentation
- ✅ Complete setup guide (`docs/IOS_IAP_SETUP_COMPLETE.md`)
- ✅ Sandbox testing guide (`docs/SANDBOX_TESTING_GUIDE.md`)
- ✅ This checklist (`docs/CONFIGURATION_CHECKLIST.md`)

---

## 📞 Need Help?

If you encounter issues:
1. Check logs in Xcode console
2. Check Supabase Edge Function logs
3. Check RevenueCat Dashboard → Customer History
4. Review `docs/IOS_IAP_SETUP_COMPLETE.md` for detailed troubleshooting
5. Review `docs/SANDBOX_TESTING_GUIDE.md` for testing steps

---

## ✅ Summary

**What You Need to Do**:
1. Configure products in App Store Connect (30 min)
2. Configure RevenueCat Dashboard (20 min)
3. Apply Supabase migrations (5 min)
4. Deploy Supabase Edge Function (5 min)
5. Enable In-App Purchase capability in Xcode (2 min)
6. Test in Sandbox (15 min)

**Total Time**: ~1.5 hours

**What's Already Done**:
- All code implementation
- All error handling
- Revenue cap enforcement
- Database schema
- Webhook handler
- UI components
- Documentation

**You're ready to go!** Just follow the checklist above and test in Sandbox.
