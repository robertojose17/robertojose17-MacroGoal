
import { useState, useEffect, useCallback } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesError,
} from 'react-native-purchases';
import { Platform, Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { REVENUECAT_CONFIG } from '@/config/revenueCatConfig';
import { supabase } from '@/lib/supabase/client';
import { checkRevenueCap, formatRevenueCapMessage } from '@/utils/revenueCap';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import React from 'react';

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

  // Purchase a package with revenue cap enforcement
  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage): Promise<any> => {
    try {
      console.log('[RevenueCat] 💳 Starting purchase:', packageToPurchase.identifier);
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // CRITICAL: Check revenue cap BEFORE initiating purchase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[RevenueCat] ❌ User not authenticated');
        setState(prev => ({ ...prev, isLoading: false }));
        
        return new Promise<{ success: boolean; error?: string }>((resolve) => {
          showCustomAlert(
            'Authentication Required',
            'Please log in to make a purchase.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Not authenticated' }) }]
          );
        });
      }

      console.log('[RevenueCap] 🔍 Checking revenue cap before purchase...');
      const revenueCapStatus = await checkRevenueCap(user.id);

      if (revenueCapStatus.capReached) {
        console.warn('[RevenueCap] ❌ Revenue cap reached. Blocking purchase.');
        setState(prev => ({ ...prev, isLoading: false }));
        
        const message = formatRevenueCapMessage(revenueCapStatus);
        
        return new Promise<{ success: boolean; capReached: boolean }>((resolve) => {
          showCustomAlert(
            'Spending Limit Reached',
            message,
            [{ text: 'OK', onPress: () => resolve({ success: false, capReached: true }) }]
          );
        });
      }

      console.log('[RevenueCap] ✅ Revenue cap check passed. Proceeding with purchase...');

      // Proceed with purchase
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

      return new Promise<{ success: boolean; customerInfo: CustomerInfo }>((resolve) => {
        showCustomAlert(
          'Success! 🎉',
          'Welcome to Macrogoal Pro! You now have access to all premium features.',
          [{ text: 'OK', onPress: () => resolve({ success: true, customerInfo }) }]
        );
      });

    } catch (error: any) {
      console.error('[RevenueCat] ❌ Purchase error:', error);
      
      // Handle specific error types
      const purchasesError = error as PurchasesError;
      
      // User cancelled
      if (purchasesError.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, cancelled: true };
      }

      // Network error
      if (purchasesError.code === 'NETWORK_ERROR') {
        console.error('[RevenueCat] Network error during purchase');
        setState(prev => ({ ...prev, isLoading: false, error: 'Network error' }));
        
        return new Promise<{ success: boolean; error: string }>((resolve) => {
          showCustomAlert(
            'Network Error',
            'Please check your internet connection and try again.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Network error' }) }]
          );
        });
      }

      // Store problem
      if (purchasesError.code === 'STORE_PROBLEM_ERROR') {
        console.error('[RevenueCat] Store problem error');
        setState(prev => ({ ...prev, isLoading: false, error: 'Store problem' }));
        
        return new Promise<{ success: boolean; error: string }>((resolve) => {
          showCustomAlert(
            'Store Error',
            'There was a problem with the App Store. Please try again later.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Store problem' }) }]
          );
        });
      }

      // Product not available
      if (purchasesError.code === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR') {
        console.error('[RevenueCat] Product not available');
        setState(prev => ({ ...prev, isLoading: false, error: 'Product not available' }));
        
        return new Promise<{ success: boolean; error: string }>((resolve) => {
          showCustomAlert(
            'Product Unavailable',
            'This product is currently not available for purchase. Please try again later.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Product not available' }) }]
          );
        });
      }

      // Purchase not allowed
      if (purchasesError.code === 'PURCHASE_NOT_ALLOWED_ERROR') {
        console.error('[RevenueCat] Purchase not allowed');
        setState(prev => ({ ...prev, isLoading: false, error: 'Purchase not allowed' }));
        
        return new Promise<{ success: boolean; error: string }>((resolve) => {
          showCustomAlert(
            'Purchase Not Allowed',
            'Purchases are not allowed on this device. Please check your device settings.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Purchase not allowed' }) }]
          );
        });
      }

      // Payment pending
      if (purchasesError.code === 'PAYMENT_PENDING_ERROR') {
        console.warn('[RevenueCat] Payment pending');
        setState(prev => ({ ...prev, isLoading: false }));
        
        return new Promise<{ success: boolean; pending: boolean }>((resolve) => {
          showCustomAlert(
            'Payment Pending',
            'Your purchase is pending. We will notify you when it completes.',
            [{ text: 'OK', onPress: () => resolve({ success: false, pending: true }) }]
          );
        });
      }

      // Generic error
      const errorMessage = purchasesError.message || 'Purchase failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return new Promise<{ success: boolean; error: string }>((resolve) => {
        showCustomAlert(
          'Purchase Failed',
          errorMessage,
          [{ text: 'OK', onPress: () => resolve({ success: false, error: errorMessage }) }]
        );
      });
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<any> => {
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
        return new Promise<{ success: boolean; isPro: boolean }>((resolve) => {
          showCustomAlert(
            'Success! 🎉',
            'Your purchases have been restored. Welcome back to Macrogoal Pro!',
            [{ text: 'OK', onPress: () => resolve({ success: true, isPro: true }) }]
          );
        });
      } else {
        return new Promise<{ success: boolean; isPro: boolean }>((resolve) => {
          showCustomAlert(
            'No Purchases Found',
            'We couldn\'t find any previous purchases to restore.',
            [{ text: 'OK', onPress: () => resolve({ success: true, isPro: false }) }]
          );
        });
      }

    } catch (error: any) {
      console.error('[RevenueCat] ❌ Restore error:', error);
      
      // Handle network errors
      if (error.code === 'NETWORK_ERROR') {
        setState(prev => ({ ...prev, isLoading: false, error: 'Network error' }));
        
        return new Promise<{ success: boolean; error: string }>((resolve) => {
          showCustomAlert(
            'Network Error',
            'Please check your internet connection and try again.',
            [{ text: 'OK', onPress: () => resolve({ success: false, error: 'Network error' }) }]
          );
        });
      }

      const errorMessage = error.message || 'Failed to restore purchases';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return new Promise<{ success: boolean; error: string }>((resolve) => {
        showCustomAlert(
          'Restore Failed',
          errorMessage,
          [{ text: 'OK', onPress: () => resolve({ success: false, error: errorMessage }) }]
        );
      });
    }
  }, []);

  return {
    ...state,
    purchasePackage,
    restorePurchases,
  };
}

// Custom Alert Modal Component (works on both iOS and Web)
function showCustomAlert(
  title: string,
  message: string,
  buttons: Array<{ text: string; onPress: () => void }>
) {
  // This is a simplified version - in production, you'd use a proper modal component
  // For now, we'll use the native Alert which works on iOS
  // On web, this will use window.alert/confirm
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    buttons[0].onPress();
  } else {
    // Use React Native Alert for native platforms
    const Alert = require('react-native').Alert;
    Alert.alert(title, message, buttons);
  }
}
