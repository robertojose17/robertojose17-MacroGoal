
# 🎯 Quick Verification Checklist

Use this checklist to verify all configuration is correct:

## ✅ File-by-File Verification

### 1. app.json
Open `app.json` and verify:
- [ ] `"slug": "macrogoal"` (lowercase, no spaces)
- [ ] `"scheme": "macrogoal"` (lowercase, no spaces)
- [ ] `"bundleIdentifier": "com.robertojose17.macrogoal"` (iOS section)
- [ ] `"appleTeamId": "RQ6JHH38HA"` (iOS section)
- [ ] `"usesStoreKit2": true` (iOS section)
- [ ] `"package": "com.robertojose17.macrogoal"` (Android section)

### 2. eas.json
Open `eas.json` and verify ALL THREE build profiles have:

**Development Profile**:
- [ ] `"appleTeamId": "RQ6JHH38HA"`
- [ ] `"appleId": "rivera76115@gmail.com"`
- [ ] `"ascAppId": "6755788871"`
- [ ] `"ascApiKeyPath": "./credentials.json"`

**Preview Profile**:
- [ ] `"appleTeamId": "RQ6JHH38HA"`
- [ ] `"appleId": "rivera76115@gmail.com"`
- [ ] `"ascAppId": "6755788871"`
- [ ] `"ascApiKeyPath": "./credentials.json"`

**Production Profile**:
- [ ] `"appleTeamId": "RQ6JHH38HA"`
- [ ] `"appleId": "rivera76115@gmail.com"`
- [ ] `"ascAppId": "6755788871"`
- [ ] `"ascApiKeyPath": "./credentials.json"`

**Submit Profile**:
- [ ] `"appleId": "rivera76115@gmail.com"`
- [ ] `"ascAppId": "6755788871"`
- [ ] `"appleTeamId": "RQ6JHH38HA"`
- [ ] `"ascApiKeyPath": "./credentials.json"`

### 3. config/iapConfig.ts
Open `config/iapConfig.ts` and verify:
- [ ] `monthly: 'Monthly_MG'`
- [ ] `yearly: 'Yearly_MG'`
- [ ] `bundleId: 'com.robertojose17.macrogoal'`
- [ ] `appleId: '6755788871'`
- [ ] `appleTeamId: 'RQ6JHH38HA'`
- [ ] `scheme: 'macrogoal'`

### 4. credentials.json
Open `credentials.json` and verify:
- [ ] `"keyId": "CVYBYP624P"`
- [ ] `"issuerId": "4b32a345-b13e-4b90-8d4d-571bb896e1f3"`
- [ ] `"appleTeamId": "RQ6JHH38HA"`
- [ ] `"appleId": "rivera76115@gmail.com"`
- [ ] `"keyP8"` contains the full private key (starts with `-----BEGIN PRIVATE KEY-----`)

## ✅ App Store Connect Verification

Log into App Store Connect and verify:

### App Information
- [ ] Bundle ID is `com.robertojose17.macrogoal`
- [ ] App ID is `6755788871`
- [ ] Team ID is `RQ6JHH38HA`

### In-App Purchases
- [ ] Product ID `Monthly_MG` exists
- [ ] Product ID `Yearly_MG` exists
- [ ] Both products are "Ready to Submit" or "Approved"
- [ ] Both products are configured as Auto-Renewable Subscriptions

### API Keys
- [ ] API Key with ID `CVYBYP624P` exists
- [ ] Issuer ID is `4b32a345-b13e-4b90-8d4d-571bb896e1f3`
- [ ] API Key has "App Manager" access or higher

## ✅ Common Issues Resolved

### Issue 1: "Skipping Provisioning Profile validation"
**Status**: ✅ FIXED
- All EAS build profiles now have complete Apple credentials
- Next build should authenticate successfully

### Issue 2: Invalid URL Scheme
**Status**: ✅ FIXED
- Changed from `"Macro Goal"` to `"macrogoal"`
- Apple validation should now pass

### Issue 3: Invalid App Slug
**Status**: ✅ FIXED
- Changed from `"Macro Goal"` to `"macrogoal"`
- Expo routing should work correctly

### Issue 4: StoreKit Not Enabled
**Status**: ✅ FIXED
- Added `"usesStoreKit2": true` to app.json
- IAP should connect properly

## ✅ Testing Checklist

### Before Testing
- [ ] Build the app with EAS (development, preview, or production)
- [ ] Install on a real iOS device (NOT Simulator)
- [ ] Sign in with a Sandbox Apple ID in Settings > App Store

### During Testing
- [ ] App launches without errors
- [ ] Deep link `macrogoal://` opens the app
- [ ] Navigate to Profile/Settings
- [ ] Tap "Upgrade to Premium"
- [ ] Verify products load (Monthly_MG, Yearly_MG)
- [ ] Check diagnostics if products don't load
- [ ] Attempt a test purchase
- [ ] Verify purchase completes successfully

### After Testing
- [ ] Check Supabase `subscriptions` table for new entry
- [ ] Verify subscription status is "active"
- [ ] Test "Restore Purchases" button
- [ ] Verify app shows "Premium Active" badge

## 🚨 If Issues Persist

If you still see errors after these fixes:

1. **Check Diagnostics**:
   - Open the Subscription modal
   - Tap "Show Diagnostics"
   - Look for specific error messages

2. **Common Error Messages**:
   - "Product not found" → Verify product IDs in App Store Connect
   - "Authentication failed" → Verify API credentials
   - "Store not connected" → Ensure testing on real device, not Simulator
   - "No products returned" → Check product status in App Store Connect

3. **Verify Environment**:
   - [ ] Testing on real iOS device (NOT Simulator)
   - [ ] Signed in with Sandbox Apple ID
   - [ ] Products are "Ready to Submit" in App Store Connect
   - [ ] Bundle ID matches exactly

## ✅ Final Verification

All configuration values should match:

```
Bundle ID:     com.robertojose17.macrogoal
URL Scheme:    macrogoal
App Slug:      macrogoal
Team ID:       RQ6JHH38HA
ASC App ID:    6755788871
Apple ID:      rivera76115@gmail.com
Key ID:        CVYBYP624P
Issuer ID:     4b32a345-b13e-4b90-8d4d-571bb896e1f3
Product IDs:   Monthly_MG, Yearly_MG
```

---

**Status**: ✅ All configuration issues resolved
**Next Step**: Build and test on a real iOS device
