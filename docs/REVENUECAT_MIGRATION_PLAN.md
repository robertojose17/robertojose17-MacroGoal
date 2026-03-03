
# RevenueCat Migration Plan

## Current State
The app currently uses `expo-in-app-purchases` with Apple StoreKit 2 for in-app purchases and subscriptions.

### Current Implementation Files:
- `hooks/useSubscription.ios.ts` - iOS subscription logic with StoreKit 2
- `hooks/useSubscription.ts` - Fallback for non-iOS platforms
- `components/SubscriptionButton.tsx` - UI for subscription purchase flow
- `config/iapConfig.ts` - Product IDs and configuration
- `supabase/functions/verify-apple-receipt/index.ts` - Server-side receipt validation

### Current Product IDs:
- Monthly: `Monthly_MG`
- Yearly: `Yearly_MG`

## RevenueCat Migration Strategy

### Phase 1: Preparation (Current)
✅ Document current implementation
✅ Create RevenueCat configuration placeholders
✅ Prepare migration hooks and components
✅ Keep existing implementation functional

### Phase 2: RevenueCat Integration (When Available)
1. Install RevenueCat SDK: `react-native-purchases`
2. Configure RevenueCat dashboard with existing product IDs
3. Replace `useSubscription` hooks with RevenueCat SDK
4. Update `SubscriptionButton` to use RevenueCat
5. Remove `expo-in-app-purchases` dependency
6. Remove custom receipt validation Edge Function

### Phase 3: Testing
1. Test subscription purchase flow
2. Test subscription restoration
3. Test subscription status checks
4. Verify cross-platform support (iOS/Android)
5. Test paywall UI/UX

### Phase 4: Cleanup
1. Remove old IAP files
2. Update documentation
3. Archive migration files

## Benefits of RevenueCat

### Current Pain Points (expo-in-app-purchases):
- Manual receipt validation required
- Complex StoreKit 2 connection management
- Platform-specific code (.ios.ts files)
- Manual subscription status tracking
- No built-in analytics
- No A/B testing for paywalls
- Android support requires separate implementation

### RevenueCat Advantages:
✅ Automatic receipt validation
✅ Cross-platform support (iOS + Android)
✅ Built-in subscription status management
✅ Real-time webhooks for subscription events
✅ Analytics dashboard
✅ A/B testing for paywalls
✅ Simplified SDK (less code to maintain)
✅ Automatic subscription renewal handling
✅ Grace period and billing retry support
✅ Promotional offers and intro pricing support

## Migration Checklist

### Pre-Migration
- [ ] RevenueCat account created
- [ ] App configured in RevenueCat dashboard
- [ ] Product IDs migrated to RevenueCat
- [ ] API keys obtained from RevenueCat
- [ ] Test environment configured

### During Migration
- [ ] Install `react-native-purchases` package
- [ ] Configure RevenueCat SDK in app initialization
- [ ] Replace `useSubscription.ios.ts` with RevenueCat hook
- [ ] Update `SubscriptionButton.tsx` to use RevenueCat
- [ ] Remove `expo-in-app-purchases` dependency
- [ ] Remove custom receipt validation function
- [ ] Update environment variables with RevenueCat keys

### Post-Migration
- [ ] Test subscription purchase on iOS
- [ ] Test subscription purchase on Android
- [ ] Test subscription restoration
- [ ] Test subscription status checks
- [ ] Verify webhook integration
- [ ] Monitor RevenueCat dashboard for events
- [ ] Remove old IAP code files

## Code Changes Required

### Files to Replace:
1. `hooks/useSubscription.ios.ts` → `hooks/useRevenueCat.ts`
2. `hooks/useSubscription.ts` → Remove (RevenueCat is cross-platform)
3. `components/SubscriptionButton.tsx` → Update to use RevenueCat
4. `config/iapConfig.ts` → `config/revenueCatConfig.ts`

### Files to Remove:
- `supabase/functions/verify-apple-receipt/index.ts`
- `supabase/migrations/20240102000000_add_apple_iap_fields.sql` (if no longer needed)

### New Files to Create:
- `hooks/useRevenueCat.ts` - RevenueCat SDK wrapper
- `config/revenueCatConfig.ts` - RevenueCat configuration
- `components/RevenueCatPaywall.tsx` - Optional: Use RevenueCat's paywall templates

## Environment Variables

### Current (expo-in-app-purchases):
```
# None required - uses Apple credentials from eas.json
```

### Future (RevenueCat):
```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key_here
```

## Database Changes

### Current Schema:
```sql
subscriptions (
  id uuid,
  user_id uuid,
  status text,
  plan_name text,
  apple_transaction_id text,
  apple_original_transaction_id text,
  apple_product_id text,
  apple_receipt_data text,
  expires_at timestamp,
  created_at timestamp,
  updated_at timestamp
)
```

### RevenueCat Schema (Simplified):
```sql
subscriptions (
  id uuid,
  user_id uuid,
  status text,
  plan_name text,
  revenuecat_subscriber_id text,
  expires_at timestamp,
  created_at timestamp,
  updated_at timestamp
)
```

RevenueCat handles all receipt/transaction data internally, so we only need to store:
- User mapping to RevenueCat subscriber ID
- Current subscription status
- Expiration date (synced via webhook)

## Testing Strategy

### Test Scenarios:
1. **New User Purchase**
   - User opens paywall
   - User selects monthly plan
   - User completes purchase
   - Subscription status updates immediately
   - Premium features unlock

2. **Subscription Restoration**
   - User reinstalls app
   - User taps "Restore Purchases"
   - Subscription status restored
   - Premium features unlock

3. **Subscription Renewal**
   - Subscription auto-renews
   - Webhook updates database
   - User maintains premium access

4. **Subscription Cancellation**
   - User cancels in App Store
   - Webhook updates database
   - User retains access until expiration
   - Premium features lock after expiration

5. **Cross-Platform**
   - User purchases on iOS
   - User logs in on Android
   - Subscription status syncs
   - Premium features available on both platforms

## Rollback Plan

If RevenueCat integration fails:
1. Revert to `expo-in-app-purchases` implementation
2. Restore old hook files from git history
3. Re-enable receipt validation Edge Function
4. Test existing subscription flow
5. Investigate issues before retry

## Timeline Estimate

- **Preparation**: 1 day (Current - Documentation)
- **Integration**: 2-3 days (SDK setup, code migration)
- **Testing**: 2-3 days (Comprehensive testing)
- **Cleanup**: 1 day (Remove old code)
- **Total**: ~1 week

## Support Resources

- RevenueCat Documentation: https://docs.revenuecat.com/
- RevenueCat React Native SDK: https://docs.revenuecat.com/docs/reactnative
- RevenueCat Dashboard: https://app.revenuecat.com/
- RevenueCat Community: https://community.revenuecat.com/

## Notes

- Keep existing implementation functional until RevenueCat is fully tested
- Maintain backward compatibility during migration
- Monitor both systems during transition period
- Document any issues encountered for future reference
