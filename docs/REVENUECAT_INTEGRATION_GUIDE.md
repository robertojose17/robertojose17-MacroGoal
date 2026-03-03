
# RevenueCat Integration Guide

## Overview

This guide provides step-by-step instructions for integrating RevenueCat into the Macro Goal app when the feature becomes available on the Natively platform.

## Prerequisites

- [ ] RevenueCat account created at https://app.revenuecat.com/
- [ ] Access to App Store Connect (iOS)
- [ ] Access to Google Play Console (Android - future)
- [ ] Natively platform has RevenueCat support enabled

## Step 1: RevenueCat Dashboard Setup

### 1.1 Create Project
1. Log in to RevenueCat dashboard
2. Click "Create New Project"
3. Name: "Macro Goal" or "Elite Macro Tracker"
4. Select currency: USD (or your preferred currency)

### 1.2 Add iOS App
1. Go to Project Settings → Apps
2. Click "Add App" → iOS
3. Enter details:
   - **App Name**: Macro Goal
   - **Bundle ID**: `com.robertojose17.macrogoal`
   - **App Store Connect App ID**: `6755788871`
4. Upload App Store Connect API Key (from `credentials.json`)
5. Save configuration

### 1.3 Add Android App (Future)
1. Go to Project Settings → Apps
2. Click "Add App" → Android
3. Enter details:
   - **App Name**: Macro Goal
   - **Package Name**: `com.robertojose17.macrogoal`
4. Upload Google Play Service Account JSON
5. Save configuration

### 1.4 Configure Products
1. Go to Products → Add Product
2. Add Monthly Subscription:
   - **Product ID**: `Monthly_MG`
   - **Type**: Subscription
   - **Duration**: 1 month
3. Add Yearly Subscription:
   - **Product ID**: `Yearly_MG`
   - **Type**: Subscription
   - **Duration**: 1 year

### 1.5 Create Entitlement
1. Go to Entitlements → Add Entitlement
2. Create "premium" entitlement
3. Attach both products to this entitlement

### 1.6 Get API Keys
1. Go to Project Settings → API Keys
2. Copy iOS API Key
3. Copy Android API Key (when ready)
4. Save these securely

## Step 2: Environment Configuration

### 2.1 Create .env File
Create `.env` file in project root:

```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxxxx

# App Configuration
EXPO_PUBLIC_APP_BUNDLE_ID=com.robertojose17.macrogoal
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=premium
```

### 2.2 Update .gitignore
Ensure `.env` is in `.gitignore`:

```
.env
.env.local
.env.*.local
```

## Step 3: Install Dependencies

```bash
npm install react-native-purchases
```

## Step 4: Code Migration

### 4.1 Update RevenueCat Config
Edit `config/revenueCatConfig.ts`:

```typescript
import { Platform } from 'react-native';

export const REVENUECAT_CONFIG = {
  apiKey: Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  }),
  entitlementId: 'premium',
  // ... rest of config
};
```

### 4.2 Implement useRevenueCat Hook
Uncomment and complete the implementation in `hooks/useRevenueCat.ts`.

### 4.3 Update SubscriptionButton
Modify `components/SubscriptionButton.tsx` to use `useRevenueCat` instead of `useSubscription`:

```typescript
import { useRevenueCat } from '@/hooks/useRevenueCat';

export default function SubscriptionButton() {
  const { products, purchaseProduct, restorePurchases, isSubscribed, loading } = useRevenueCat();
  // ... rest of component
}
```

### 4.4 Update Profile Screens
Update both `app/(tabs)/profile.ios.tsx` and `app/(tabs)/profile.tsx` to use the new hook.

## Step 5: Database Migration

### 5.1 Update Subscriptions Table
Run this migration to simplify the subscriptions table:

```sql
-- Add RevenueCat subscriber ID column
ALTER TABLE subscriptions 
ADD COLUMN revenuecat_subscriber_id TEXT;

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_revenuecat_id 
ON subscriptions(revenuecat_subscriber_id);

-- Optional: Remove Apple-specific columns if no longer needed
-- ALTER TABLE subscriptions DROP COLUMN apple_transaction_id;
-- ALTER TABLE subscriptions DROP COLUMN apple_original_transaction_id;
-- ALTER TABLE subscriptions DROP COLUMN apple_product_id;
-- ALTER TABLE subscriptions DROP COLUMN apple_receipt_data;
```

### 5.2 Create Webhook Handler
Create a new Supabase Edge Function for RevenueCat webhooks:

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const event = await req.json();
    
    // Verify webhook signature
    // TODO: Implement signature verification
    
    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Update subscription status to active
        break;
      case 'CANCELLATION':
        // Mark subscription as cancelled
        break;
      case 'EXPIRATION':
        // Mark subscription as expired
        break;
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 5.3 Configure Webhook in RevenueCat
1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/revenuecat-webhook`
3. Select events to receive
4. Save configuration

## Step 6: Testing

### 6.1 iOS Sandbox Testing
1. Sign out of App Store on device
2. Go to Settings → App Store → Sandbox Account
3. Sign in with sandbox Apple ID
4. Launch app and test purchase flow

### 6.2 Test Scenarios
- [ ] New subscription purchase (monthly)
- [ ] New subscription purchase (yearly)
- [ ] Restore purchases
- [ ] Subscription renewal (wait 5 minutes in sandbox)
- [ ] Subscription cancellation
- [ ] Cross-device sync

### 6.3 Verify in RevenueCat Dashboard
1. Go to Customers tab
2. Find test user
3. Verify subscription status
4. Check transaction history

## Step 7: Cleanup

### 7.1 Remove Old IAP Files
Once RevenueCat is working:

```bash
# Remove old hooks
rm hooks/useSubscription.ios.ts
rm hooks/useSubscription.ts

# Remove old config
rm config/iapConfig.ts

# Remove receipt validation function
rm supabase/functions/verify-apple-receipt/index.ts
```

### 7.2 Remove expo-in-app-purchases
```bash
npm uninstall expo-in-app-purchases
```

### 7.3 Update app.json
Remove StoreKit 2 configuration (no longer needed):

```json
{
  "expo": {
    "ios": {
      // Remove this line:
      // "usesStoreKit2": true
    }
  }
}
```

## Step 8: Production Deployment

### 8.1 Update Environment Variables
Add production RevenueCat API keys to your deployment environment.

### 8.2 Submit to App Store
1. Build production app with EAS
2. Submit to App Store Connect
3. Wait for review approval

### 8.3 Monitor RevenueCat Dashboard
1. Watch for real purchases
2. Monitor subscription metrics
3. Check for errors or issues

## Troubleshooting

### Issue: "Invalid API Key"
**Solution**: Verify API keys in `.env` match RevenueCat dashboard.

### Issue: "Product not found"
**Solution**: Ensure product IDs in code match App Store Connect and RevenueCat.

### Issue: "Purchase failed"
**Solution**: Check device is signed in with sandbox account (testing) or real account (production).

### Issue: "Subscription status not updating"
**Solution**: Verify webhook is configured and receiving events in RevenueCat dashboard.

## Support Resources

- **RevenueCat Docs**: https://docs.revenuecat.com/
- **React Native SDK**: https://docs.revenuecat.com/docs/reactnative
- **Community Forum**: https://community.revenuecat.com/
- **Support Email**: support@revenuecat.com

## Rollback Plan

If issues occur:
1. Revert to previous commit with `expo-in-app-purchases`
2. Redeploy app
3. Investigate issues
4. Retry migration when resolved

## Success Criteria

- [ ] Users can purchase subscriptions on iOS
- [ ] Users can purchase subscriptions on Android
- [ ] Subscription status syncs across devices
- [ ] Webhooks update database correctly
- [ ] Analytics visible in RevenueCat dashboard
- [ ] No crashes or errors in production
- [ ] Revenue tracking accurate

## Timeline

- **Setup**: 2-3 hours
- **Development**: 1-2 days
- **Testing**: 2-3 days
- **Deployment**: 1 day
- **Total**: ~1 week

## Notes

- Keep existing implementation until RevenueCat is fully tested
- Test thoroughly in sandbox before production
- Monitor closely after production deployment
- Document any issues for future reference
