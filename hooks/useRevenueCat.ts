
/**
 * RevenueCat Hook (Placeholder)
 * 
 * This hook will replace useSubscription.ios.ts when RevenueCat is available.
 * Currently falls back to expo-in-app-purchases implementation.
 * 
 * MIGRATION STEPS (When RevenueCat is available):
 * 1. Install: npm install react-native-purchases
 * 2. Uncomment RevenueCat SDK imports
 * 3. Replace implementation with RevenueCat SDK calls
 * 4. Update components to use this hook instead of useSubscription
 * 5. Remove useSubscription.ios.ts and useSubscription.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
// TODO: Uncomment when RevenueCat is available
// import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
// import { REVENUECAT_CONFIG } from '@/config/revenueCatConfig';

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  currencyCode: string;
}

interface UseRevenueCatHook {
  products: Product[];
  purchaseProduct: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  customerInfo: any | null;
}

/**
 * RevenueCat Hook
 * 
 * Provides a unified interface for subscription management across iOS and Android.
 * 
 * Features:
 * - Automatic receipt validation
 * - Cross-platform support
 * - Real-time subscription status
 * - Simplified purchase flow
 * - Automatic renewal handling
 */
export const useRevenueCat = (): UseRevenueCatHook => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);

  // TODO: Implement RevenueCat initialization when available
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Uncomment when RevenueCat is available
        /*
        // Configure RevenueCat SDK
        if (Platform.OS === 'ios') {
          await Purchases.configure({
            apiKey: REVENUECAT_CONFIG.apiKey.ios,
          });
        } else if (Platform.OS === 'android') {
          await Purchases.configure({
            apiKey: REVENUECAT_CONFIG.apiKey.android,
          });
        }

        // Set user ID (optional but recommended)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await Purchases.logIn(user.id);
        }

        // Fetch available offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          const packages = offerings.current.availablePackages;
          const productList = packages.map(pkg => ({
            productId: pkg.product.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            price: pkg.product.priceString,
            currencyCode: pkg.product.currencyCode,
          }));
          setProducts(productList);
        }

        // Check current subscription status
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        setIsSubscribed(
          info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined
        );
        */

        // TEMPORARY: Fallback message until RevenueCat is available
        setError('RevenueCat integration coming soon. Using expo-in-app-purchases for now.');
        setLoading(false);
      } catch (e: any) {
        console.error('[RevenueCat] Initialization error:', e);
        setError(e.message || 'Failed to initialize RevenueCat');
        setLoading(false);
      }
    };

    initializeRevenueCat();

    // TODO: Add listener for customer info updates
    /*
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      setIsSubscribed(
        info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined
      );
    });

    return () => {
      listener.remove();
    };
    */
  }, []);

  // TODO: Implement purchase flow when RevenueCat is available
  const purchaseProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Uncomment when RevenueCat is available
      /*
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find(
        p => p.product.identifier === productId
      );

      if (!pkg) {
        throw new Error('Product not found');
      }

      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      setIsSubscribed(
        info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined
      );
      */

      console.log('[RevenueCat] Purchase not available yet:', productId);
      setError('RevenueCat integration coming soon');
    } catch (e: any) {
      console.error('[RevenueCat] Purchase error:', e);
      setError(e.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // TODO: Implement restore flow when RevenueCat is available
  const restorePurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Uncomment when RevenueCat is available
      /*
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      setIsSubscribed(
        info.entitlements.active[REVENUECAT_CONFIG.entitlementId] !== undefined
      );
      */

      console.log('[RevenueCat] Restore not available yet');
      setError('RevenueCat integration coming soon');
    } catch (e: any) {
      console.error('[RevenueCat] Restore error:', e);
      setError(e.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    purchaseProduct,
    restorePurchases,
    isSubscribed,
    loading,
    error,
    customerInfo,
  };
};

export default useRevenueCat;
