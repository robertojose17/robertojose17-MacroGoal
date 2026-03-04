
# iOS Sandbox Testing - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Prepare Device
```
Settings → App Store → Sign Out (of real Apple ID)
DO NOT sign in with Sandbox Tester here!
```

### 2. Launch App
```
Build → Run on physical device
Navigate to: Profile → Upgrade to Pro
```

### 3. Make Purchase
```
Tap "Subscribe Now"
→ Apple prompts for login
→ Enter Sandbox Tester credentials
→ Confirm purchase
→ See "Success! 🎉"
```

### 4. Verify Backend
```
Supabase Dashboard → revenuecat_events table
→ Should see INITIAL_PURCHASE event
→ Check amount_usd column
```

---

## 📱 Sandbox Tester Setup

### Create Tester (App Store Connect)
1. Go to: Users and Access → Sandbox Testers
2. Click "+" to add tester
3. Fill in:
   - Email: `test1@yourdomain.com` (must be unique, not real)
   - Password: Strong password
   - First/Last Name: Test User
   - Country: United States
4. Save

### Use Tester (On Device)
- **DO NOT** sign in via Settings → App Store
- Sign in will happen automatically during first purchase
- Apple will show "Environment: Sandbox" banner

---

## 🧪 Test Scenarios

### Scenario 1: First Purchase
**Steps**:
1. Fresh app install
2. Navigate to paywall
3. Select Monthly plan
4. Tap Subscribe
5. Enter Sandbox credentials
6. Confirm

**Expected**:
- Purchase completes instantly
- App shows "Pro Member" badge
- `revenuecat_events` table has new row
- `subscriptions` table shows `status: active`

**Logs to Check**:
```
[RevenueCap] ✅ Revenue cap check passed
[RevenueCat] ✅ Purchase successful
[RevenueCat] User is now PRO ✨
```

---

### Scenario 2: Restore Purchases
**Steps**:
1. Delete app
2. Reinstall
3. Navigate to paywall
4. Tap "Restore Purchases"

**Expected**:
- App recognizes previous purchase
- Shows "Pro Member" badge
- No new charge

**Logs to Check**:
```
[RevenueCat] 🔄 Restoring purchases...
[RevenueCat] ✅ Purchases restored
[RevenueCat] User is now PRO ✨
```

---

### Scenario 3: Revenue Cap Reached
**Steps**:
1. Go to Supabase → `revenuecat_events` table
2. Run SQL:
   ```sql
   INSERT INTO revenuecat_events (
     event_type, app_user_id, product_id, amount_usd, raw_event
   ) VALUES (
     'INITIAL_PURCHASE', 'YOUR_USER_ID', 'test_product', 500.00, '{}'::jsonb
   );
   ```
3. Try to purchase in app

**Expected**:
- Purchase is blocked
- Modal shows: "Spending Limit Reached"
- No charge attempted

**Logs to Check**:
```
[RevenueCap] Total Revenue: $500.00
[RevenueCap] Cap Reached: ❌ YES
[RevenueCap] ❌ Revenue cap reached. Blocking purchase.
```

---

### Scenario 4: User Cancels Purchase
**Steps**:
1. Initiate purchase
2. Tap "Cancel" in Apple payment sheet

**Expected**:
- No error modal shown
- App returns to paywall
- No charge

**Logs to Check**:
```
[RevenueCat] User cancelled purchase
```

---

### Scenario 5: Network Error
**Steps**:
1. Turn off WiFi and cellular
2. Try to purchase

**Expected**:
- Modal shows: "Network Error. Please check your internet connection."

**Logs to Check**:
```
[RevenueCat] ❌ Purchase error: Network error
```

---

### Scenario 6: Product Not Found
**Steps**:
1. Change product ID in `config/revenueCatConfig.ts` to invalid value
2. Restart app
3. Navigate to paywall

**Expected**:
- Paywall shows: "No subscription plans available"
- Logs show warning about missing products

**Logs to Check**:
```
[RevenueCat] ⚠️ No offerings available
```

---

## 🔍 Diagnostic Screen

### Access
```
Profile → RevenueCat Diagnostics
```

### What to Check
- ✅ Supabase Connection: Connected
- ✅ RevenueCat Events Table: Table exists
- ✅ Subscription Record: Synced with RevenueCat
- ✅ Webhook Events: X event(s) received
- ✅ RevenueCat SDK: Premium Active (or Free User)
- ✅ RevenueCat Offerings: 2 package(s) available
- ✅ RevenueCat App User ID: Configured

### If Any Check Fails
- Red (Error): Critical issue, follow fix instructions
- Yellow (Warning): Non-critical, may need attention
- Blue (Info): Informational, no action needed

---

## 🐛 Common Issues

### Issue: "Sign in to iTunes Store" never appears
**Cause**: Already signed in with Sandbox Tester in Settings
**Fix**: 
1. Settings → App Store → Sign Out
2. Try purchase again

### Issue: "Cannot connect to iTunes Store"
**Cause**: Sandbox environment issue (Apple side)
**Fix**: 
1. Wait a few minutes
2. Try again
3. If persists, use different Sandbox Tester

### Issue: Purchase completes but app doesn't update
**Cause**: Webhook not firing or subscription not syncing
**Fix**:
1. Check Supabase Edge Function logs
2. Verify webhook URL in RevenueCat
3. Manually trigger webhook test in RevenueCat Dashboard

### Issue: "Product not available"
**Cause**: Product not synced from App Store Connect
**Fix**:
1. Wait 2-4 hours after creating product
2. Verify product status is "Ready to Submit" or "Approved"
3. Check product ID matches exactly

---

## 📊 Expected Database State

### After First Purchase

**revenuecat_events table**:
| Column | Value |
|--------|-------|
| event_type | INITIAL_PURCHASE |
| app_user_id | abc123... |
| product_id | Monthly_MG |
| amount_usd | 9.99 |
| currency | USD |
| purchased_at | 2024-01-15T10:30:00Z |

**subscriptions table**:
| Column | Value |
|--------|-------|
| user_id | abc123... |
| status | active |
| plan_name | Monthly_MG |
| revenuecat_app_user_id | abc123... |
| entitlement_ids | ["Macrogoal Pro"] |
| will_renew | true |

---

## 🎯 Success Criteria

Before marking as "Done":

- [ ] Sandbox purchase completes without errors
- [ ] App shows "Pro Member" badge after purchase
- [ ] Restore purchases works
- [ ] Revenue cap blocks purchase at $500
- [ ] User cancellation handled gracefully
- [ ] Network error shows user-friendly message
- [ ] Webhook events appear in database
- [ ] Subscription status syncs correctly
- [ ] Diagnostic screen shows all green checks
- [ ] Logs show expected messages for each scenario

---

## 📞 Support

If issues persist:
1. Check logs in Xcode console
2. Check Supabase Edge Function logs
3. Check RevenueCat Dashboard → Customer History
4. Review `docs/IOS_IAP_SETUP_COMPLETE.md` for detailed troubleshooting
