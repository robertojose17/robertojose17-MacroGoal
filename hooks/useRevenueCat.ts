
/**
 * RevenueCat Hook
 * 
 * Complete implementation of RevenueCat SDK for subscription management.
 * Handles initialization, purchases, restores, and entitlement checking.
 * 
 * Features:
 * - Automatic SDK initialization
 * - Real-time customer info updates
 * - Purchase flow with error handling
 * - Restore purchases functionality
 * - Entitlement checking for "Macrogoal Pro"
 * - Cross-platform support (iOS/Android)
 * 
 * DIAGNOSTIC MODE: Enhanced logging for debugging connection issues
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { REVENUECAT_API_KEY, ENTITLEMENT_ID } from '@/config/revenueCatConfig';
import { supabase } from '@/app/integrations/supabase/client';

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceString: string;
  currencyCode: string;
  packageType: string;
}

interface UseRevenueCatHook {
  offerings: PurchasesOffering | null;
  products: Product[];
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  loading: boolean;
  error: string | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
}

const log = (tag: string, msg: string, data?: any) => {
  const ts = new Date().toISOString();
  console.log(`[RevenueCat ${ts}] ${tag}: ${msg}`, data ?? '');
};

export const useRevenueCat = (): UseRevenueCatHook => {
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Check if user has "Macrogoal Pro" entitlement
  const isPro = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;

  // Safe state updates (only if component is mounted)
  const safeSet = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) updateFn();
  }, []);

  // Initialize RevenueCat SDK
  useEffect(() => {
    isMountedRef.current = true;

    if (initializedRef.current) return;
    initializedRef.current = true;

    const initializeRevenueCat = async () => {
      try {
        safeSet(() => {
          setLoading(true);
          setError(null);
        });

        log('INIT', '========================================');
        log('INIT', '🚀 STARTING REVENUECAT INITIALIZATION');
        log('INIT', '========================================');
        log('INIT', `Platform: ${Platform.OS}`);
        log('INIT', `API Key: ${REVENUECAT_API_KEY.substring(0, 15)}...`);
        log('INIT', `Entitlement ID: ${ENTITLEMENT_ID}`);

        // STEP 1: Enable debug logging
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        log('INIT', '✅ Step 1: Debug logging enabled');

        // STEP 2: Configure RevenueCat SDK
        log('INIT', '⏳ Step 2: Configuring RevenueCat SDK...');
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        log('INIT', '✅ Step 2: RevenueCat SDK configured successfully');
        console.log('RevenueCat configured'); // Explicit log as requested

        // STEP 3: Set user ID from Supabase auth (optional but recommended)
        log('INIT', '⏳ Step 3: Attempting to identify user...');
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await Purchases.logIn(user.id);
            log('INIT', `✅ Step 3: User identified: ${user.id}`);
          } else {
            log('INIT', '⚠️ Step 3: No user found, continuing anonymously');
          }
        } catch (authError) {
          log('INIT', '⚠️ Step 3: Could not identify user (non-critical)', authError);
        }

        // STEP 4: Set up listener for customer info updates
        log('INIT', '⏳ Step 4: Registering customer info listener...');
        Purchases.addCustomerInfoUpdateListener((info) => {
          log('LISTENER', '📡 Customer info updated', {
            entitlements: Object.keys(info.entitlements.active),
            activeSubscriptions: info.activeSubscriptions,
          });
          safeSet(() => setCustomerInfo(info));
        });
        log('INIT', '✅ Step 4: Customer info listener registered');

        // STEP 5: Get initial customer info
        log('INIT', '⏳ Step 5: Fetching initial customer info...');
        const initialCustomerInfo = await Purchases.getCustomerInfo();
        log('INIT', '✅ Step 5: Customer info retrieved', {
          entitlements: Object.keys(initialCustomerInfo.entitlements.active),
          activeSubscriptions: initialCustomerInfo.activeSubscriptions,
          originalAppUserId: initialCustomerInfo.originalAppUserId,
        });
        
        // Check if user has entitlement
        if (initialCustomerInfo.entitlements.active[ENTITLEMENT_ID]) {
          log('INIT', `🎉 User has active "${ENTITLEMENT_ID}" entitlement!`);
        } else {
          log('INIT', `ℹ️ User does not have "${ENTITLEMENT_ID}" entitlement`);
        }
        
        safeSet(() => setCustomerInfo(initialCustomerInfo));

        // STEP 6: Fetch offerings from RevenueCat
        log('INIT', '⏳ Step 6: Fetching offerings...');
        console.log('Fetching offerings...'); // Explicit log as requested
        
        const offeringsResult = await Purchases.getOfferings();
        
        log('INIT', '📦 Offerings result:', {
          current: offeringsResult.current?.identifier || 'null',
          all: Object.keys(offeringsResult.all),
        });
        console.log('Offerings fetched:', offeringsResult); // Explicit log as requested
        console.log('Offerings.current:', offeringsResult.current); // Explicit log as requested
        console.log('Offerings.all:', offeringsResult.all); // Explicit log as requested

        if (offeringsResult.current) {
          log('INIT', `✅ Step 6: Current offering found: "${offeringsResult.current.identifier}"`);
          log('INIT', `📦 Available packages: ${offeringsResult.current.availablePackages.length}`);

          offeringsResult.current.availablePackages.forEach((pkg, index) => {
            log('INIT', `   Package ${index + 1}:`, {
              identifier: pkg.identifier,
              packageType: pkg.packageType,
              productId: pkg.product.identifier,
              price: pkg.product.priceString,
              title: pkg.product.title,
            });
          });

          const productList = offeringsResult.current.availablePackages.map((pkg) => ({
            productId: pkg.product.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            price: pkg.product.price.toString(),
            priceString: pkg.product.priceString,
            currencyCode: pkg.product.currencyCode,
            packageType: pkg.packageType,
          }));

          safeSet(() => {
            setOfferings(offeringsResult.current);
            setProducts(productList);
          });

          log('INIT', '✅ Products loaded successfully');
        } else {
          log('INIT', '❌ Step 6: NO CURRENT OFFERING FOUND');
          log('INIT', '⚠️ DIAGNOSIS: Check RevenueCat dashboard:');
          log('INIT', '   1. Is there an Offering marked as "Current"?');
          log('INIT', '   2. Does the Offering have at least 1 Package?');
          log('INIT', '   3. Is the Package linked to a product?');
          log('INIT', `   4. Does the Bundle ID match: com.robertojose17.macrogoal?`);
          log('INIT', `   5. Is the API key correct: ${REVENUECAT_API_KEY.substring(0, 15)}...?`);
          
          safeSet(() => setError('No subscription offerings available. Check RevenueCat dashboard configuration.'));
        }

        safeSet(() => setLoading(false));
        
        log('INIT', '========================================');
        log('INIT', '✅ INITIALIZATION COMPLETE');
        log('INIT', '========================================');

      } catch (e: any) {
        const errorMsg = e?.message || 'Unknown initialization error';
        log('INIT', '========================================');
        log('INIT', '❌ INITIALIZATION FAILED');
        log('INIT', '========================================');
        log('INIT', `Error: ${errorMsg}`, e);
        log('INIT', 'Error details:', {
          name: e?.name,
          message: e?.message,
          code: e?.code,
          stack: e?.stack,
        });
        
        safeSet(() => {
          setError(errorMsg);
          setLoading(false);
        });
      }
    };

    initializeRevenueCat();

    return () => {
      isMountedRef.current = false;
      // Clean up listener on unmount
      Purchases.removeCustomerInfoUpdateListener();
      log('CLEANUP', 'Customer info listener removed');
    };
  }, [safeSet]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      safeSet(() => setLoading(true));
      log('PURCHASE', `⏳ Starting purchase for: ${pkg.product.identifier}`);

      const { customerInfo: newCustomerInfo } = await Purchases.purchasePackage(pkg);
      
      log('PURCHASE', '✅ Purchase successful', {
        entitlements: Object.keys(newCustomerInfo.entitlements.active),
        activeSubscriptions: newCustomerInfo.activeSubscriptions,
      });

      safeSet(() => setCustomerInfo(newCustomerInfo));

      // Check if entitlement is now active
      const hasEntitlement = newCustomerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      
      if (hasEntitlement) {
        log('PURCHASE', `✅ Entitlement "${ENTITLEMENT_ID}" is now active`);
        Alert.alert('Success!', 'Thank you for subscribing to Macrogoal Pro!');
        return true;
      } else {
        log('PURCHASE', `⚠️ Purchase completed but entitlement "${ENTITLEMENT_ID}" not active`);
        Alert.alert('Notice', 'Purchase completed. Entitlement may take a moment to activate.');
        return false;
      }

    } catch (e: any) {
      const purchasesError = e as PurchasesError;
      
      // User cancelled - don't show error
      if (purchasesError.userCancelled) {
        log('PURCHASE', 'ℹ️ User cancelled purchase');
        return false;
      }

      // Actual error
      const errorMsg = purchasesError.message || 'Purchase failed';
      log('PURCHASE', `❌ Purchase error: ${errorMsg}`, purchasesError);
      
      safeSet(() => setError(errorMsg));
      Alert.alert('Purchase Error', errorMsg);
      return false;

    } finally {
      safeSet(() => setLoading(false));
    }
  }, [safeSet]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    try {
      safeSet(() => setLoading(true));
      log('RESTORE', '⏳ Starting restore purchases...');

      const restoredInfo = await Purchases.restorePurchases();
      
      log('RESTORE', '✅ Restore completed', {
        entitlements: Object.keys(restoredInfo.entitlements.active),
        activeSubscriptions: restoredInfo.activeSubscriptions,
      });

      safeSet(() => setCustomerInfo(restoredInfo));

      // Check if entitlement was restored
      if (restoredInfo.entitlements.active[ENTITLEMENT_ID]) {
        log('RESTORE', `✅ Entitlement "${ENTITLEMENT_ID}" restored`);
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        log('RESTORE', 'ℹ️ No active subscriptions found');
        Alert.alert('No Purchases Found', 'No active subscriptions to restore.');
      }

    } catch (e: any) {
      const errorMsg = e?.message || 'Restore failed';
      log('RESTORE', `❌ Restore error: ${errorMsg}`, e);
      
      safeSet(() => setError(errorMsg));
      Alert.alert('Restore Error', errorMsg);

    } finally {
      safeSet(() => setLoading(false));
    }
  }, [safeSet]);

  // Manually check subscription status
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      log('STATUS', '⏳ Checking subscription status...');
      const info = await Purchases.getCustomerInfo();
      
      log('STATUS', '✅ Status retrieved', {
        entitlements: Object.keys(info.entitlements.active),
        activeSubscriptions: info.activeSubscriptions,
      });

      safeSet(() => setCustomerInfo(info));
    } catch (e: any) {
      log('STATUS', `❌ Status check error: ${e?.message}`, e);
    }
  }, [safeSet]);

  return {
    offerings,
    products,
    customerInfo,
    isPro,
    loading,
    error,
    purchasePackage,
    restorePurchases,
    checkSubscriptionStatus,
  };
};

export default useRevenueCat;
