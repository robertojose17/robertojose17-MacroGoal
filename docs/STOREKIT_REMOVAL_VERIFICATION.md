
# 🔍 StoreKit Removal Verification

## Quick Verification Commands

Run these commands to verify all StoreKit code has been removed or deprecated:

### 1. Search for StoreKit Imports

```bash
# Should return NO results (except in deprecated stubs)
grep -r "import.*StoreKit" . --exclude-dir=node_modules --exclude-dir=.git

# Should return NO results
grep -r "from 'expo-in-app-purchases'" . --exclude-dir=node_modules --exclude-dir=.git

# Should return NO results (except in deprecated stubs)
grep -r "InAppPurchases\." . --exclude-dir=node_modules --exclude-dir=.git
```

### 2. Search for StoreKit Types

```bash
# Should return NO results
grep -r "SKProduct" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "SKPayment" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "Transaction\." . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md"
```

### 3. Search for Receipt Validation

```bash
# Should return NO results (except in deprecated function)
grep -r "verifyReceipt" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "verify-apple-receipt" . --exclude-dir=node_modules --exclude-dir=.git
```

### 4. Verify RevenueCat Usage

```bash
# Should return MULTIPLE results (all files using RevenueCat)
grep -r "useRevenueCat" . --exclude-dir=node_modules --exclude-dir=.git

# Should return results in config file
grep -r "REVENUECAT_API_KEY" . --exclude-dir=node_modules --exclude-dir=.git

# Should return results in components
grep -r "react-native-purchases" . --exclude-dir=node_modules --exclude-dir=.git
```

---

## Expected Results

### ✅ Files That Should Use RevenueCat

- `hooks/useRevenueCat.ts` ✅
- `components/RevenueCatPaywall.tsx` ✅
- `components/SubscriptionButton.tsx` ✅
- `components/CustomerCenter.tsx` ✅
- `app/(tabs)/profile.tsx` ✅
- `app/(tabs)/profile.ios.tsx` ✅
- `config/revenueCatConfig.ts` ✅

### ⚠️ Deprecated Files (Stubs Only)

- `hooks/useSubscription.ios.ts` - Redirects to `useRevenueCat`
- `hooks/useSubscription.ts` - Redirects to `useRevenueCat`
- `config/iapConfig.ts` - Redirects to `revenueCatConfig`
- `supabase/functions/verify-apple-receipt/index.ts` - Returns 410 Gone

### ❌ Files That Should NOT Exist (Future Cleanup)

Once all imports are migrated, these files can be deleted:
- `hooks/useSubscription.ios.ts`
- `hooks/useSubscription.ts`
- `config/iapConfig.ts`
- `supabase/functions/verify-apple-receipt/`

---

## Manual Verification Steps

### 1. Check Profile Screen

**File:** `app/(tabs)/profile.tsx`

```typescript
// ✅ CORRECT - Should import useRevenueCat
import { useRevenueCat } from '@/hooks/useRevenueCat';

const { isPro } = useRevenueCat();

// ❌ WRONG - Should NOT import useSubscription
// import { useSubscription } from '@/hooks/useSubscription';
```

### 2. Check Subscription Button

**File:** `components/SubscriptionButton.tsx`

```typescript
// ✅ CORRECT
import { useRevenueCat } from '@/hooks/useRevenueCat';

// ❌ WRONG
// import { useSubscription } from '@/hooks/useSubscription';
```

### 3. Check Package.json

**File:** `package.json`

```json
{
  "dependencies": {
    // ✅ CORRECT - RevenueCat packages
    "react-native-purchases": "^9.10.5",
    "react-native-purchases-ui": "^9.10.5",
    
    // ⚠️ CAN BE REMOVED (but kept for now to avoid breaking builds)
    "expo-in-app-purchases": "^14.5.0"
  }
}
```

**Note:** `expo-in-app-purchases` is still in package.json but is NOT imported anywhere in the code. It can be safely removed once you verify the app builds successfully without it.

### 4. Check App Configuration

**File:** `app.json`

```json
{
  "expo": {
    "ios": {
      // ✅ CORRECT - StoreKit 2 enabled for RevenueCat
      "usesStoreKit2": true,
      "bundleIdentifier": "com.robertojose17.macrogoal"
    }
  }
}
```

---

## Build Verification

### iOS Build

```bash
# Build for iOS
eas build --platform ios --profile production

# Expected: Build succeeds with RevenueCat SDK
# Expected: No StoreKit 1 warnings
# Expected: StoreKit 2 enabled
```

### Test on Device

1. Install build on physical device
2. Open Profile screen
3. Tap "Upgrade to Premium"
4. Verify paywall shows RevenueCat offerings
5. Complete sandbox purchase
6. Verify "Premium Active" badge appears

---

## CI/CD Check (Optional)

Add this to your CI pipeline to prevent StoreKit code from being reintroduced:

```yaml
# .github/workflows/verify-no-storekit.yml
name: Verify No StoreKit Code

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Check for StoreKit imports
        run: |
          if grep -r "import.*StoreKit" . --exclude-dir=node_modules --exclude-dir=.git; then
            echo "ERROR: StoreKit imports found!"
            exit 1
          fi
          
      - name: Check for expo-in-app-purchases usage
        run: |
          if grep -r "from 'expo-in-app-purchases'" . --exclude-dir=node_modules --exclude-dir=.git; then
            echo "ERROR: expo-in-app-purchases usage found!"
            exit 1
          fi
          
      - name: Verify RevenueCat usage
        run: |
          if ! grep -r "useRevenueCat" . --exclude-dir=node_modules --exclude-dir=.git; then
            echo "ERROR: No RevenueCat usage found!"
            exit 1
          fi
          
      - name: Success
        run: echo "✅ No StoreKit code found. RevenueCat is properly integrated."
```

---

## Final Checklist

- [ ] Run all verification commands above
- [ ] Verify no StoreKit imports (except in deprecated stubs)
- [ ] Verify all screens use `useRevenueCat`
- [ ] Verify RevenueCat API key is configured
- [ ] Test sandbox purchase flow
- [ ] Test restore purchases
- [ ] Verify entitlement activation
- [ ] Check RevenueCat dashboard for transactions
- [ ] (Optional) Set up CI/CD verification
- [ ] (Future) Remove deprecated files
- [ ] (Future) Remove `expo-in-app-purchases` from package.json

---

## 🎉 Verification Complete

If all checks pass, your app is successfully migrated to RevenueCat with NO remaining StoreKit code!
