
import { useState, useEffect, useCallback } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import { REVENUECAT_CONFIG } from '@/config/revenueCatConfig';
import { supabase } from '@/lib/supabase/client';

export interface RevenueCatState {
  isPro: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useRevenueCat() {
  const [state, setState] = useState<RevenueCatState>({
    isPro: false,
    offerings: null,
    customerInfo: null,
    isLoading: true,
    error: null,
  });

  // Initialize RevenueCat SDK
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        console.log('[RevenueCat] 🚀 Initializing SDK...');
        
        // Enable debug logging in development
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          console.log('[RevenueCat] Debug logging enabled');
        }

        // Configure SDK with API key
        console.log('[RevenueCat] Configuring with API key:', REVENUECAT_CONFIG.apiKey.substring(0, 10) + '...');
        Purchases.configure({
          apiKey: REVENUECAT_CONFIG.apiKey,
        });
        console.log('[RevenueCat] ✅ SDK configured successfully');

        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[RevenueCat] Logging in user:', user.id);
          await Purchases.logIn(user.id);
          console.log('[RevenueCat] ✅ User logged in to RevenueCat');
        } else {
          console.log('[RevenueCat] ⚠️ No authenticated user, using anonymous ID');
        }

        // Fetch offerings
        console.log('[RevenueCat] Fetching offerings...');
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] Offerings fetched:', offerings);
        console.log('[RevenueCat] Current offering:', offerings.current);
        console.log('[RevenueCat] Available packages:', offerings.current?.availablePackages.length || 0);

        if (!offerings.current || offerings.current.availablePackages.length === 0) {
          console.warn('[RevenueCat] ⚠️ No offerings available. Check RevenueCat Dashboard:');
          console.warn('  1. Ensure you have a "Current" offering set');
          console.warn('  2. Ensure packages are linked to products');
          console.warn('  3. Ensure products exist in App Store Connect');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'No subscription plans available. Please check configuration.',
          }));
          return;
        }

        // Get customer info
        console.log('[RevenueCat] Fetching customer info...');
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info:', customerInfo);
        console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));

        const isPro = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;
        console.log(`[RevenueCat] User is ${isPro ? 'PRO ✨' : 'FREE'}`);

        setState({
          isPro,
          offerings,
          customerInfo,
          isLoading: false,
          error: null,
        });

        console.log('[RevenueCat] ✅ Initialization complete');
      } catch (error: any) {
        console.error('[RevenueCat] ❌ Initialization error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to initialize RevenueCat',
        }));
      }
    };

    initializeRevenueCat();

    // Listen for customer info updates
    const customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((info) => {
      console.log('[RevenueCat] 🔄 Customer info updated');
      const isPro = info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;
      console.log(`[RevenueCat] User is now ${isPro ? 'PRO ✨' : 'FREE'}`);
      
      setState(prev => ({
        ...prev,
        isPro,
        customerInfo: info,
      }));
    });

    return () => {
      customerInfoUpdateListener.remove();
    };
  }, []);

  // Purchase a package
  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage) => {
    try {
      console.log('[RevenueCat] 💳 Starting purchase:', packageToPurchase.identifier);
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log('[RevenueCat] ✅ Purchase successful');
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      const isPro = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;
      console.log(`[RevenueCat] User is now ${isPro ? 'PRO ✨' : 'FREE'}`);

      setState(prev => ({
        ...prev,
        isPro,
        customerInfo,
        isLoading: false,
      }));

      Alert.alert(
        'Success! 🎉',
        'Welcome to Macrogoal Pro! You now have access to all premium features.',
        [{ text: 'OK' }]
      );

      return { success: true, customerInfo };
    } catch (error: any) {
      console.error('[RevenueCat] ❌ Purchase error:', error);
      
      // User cancelled
      if (error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, cancelled: true };
      }

      // Other errors
      const errorMessage = error.message || 'Purchase failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      Alert.alert(
        'Purchase Failed',
        errorMessage,
        [{ text: 'OK' }]
      );

      return { success: false, error: errorMessage };
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      console.log('[RevenueCat] 🔄 Restoring purchases...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const customerInfo = await Purchases.restorePurchases();
      console.log('[RevenueCat] ✅ Purchases restored');
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      const isPro = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined;
      console.log(`[RevenueCat] User is now ${isPro ? 'PRO ✨' : 'FREE'}`);

      setState(prev => ({
        ...prev,
        isPro,
        customerInfo,
        isLoading: false,
      }));

      if (isPro) {
        Alert.alert(
          'Success! 🎉',
          'Your purchases have been restored. Welcome back to Macrogoal Pro!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
      }

      return { success: true, isPro };
    } catch (error: any) {
      console.error('[RevenueCat] ❌ Restore error:', error);
      const errorMessage = error.message || 'Failed to restore purchases';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      Alert.alert(
        'Restore Failed',
        errorMessage,
        [{ text: 'OK' }]
      );

      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
  };
}
