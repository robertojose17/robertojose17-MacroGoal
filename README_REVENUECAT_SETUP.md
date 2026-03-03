
# RevenueCat Integration Setup Guide

## ✅ Implementation Complete

The RevenueCat integration for monthly and yearly subscriptions has been successfully implemented in your Macro Goal app. This guide will help you configure everything to connect with the Apple App Store.

## 📦 What's Been Implemented

### 1. **Core Files Created**
- `config/revenueCatConfig.ts` - Configuration file with API keys and product IDs
- `hooks/useRevenueCat.ts` - Custom React hook for all RevenueCat functionality
- `components/RevenueCatPaywall.tsx` - Beautiful paywall UI for subscription purchase
- `components/SubscriptionButton.tsx` - Smart button that shows Pro status or upgrade option
- `components/CustomerCenter.tsx` - Subscription management screen

### 2. **Features Implemented**
- ✅ Monthly and Yearly subscription plans
- ✅ Automatic subscription status detection
- ✅ Purchase flow with Apple In-App Purchase
- ✅ Restore purchases functionality
- ✅ Pro member badge and status display
- ✅ Subscription management (redirects to App Store)
- ✅ Real-time entitlement updates
- ✅ Beautiful, native-feeling UI
- ✅ Dark mode support
- ✅ Error handling and user feedback

### 3. **Integration Points**
- Profile screen now shows subscription button
- Pro status is available throughout the app via `useRevenueCat()` hook
- Paywall can be triggered from anywhere in the app

## 🚀 Setup Instructions

### Step 1: App Store Connect Configuration

1. **Create In-App Purchase Products**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app
   - Go to "Features" → "In-App Purchases"
   - Click "+" to create new products

2. **Create Subscription Group**
   - Name: "Macrogoal Pro Subscriptions" (or your choice)
   - Click "Create"

3. **Add Monthly Subscription**
   - Type: Auto-Renewable Subscription
   - Reference Name: "Macrogoal Pro Monthly"
   - Product ID: `monthly` (must match `config/revenueCatConfig.ts`)
   - Subscription Group: Select the group you created
   - Subscription Duration: 1 Month
   - Price: Set your price (e.g., $9.99/month)
   - Localization: Add display name and description

4. **Add Yearly Subscription**
   - Type: Auto-Renewable Subscription
   - Reference Name: "Macrogoal Pro Yearly"
   - Product ID: `yearly` (must match `config/revenueCatConfig.ts`)
   - Subscription Group: Same group as monthly
   - Subscription Duration: 1 Year
   - Price: Set your price (e.g., $79.99/year)
   - Localization: Add display name and description

5. **Submit for Review**
   - Fill in all required metadata
   - Add screenshots if needed
   - Submit products for review

### Step 2: RevenueCat Dashboard Configuration

1. **Create RevenueCat Account**
   - Go to [RevenueCat](https://app.revenuecat.com)
   - Sign up or log in
   - Create a new project

2. **Add iOS App**
   - Go to "Apps" → "Add App"
   - Platform: iOS
   - Bundle ID: `com.robertojose17.macrogoal` (from your app.json)
   - App Name: "Macro Goal"

3. **Configure App Store Connect**
   - Go to "App Settings" → "Apple App Store"
   - Add your App Store Connect credentials:
     - Issuer ID
     - Key ID
     - Private Key (.p8 file)
   - Follow RevenueCat's guide: https://www.revenuecat.com/docs/itunesconnect-app-specific-shared-secret

4. **Create Products**
   - Go to "Products" → "Add Product"
   - Add Monthly Product:
     - Identifier: `monthly`
     - Type: Subscription
     - Store: App Store
     - Store Product ID: `monthly` (must match App Store Connect)
   - Add Yearly Product:
     - Identifier: `yearly`
     - Type: Subscription
     - Store: App Store
     - Store Product ID: `yearly` (must match App Store Connect)

5. **Create Entitlement**
   - Go to "Entitlements" → "Add Entitlement"
   - Identifier: `Macrogoal Pro` (must match `config/revenueCatConfig.ts`)
   - Description: "Access to all premium features"

6. **Create Offering**
   - Go to "Offerings" → "Add Offering"
   - Identifier: `default`
   - Mark as "Current Offering"
   - Add Packages:
     - Package 1: Monthly (`monthly` product)
     - Package 2: Yearly (`yearly` product)
   - Attach to Entitlement: `Macrogoal Pro`

7. **Get API Key**
   - Go to "API Keys"
   - Copy the **Public SDK Key** (starts with `appl_...`)
   - ⚠️ **IMPORTANT**: Only use the PUBLIC key in your app, never the secret key!

### Step 3: Update Your App Configuration

1. **Update RevenueCat API Key**
   - Open `config/revenueCatConfig.ts`
   - Replace the `apiKey` with your actual PUBLIC SDK KEY from RevenueCat
   ```typescript
   apiKey: 'appl_YOUR_ACTUAL_KEY_HERE',
   ```

2. **Verify Product IDs Match**
   - Ensure product IDs in `config/revenueCatConfig.ts` match:
     - App Store Connect product IDs
     - RevenueCat product identifiers
   ```typescript
   products: {
     monthly: 'monthly',  // Must match everywhere
     yearly: 'yearly',    // Must match everywhere
   },
   ```

3. **Verify Entitlement ID**
   - Ensure `entitlementId` in `config/revenueCatConfig.ts` matches RevenueCat Dashboard
   ```typescript
   entitlementId: 'Macrogoal Pro',  // Must match RevenueCat
   ```

### Step 4: Testing

1. **Create Sandbox Test Account**
   - Go to App Store Connect → "Users and Access" → "Sandbox Testers"
   - Create a test account with a unique email
   - ⚠️ Use this account ONLY for testing, never for real purchases

2. **Test on Device**
   - Build and install your app on a physical iOS device
   - Sign out of your real Apple ID in Settings → App Store
   - Launch your app
   - Tap "Upgrade to Pro" button
   - Sign in with your sandbox test account when prompted
   - Complete the purchase flow
   - Verify Pro status is activated

3. **Test Restore Purchases**
   - Delete and reinstall the app
   - Tap "Restore Purchases"
   - Verify Pro status is restored

4. **Test Subscription Management**
   - Tap "Manage Subscription" (when Pro)
   - Verify it opens App Store subscriptions page

## 🎯 How to Use in Your App

### Check Pro Status Anywhere

```typescript
import { useRevenueCat } from '@/hooks/useRevenueCat';

function MyComponent() {
  const { isPro, isLoading } = useRevenueCat();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (isPro) {
    return <PremiumFeature />;
  }

  return <UpgradePrompt />;
}
```

### Show Paywall

```typescript
import RevenueCatPaywall from '@/components/RevenueCatPaywall';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <Button onPress={() => setShowPaywall(true)}>
        Upgrade to Pro
      </Button>
      <RevenueCatPaywall 
        visible={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </>
  );
}
```

### Use Subscription Button

```typescript
import SubscriptionButton from '@/components/SubscriptionButton';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <SubscriptionButton onPress={() => setShowPaywall(true)} />
  );
}
```

## 🔒 Security Best Practices

1. **Never expose secret API keys**
   - Only use the PUBLIC SDK KEY in your app
   - Secret keys should only be used on your backend

2. **Validate purchases server-side**
   - RevenueCat handles this automatically
   - They validate receipts with Apple on their servers

3. **Use proper entitlement checks**
   - Always check `isPro` status before showing premium features
   - Don't rely on client-side checks alone

## 📱 App Store Review Guidelines

1. **Restore Purchases Button**
   - ✅ Already implemented in the paywall
   - Required by Apple for all subscription apps

2. **Subscription Management**
   - ✅ Already implemented (redirects to App Store)
   - Users can manage/cancel subscriptions

3. **Clear Pricing**
   - ✅ Prices are fetched from App Store automatically
   - Shows monthly/yearly pricing clearly

4. **Terms and Privacy**
   - ✅ Links included in paywall
   - Update the URLs in `components/RevenueCatPaywall.tsx`:
   ```typescript
   const openTerms = () => {
     Linking.openURL('https://your-app-url.com/terms');
   };
   ```

## 🐛 Troubleshooting

### "No subscription plans available"
- Check RevenueCat Dashboard has a "Current" offering
- Verify products are linked to the offering
- Ensure product IDs match everywhere
- Check API key is correct

### Purchases not working
- Verify you're using a sandbox test account
- Check App Store Connect products are approved
- Ensure Bundle ID matches everywhere
- Check RevenueCat logs in dashboard

### Pro status not updating
- Check entitlement ID matches RevenueCat Dashboard
- Verify products are attached to the entitlement
- Check RevenueCat logs for errors

### Debug Logging
- Logs are enabled in development mode
- Check Xcode console for detailed RevenueCat logs
- Look for lines starting with `[RevenueCat]`

## 📚 Additional Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [In-App Purchase Best Practices](https://developer.apple.com/in-app-purchase/)
- [RevenueCat React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)

## ✨ Premium Features to Gate

Now that subscriptions are set up, you can gate these features behind the Pro subscription:

1. **Advanced Analytics** (Dashboard screen)
   ```typescript
   const { isPro } = useRevenueCat();
   if (!isPro) return <UpgradePrompt feature="Advanced Analytics" />;
   ```

2. **Custom Recipes** (My Meals)
3. **Habit Tracking** (Check-ins)
4. **Data Export** (Profile)
5. **Smart Suggestions** (AI Meal Estimator)
6. **Multiple Goal Phases** (Edit Goals)

## 🎉 You're All Set!

Your app now has a complete, production-ready subscription system powered by RevenueCat and Apple In-App Purchase. Users can subscribe monthly or yearly, manage their subscriptions, and restore purchases across devices.

**Next Steps:**
1. Update the API key in `config/revenueCatConfig.ts`
2. Configure products in App Store Connect
3. Set up RevenueCat Dashboard
4. Test with sandbox account
5. Submit for App Review

Good luck with your launch! 🚀
