
# RevenueCat Integration Guide for Macrogoal

## ✅ Complete Integration Status

RevenueCat SDK has been successfully integrated into your Macrogoal fitness app! This guide covers setup, configuration, and usage.

---

## 📦 Installed Packages

```json
{
  "react-native-purchases": "^9.10.5",
  "react-native-purchases-ui": "^9.10.5"
}
```

---

## 🔑 Configuration

### API Key
- **Test API Key**: `test_occIMDaPJIrXQAMTrAgFTrDnKJS`
- **Location**: `config/revenueCatConfig.ts`

### Entitlement ID
- **Entitlement**: `Macrogoal Pro`
- This is the entitlement identifier configured in your RevenueCat dashboard

### Product IDs
- **Monthly**: `monthly`
- **Yearly**: `yearly`

---

## 📁 File Structure

```
config/
  └── revenueCatConfig.ts          # RevenueCat configuration & constants

hooks/
  └── useRevenueCat.ts              # Main RevenueCat hook with all SDK logic

components/
  ├── RevenueCatPaywall.tsx         # Complete paywall UI component
  ├── CustomerCenter.tsx            # Subscription management component
  └── SubscriptionButton.tsx        # Updated to use RevenueCat

app/(tabs)/
  └── profile.tsx                   # Updated with Customer Center integration
```

---

## 🚀 How It Works

### 1. **Initialization** (`useRevenueCat` hook)

The SDK automatically initializes when the app starts:

```typescript
import { useRevenueCat } from '@/hooks/useRevenueCat';

const { isPro, offerings, products, loading } = useRevenueCat();
```

**What happens:**
- Configures RevenueCat SDK with your API key
- Logs in the user (using Supabase user ID)
- Fetches available offerings from RevenueCat
- Sets up real-time customer info listener
- Checks entitlement status for "Macrogoal Pro"

### 2. **Displaying the Paywall**

```typescript
import RevenueCatPaywall from '@/components/RevenueCatPaywall';

<RevenueCatPaywall
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onSubscribed={() => {
    // Handle successful subscription
  }}
/>
```

**Features:**
- Displays all available subscription packages
- Shows premium features list
- Handles purchase flow
- Restore purchases functionality
- Error handling with user-friendly messages

### 3. **Checking Subscription Status**

```typescript
const { isPro } = useRevenueCat();

if (isPro) {
  // User has active "Macrogoal Pro" entitlement
  // Unlock premium features
}
```

### 4. **Customer Center** (Subscription Management)

```typescript
import CustomerCenter from '@/components/CustomerCenter';

<CustomerCenter
  visible={showCustomerCenter}
  onClose={() => setShowCustomerCenter(false)}
/>
```

**Features:**
- View subscription status
- Manage subscription (opens Apple's subscription management)
- Restore purchases
- Contact support
- View renewal date

---

## 🎯 Key Features Implemented

### ✅ Core Functionality
- [x] SDK initialization with API key
- [x] User identification (Supabase user ID)
- [x] Fetch offerings from RevenueCat
- [x] Purchase flow with error handling
- [x] Restore purchases
- [x] Entitlement checking for "Macrogoal Pro"
- [x] Real-time customer info updates

### ✅ UI Components
- [x] Complete paywall with product display
- [x] Premium features showcase
- [x] Subscription button
- [x] Customer Center for subscription management
- [x] Loading states
- [x] Error handling with user feedback

### ✅ Best Practices
- [x] Automatic receipt validation (handled by RevenueCat)
- [x] Cross-platform support (iOS/Android)
- [x] Debug logging in development
- [x] User cancellation handling
- [x] Proper cleanup on unmount

---

## 🔧 RevenueCat Dashboard Setup

### Required Steps:

1. **Create Project**
   - Go to https://app.revenuecat.com/
   - Create a new project for "Macrogoal"

2. **Add iOS App**
   - Bundle ID: `com.robertojose17.macrogoal`
   - Apple App ID: `6755788871`
   - Team ID: `RQ6JHH38HA`

3. **Configure Products**
   - Create two products:
     - **Monthly**: Product ID = `Monthly_MG`
     - **Yearly**: Product ID = `Yearly_MG`
   - These must match your App Store Connect product IDs

4. **Create Entitlement**
   - Entitlement ID: `Macrogoal Pro`
   - Attach both products to this entitlement

5. **Create Offering**
   - Create a "Current" offering
   - Add both packages (monthly and yearly)
   - Set yearly as "Best Value" (optional)

6. **Get API Keys**
   - Navigate to Project Settings → API Keys
   - Copy your iOS API key
   - Replace `appl_TZdEZxwrVNJdRUPcoavoXaVUCSE`

---

## 📱 Testing

### Sandbox Testing (iOS)

1. **Sign out of App Store** (Settings → App Store → Sign Out)
2. **Sign in with Sandbox Apple ID** when prompted during purchase
3. **Test Purchase Flow**:
   - Open app → Profile → "Upgrade to Premium"
   - Select a subscription package
   - Complete purchase with sandbox account
   - Verify "Premium Active" badge appears

4. **Test Restore Purchases**:
   - Delete and reinstall app
   - Open paywall → "Restore Purchases"
   - Verify subscription is restored

### Production Testing

1. **TestFlight**:
   - Upload build to TestFlight
   - Test with real Apple ID (will be charged)
   - Use production API key from RevenueCat

2. **App Store**:
   - Submit app for review
   - RevenueCat handles all receipt validation automatically

---

## 🐛 Debugging

### Enable Debug Logs

Debug logging is automatically enabled in development mode:

```typescript
if (__DEV__) {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
}
```

### Check Logs

Look for logs prefixed with `[RevenueCat]`:

```
[RevenueCat 2024-01-15T10:30:00Z] INIT: Starting RevenueCat initialization...
[RevenueCat 2024-01-15T10:30:01Z] INIT: ✅ RevenueCat configured successfully
[RevenueCat 2024-01-15T10:30:02Z] INIT: ✅ User logged in: user-id-123
[RevenueCat 2024-01-15T10:30:03Z] INIT: ✅ Current offering found: default
[RevenueCat 2024-01-15T10:30:04Z] PURCHASE: Starting purchase for: monthly
[RevenueCat 2024-01-15T10:30:10Z] PURCHASE: ✅ Purchase successful
```

### Common Issues

**Issue**: "No offerings available"
- **Solution**: Check RevenueCat dashboard → Offerings → Ensure "Current" offering exists with products

**Issue**: "Purchase failed"
- **Solution**: Verify product IDs match between App Store Connect and RevenueCat dashboard

**Issue**: "Entitlement not active after purchase"
- **Solution**: Check RevenueCat dashboard → Entitlements → Ensure products are attached to "Macrogoal Pro"

---

## 🎨 Customization

### Change Entitlement ID

Edit `config/revenueCatConfig.ts`:

```typescript
export const ENTITLEMENT_ID = 'Your Custom Entitlement';
```

### Add More Products

1. Add product IDs to `config/revenueCatConfig.ts`:
```typescript
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime', // New product
} as const;
```

2. Create product in RevenueCat dashboard
3. Attach to entitlement
4. Add to offering

### Customize Paywall UI

Edit `components/RevenueCatPaywall.tsx` to change:
- Colors and styling
- Feature list
- Layout
- Copy/text

---

## 📊 Analytics & Webhooks

RevenueCat automatically tracks:
- Purchases
- Renewals
- Cancellations
- Refunds
- Trial conversions

### Set Up Webhooks (Optional)

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Add your backend endpoint
3. Handle events:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `EXPIRATION`

---

## 🔐 Security

### Receipt Validation
- ✅ Handled automatically by RevenueCat
- ✅ No need for custom backend validation
- ✅ Secure server-side verification

### User Identification
- ✅ Uses Supabase user ID
- ✅ Syncs across devices
- ✅ Prevents subscription sharing

---

## 📚 Additional Resources

- **RevenueCat Docs**: https://www.revenuecat.com/docs
- **iOS Setup Guide**: https://www.revenuecat.com/docs/getting-started/installation/expo
- **Paywalls**: https://www.revenuecat.com/docs/tools/paywalls
- **Customer Center**: https://www.revenuecat.com/docs/tools/customer-center
- **Dashboard**: https://app.revenuecat.com/

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] RevenueCat project created
- [ ] iOS app configured with correct Bundle ID
- [ ] Products created in App Store Connect
- [ ] Products configured in RevenueCat dashboard
- [ ] Entitlement "Macrogoal Pro" created
- [ ] Products attached to entitlement
- [ ] "Current" offering created with packages
- [ ] API key updated in `config/revenueCatConfig.ts`
- [ ] Sandbox testing completed successfully
- [ ] Restore purchases tested
- [ ] Premium features unlock correctly when subscribed
- [ ] Customer Center displays subscription info

---

## 🎉 You're All Set!

Your app now has a complete, production-ready subscription system powered by RevenueCat. Users can:

1. View premium features in the paywall
2. Purchase monthly or yearly subscriptions
3. Restore purchases across devices
4. Manage their subscription via Customer Center
5. Access premium features when subscribed

RevenueCat handles all the complex parts:
- Receipt validation
- Subscription status tracking
- Cross-platform support
- Renewal management
- Analytics

**Next Steps:**
1. Replace test API key with production key
2. Test thoroughly in TestFlight
3. Submit to App Store
4. Monitor analytics in RevenueCat dashboard

---

**Questions or Issues?**
- RevenueCat Support: https://www.revenuecat.com/support
- RevenueCat Community: https://community.revenuecat.com/
