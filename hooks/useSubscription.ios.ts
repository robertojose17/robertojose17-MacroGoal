
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '@/app/integrations/supabase/client';
import { IAP_PRODUCT_IDS } from '@/config/iapConfig';

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  currencyCode: string;
  subscriptionPeriod?: string;
  introductoryPrice?: string;
  introductoryPricePaymentMode?: InAppPurchases.PaymentMode;
  introductoryPriceNumberOfPeriods?: string;
  introductoryPriceSubscriptionPeriod?: string;
}

interface UseSubscriptionHook {
  products: Product[];
  purchaseProduct: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  storeConnected: boolean;
}

const logWithTimestamp = (tag: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[IAP ${timestamp}] ${tag}: ${message}`, data);
  } else {
    console.log(`[IAP ${timestamp}] ${tag}: ${message}`);
  }
};

export const useSubscription = (): UseSubscriptionHook => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [storeConnected, setStoreConnected] = useState<boolean>(false);
  
  const purchaseListenerRef = useRef<any>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Fetch subscription status from Supabase
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logWithTimestamp('SUBSCRIPTION_STATUS', 'No authenticated user');
        setIsSubscribed(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (dbError && dbError.code !== 'PGRST116') {
        logWithTimestamp('SUBSCRIPTION_STATUS', 'Error fetching subscription', dbError);
        setIsSubscribed(false);
      } else if (data) {
        logWithTimestamp('SUBSCRIPTION_STATUS', 'Active subscription found', data);
        setIsSubscribed(true);
      } else {
        logWithTimestamp('SUBSCRIPTION_STATUS', 'No active subscription');
        setIsSubscribed(false);
      }
    } catch (err: any) {
      logWithTimestamp('SUBSCRIPTION_STATUS', 'Unexpected error', err);
      setIsSubscribed(false);
    }
  }, []);

  // Initialize IAP with deterministic flow
  useEffect(() => {
    if (isInitializedRef.current) {
      logWithTimestamp('INIT', 'Already initialized, skipping');
      return;
    }

    const initializeIAP = async () => {
      logWithTimestamp('INIT', '🚀 Starting IAP initialization...');
      setLoading(true);
      setError(null);
      setStoreConnected(false);

      try {
        // STEP 1: Connect to App Store
        logWithTimestamp('CONNECT', '🔌 Attempting to connect to App Store...');
        const connectionResult = await InAppPurchases.connectAsync();
        
        logWithTimestamp('CONNECT', 'Connection result received', {
          responseCode: connectionResult.responseCode,
          responseCodeName: InAppPurchases.IAPResponseCode[connectionResult.responseCode],
          debugMessage: connectionResult.debugMessage,
        });

        if (connectionResult.responseCode !== InAppPurchases.IAPResponseCode.OK) {
          const errorMsg = `Store connection failed: ${connectionResult.debugMessage || 'Unknown error'} (Code: ${connectionResult.responseCode})`;
          logWithTimestamp('CONNECT', `❌ ${errorMsg}`);
          setError(errorMsg);
          setStoreConnected(false);
          setLoading(false);
          return; // STOP - cannot proceed without connection
        }

        logWithTimestamp('CONNECT', '✅ Successfully connected to App Store');
        setStoreConnected(true);

        // STEP 2: Fetch Products
        const productIds = Object.values(IAP_PRODUCT_IDS);
        logWithTimestamp('PRODUCTS', '📦 Fetching products with IDs:', productIds);

        const productsResult = await InAppPurchases.getProductsAsync(productIds);
        
        logWithTimestamp('PRODUCTS', 'Products fetch result', {
          responseCode: productsResult.responseCode,
          responseCodeName: InAppPurchases.IAPResponseCode[productsResult.responseCode],
          resultsCount: productsResult.results?.length || 0,
          results: productsResult.results,
        });

        // Guard: Check if results exist
        const results = productsResult.results ?? [];

        if (productsResult.responseCode !== InAppPurchases.IAPResponseCode.OK || results.length === 0) {
          const warningMsg = 'No products returned from App Store. Check App Store Connect attachment/status.';
          logWithTimestamp('PRODUCTS', `⚠️ ${warningMsg}`);
          logWithTimestamp('PRODUCTS', '⚠️ TROUBLESHOOTING CHECKLIST:');
          logWithTimestamp('PRODUCTS', '⚠️ 1. Product IDs match App Store Connect exactly:', productIds);
          logWithTimestamp('PRODUCTS', '⚠️ 2. Products are in "Ready to Submit" status');
          logWithTimestamp('PRODUCTS', '⚠️ 3. Bundle ID matches: com.robertojose17.macrogoal');
          logWithTimestamp('PRODUCTS', '⚠️ 4. Testing on real device or TestFlight (not Simulator)');
          logWithTimestamp('PRODUCTS', '⚠️ 5. Products configured as Auto-Renewable Subscriptions');
          logWithTimestamp('PRODUCTS', '⚠️ 6. Sandbox tester account signed in (Settings > App Store > Sandbox Account)');
          
          setError(warningMsg);
          setProducts([]);
          setLoading(false);
          return; // STOP - cannot proceed without products
        }

        // Map products
        const mappedProducts = results.map((p, index) => {
          logWithTimestamp('PRODUCTS', `📦 Product ${index + 1} details:`, {
            productId: p.productId,
            title: p.title,
            price: p.price,
            description: p.description,
            currencyCode: p.currencyCode,
          });
          
          return {
            productId: p.productId,
            title: p.title,
            description: p.description,
            price: p.price,
            currencyCode: p.currencyCode,
            subscriptionPeriod: p.subscriptionPeriod,
            introductoryPrice: p.introductoryPrice,
            introductoryPricePaymentMode: p.introductoryPricePaymentMode,
            introductoryPriceNumberOfPeriods: p.introductoryPriceNumberOfPeriods,
            introductoryPriceSubscriptionPeriod: p.introductoryPriceSubscriptionPeriod,
          };
        });

        setProducts(mappedProducts);
        logWithTimestamp('PRODUCTS', `✅ Successfully loaded ${mappedProducts.length} products`);

        // STEP 3: Set up Purchase Listener (only after products are confirmed)
        logWithTimestamp('LISTENER', '🎧 Setting up purchase listener...');
        
        const listener = InAppPurchases.setPurchaseListener(async (purchaseUpdate) => {
          logWithTimestamp('LISTENER', '🔔 Purchase listener triggered', {
            responseCode: purchaseUpdate.responseCode,
            responseCodeName: InAppPurchases.IAPResponseCode[purchaseUpdate.responseCode],
            resultsCount: purchaseUpdate.results?.length || 0,
            rawPayload: purchaseUpdate,
          });

          // Guard: Check if response is valid
          if (!purchaseUpdate || purchaseUpdate.responseCode === undefined) {
            logWithTimestamp('LISTENER', '⚠️ Purchase update is undefined or invalid, ignoring');
            return;
          }

          // Guard: Check if results exist
          const purchaseResults = purchaseUpdate.results ?? [];

          if (purchaseUpdate.responseCode === InAppPurchases.IAPResponseCode.OK) {
            logWithTimestamp('LISTENER', `✅ Purchase successful, processing ${purchaseResults.length} transaction(s)`);

            for (const purchase of purchaseResults) {
              logWithTimestamp('LISTENER', 'Processing purchase:', {
                productId: purchase.productId,
                transactionId: purchase.transactionId,
                acknowledged: purchase.acknowledged,
                hasReceipt: !!purchase.transactionReceipt,
              });

              // Guard: Check if receipt exists
              if (!purchase.transactionReceipt) {
                logWithTimestamp('LISTENER', '❌ No transaction receipt found for purchase');
                Alert.alert('Purchase Error', 'Could not verify your purchase. Please contact support.');
                await InAppPurchases.finishTransactionAsync(purchase, false);
                continue;
              }

              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  logWithTimestamp('LISTENER', '❌ No authenticated user for verification');
                  Alert.alert('Authentication Error', 'Please log in to verify your purchase.');
                  await InAppPurchases.finishTransactionAsync(purchase, false);
                  continue;
                }

                logWithTimestamp('LISTENER', '📤 Sending receipt to backend for verification...');
                
                const { data, error: edgeFunctionError } = await supabase.functions.invoke('verify-apple-receipt', {
                  body: {
                    receipt: purchase.transactionReceipt,
                    productId: purchase.productId,
                    transactionId: purchase.transactionId,
                    userId: user.id,
                  },
                });

                if (edgeFunctionError) {
                  logWithTimestamp('LISTENER', '❌ Receipt verification failed', edgeFunctionError);
                  Alert.alert('Verification Failed', 'Your purchase could not be verified. Please contact support.');
                  await InAppPurchases.finishTransactionAsync(purchase, false);
                  continue;
                }

                if (data?.success) {
                  logWithTimestamp('LISTENER', '✅ Purchase verified successfully', data.subscription);
                  setIsSubscribed(true);
                  Alert.alert('Success', 'Your subscription is now active!');
                  await InAppPurchases.finishTransactionAsync(purchase, true);
                } else {
                  logWithTimestamp('LISTENER', '❌ Backend verification failed', data);
                  Alert.alert('Verification Failed', data?.error || 'Your purchase could not be verified.');
                  await InAppPurchases.finishTransactionAsync(purchase, false);
                }
              } catch (err: any) {
                logWithTimestamp('LISTENER', '❌ Error during verification process', err);
                Alert.alert('Error', 'An unexpected error occurred. Please contact support.');
                await InAppPurchases.finishTransactionAsync(purchase, false);
              }
            }
          } else if (purchaseUpdate.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            logWithTimestamp('LISTENER', '🚫 Purchase canceled by user');
            Alert.alert('Purchase Canceled', 'You have cancelled the purchase.');
          } else {
            logWithTimestamp('LISTENER', '❌ Purchase failed', {
              responseCode: purchaseUpdate.responseCode,
              responseCodeName: InAppPurchases.IAPResponseCode[purchaseUpdate.responseCode],
            });
            Alert.alert('Purchase Failed', `An error occurred: ${InAppPurchases.IAPResponseCode[purchaseUpdate.responseCode]}`);
          }

          setLoading(false);
        });

        purchaseListenerRef.current = listener;
        logWithTimestamp('LISTENER', '✅ Purchase listener set up successfully');

        // Fetch subscription status
        await fetchSubscriptionStatus();

        isInitializedRef.current = true;
        logWithTimestamp('INIT', '✅ IAP initialization complete');

      } catch (err: any) {
        logWithTimestamp('INIT', '❌ Fatal error during initialization', err);
        setError(err.message || 'Failed to initialize In-App Purchases');
        setStoreConnected(false);
      } finally {
        setLoading(false);
      }
    };

    initializeIAP();

    // Cleanup
    return () => {
      logWithTimestamp('CLEANUP', '🧹 Cleaning up IAP...');
      
      if (purchaseListenerRef.current) {
        purchaseListenerRef.current.remove();
        logWithTimestamp('CLEANUP', '✅ Purchase listener removed');
      }

      InAppPurchases.disconnectAsync()
        .then(() => {
          logWithTimestamp('CLEANUP', '✅ Disconnected from App Store');
        })
        .catch((err) => {
          logWithTimestamp('CLEANUP', '⚠️ Error disconnecting', err);
        });
    };
  }, [fetchSubscriptionStatus]);

  // Purchase a product
  const purchaseProduct = useCallback(async (productId: string) => {
    logWithTimestamp('PURCHASE', `🛒 Initiating purchase for product: ${productId}`);

    if (!storeConnected) {
      const msg = 'Store not connected. Cannot purchase.';
      logWithTimestamp('PURCHASE', `❌ ${msg}`);
      setError(msg);
      Alert.alert('Store Error', msg);
      return;
    }

    if (products.length === 0) {
      const msg = 'No products available. Cannot purchase.';
      logWithTimestamp('PURCHASE', `❌ ${msg}`);
      setError(msg);
      Alert.alert('Products Error', msg);
      return;
    }

    const productToPurchase = products.find(p => p.productId === productId);
    if (!productToPurchase) {
      const msg = `Product ${productId} not found in available products.`;
      logWithTimestamp('PURCHASE', `❌ ${msg}`);
      setError(msg);
      Alert.alert('Product Error', msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logWithTimestamp('PURCHASE', '📤 Calling purchaseItemAsync...');
      await InAppPurchases.purchaseItemAsync(productId);
      logWithTimestamp('PURCHASE', '✅ Purchase request sent, waiting for listener callback...');
      // The listener will handle the rest
    } catch (err: any) {
      logWithTimestamp('PURCHASE', '❌ Error initiating purchase', err);
      setError(err.message);
      Alert.alert('Purchase Error', `Failed to initiate purchase: ${err.message}`);
      setLoading(false);
    }
  }, [products, storeConnected]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    logWithTimestamp('RESTORE', '🔄 Initiating restore purchases...');

    if (!storeConnected) {
      const msg = 'Store not connected. Cannot restore purchases.';
      logWithTimestamp('RESTORE', `❌ ${msg}`);
      setError(msg);
      Alert.alert('Store Error', msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logWithTimestamp('RESTORE', '📤 Calling getPurchaseHistoryAsync...');
      const historyResult = await InAppPurchases.getPurchaseHistoryAsync();

      logWithTimestamp('RESTORE', 'Purchase history result', {
        responseCode: historyResult.responseCode,
        responseCodeName: InAppPurchases.IAPResponseCode[historyResult.responseCode],
        resultsCount: historyResult.results?.length || 0,
        results: historyResult.results,
      });

      // Guard: Check if results exist
      const historyResults = historyResult.results ?? [];

      if (historyResult.responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (historyResults.length > 0) {
          logWithTimestamp('RESTORE', `✅ Found ${historyResults.length} previous purchase(s)`);
          
          // Process each restored purchase
          for (const purchase of historyResults) {
            logWithTimestamp('RESTORE', 'Restored purchase:', {
              productId: purchase.productId,
              transactionId: purchase.transactionId,
            });
          }

          Alert.alert('Restore Initiated', 'Checking previous purchases. You will be notified once complete.');
          
          // The purchase listener will handle verification
          // Trigger a refresh of subscription status
          await fetchSubscriptionStatus();
        } else {
          logWithTimestamp('RESTORE', '⚠️ No previous purchases found');
          Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
          setIsSubscribed(false);
        }
      } else {
        logWithTimestamp('RESTORE', '❌ Restore failed', {
          responseCode: historyResult.responseCode,
          responseCodeName: InAppPurchases.IAPResponseCode[historyResult.responseCode],
        });
        setError(`Restore failed: ${InAppPurchases.IAPResponseCode[historyResult.responseCode]}`);
        Alert.alert('Restore Failed', `Could not restore purchases: ${InAppPurchases.IAPResponseCode[historyResult.responseCode]}`);
      }
    } catch (err: any) {
      logWithTimestamp('RESTORE', '❌ Error during restore', err);
      setError(err.message);
      Alert.alert('Restore Error', `An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [storeConnected, fetchSubscriptionStatus]);

  return {
    products,
    purchaseProduct,
    restorePurchases,
    isSubscribed,
    loading,
    error,
    storeConnected,
  };
};
