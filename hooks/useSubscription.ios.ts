
import { useState, useEffect, useCallback } from 'react';
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
}

export const useSubscription = (): UseSubscriptionHook => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription status from Supabase
  const fetchSubscriptionStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useSubscription iOS] No authenticated user');
        setIsSubscribed(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        console.error('[useSubscription iOS] Error fetching subscription:', dbError);
        setError(dbError.message);
        setIsSubscribed(false);
      } else if (data) {
        console.log('[useSubscription iOS] Active subscription found:', data);
        setIsSubscribed(true);
      } else {
        console.log('[useSubscription iOS] No active subscription');
        setIsSubscribed(false);
      }
    } catch (err: any) {
      console.error('[useSubscription iOS] Unexpected error:', err);
      setError(err.message);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const connectAndLoadProducts = async () => {
      setLoading(true);
      setError(null);
      console.log('[useSubscription iOS] 🚀 Initializing IAP...');
      
      try {
        // Connect to App Store
        console.log('[useSubscription iOS] 🔌 Connecting to App Store...');
        const connectionResult = await InAppPurchases.connectAsync();
        
        if (connectionResult.responseCode !== InAppPurchases.IAPResponseCode.OK) {
          const errorMsg = `IAP Connection failed: ${connectionResult.debugMessage} (Code: ${connectionResult.responseCode})`;
          console.error(`[useSubscription iOS] ${errorMsg}`);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        console.log('[useSubscription iOS] ✅ Connected to App Store successfully');

        // Fetch subscription products
        const productIds = Object.values(IAP_PRODUCT_IDS);
        console.log(`[useSubscription iOS] 📦 Fetching subscription products: ${productIds.join(', ')}`);
        
        const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

        if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
          console.log(`[useSubscription iOS] 📊 Products fetch result: { responseCode: ${responseCode}, responseCodeName: "${InAppPurchases.IAPResponseCode[responseCode]}", resultsCount: ${results.length} }`);
          
          const mappedProducts = results.map(p => ({
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
          }));
          
          setProducts(mappedProducts);
          console.log(`[useSubscription iOS] ✅ Subscription products loaded successfully: ${results.length}`);
          results.forEach((p, i) => {
            console.log(`[useSubscription iOS] 📦 Product ${i + 1}: { productId: "${p.productId}", title: "${p.title}", price: "${p.price}" }`);
          });
        } else {
          const warningMsg = `No subscription products returned from App Store (Code: ${responseCode}, Name: ${InAppPurchases.IAPResponseCode[responseCode]})`;
          console.warn(`[useSubscription iOS] ⚠️ ${warningMsg}`);
          setError(warningMsg);
          console.warn('[useSubscription iOS] ⚠️ This usually means:');
          console.warn('[useSubscription iOS] ⚠️ 1. Product IDs do not match App Store Connect exactly');
          console.warn('[useSubscription iOS] ⚠️ 2. Products are not in "Ready to Submit" state');
          console.warn('[useSubscription iOS] ⚠️ 3. Bundle ID mismatch between app.json and App Store Connect');
          console.warn('[useSubscription iOS] ⚠️ 4. Testing on Simulator (use real device or TestFlight)');
          console.warn('[useSubscription iOS] ⚠️ 5. Products are not configured as Auto-Renewable Subscriptions');
        }
      } catch (err: any) {
        console.error('[useSubscription iOS] Error during IAP setup:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    connectAndLoadProducts();
    fetchSubscriptionStatus();

    // Purchase Listener
    const purchaseUpdateSubscription = InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
      console.log(`[useSubscription iOS] Purchase Listener triggered. Response Code: ${responseCode} (${InAppPurchases.IAPResponseCode[responseCode]})`);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        for (const purchase of results) {
          console.log(`[useSubscription iOS] Processing purchase: ${purchase.productId}, Transaction ID: ${purchase.transactionId}`);
          
          if (!purchase.transactionReceipt) {
            console.error('[useSubscription iOS] Purchase has no transaction receipt.');
            Alert.alert('Purchase Error', 'Could not verify your purchase. Please try again or contact support.');
            await InAppPurchases.finishTransactionAsync(purchase, false);
            continue;
          }

          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              console.error('[useSubscription iOS] No authenticated user found for purchase verification.');
              Alert.alert('Authentication Error', 'Please log in to verify your purchase.');
              await InAppPurchases.finishTransactionAsync(purchase, false);
              continue;
            }

            // Send receipt to Supabase Edge Function for verification
            console.log('[useSubscription iOS] Sending receipt to Supabase Edge Function for verification...');
            const { data, error: edgeFunctionError } = await supabase.functions.invoke('verify-apple-receipt', {
              body: JSON.stringify({
                receipt: purchase.transactionReceipt,
                productId: purchase.productId,
                transactionId: purchase.transactionId,
                userId: user.id,
              }),
            });

            if (edgeFunctionError) {
              console.error('[useSubscription iOS] Receipt verification failed:', edgeFunctionError);
              setError(edgeFunctionError.message);
              Alert.alert('Verification Failed', 'Your purchase could not be verified. Please contact support.');
              await InAppPurchases.finishTransactionAsync(purchase, false);
              continue;
            }

            if (data && data.success) {
              console.log('[useSubscription iOS] Purchase verified and subscription updated:', data.subscription);
              setIsSubscribed(true);
              Alert.alert('Success', 'Your subscription is now active!');
              await InAppPurchases.finishTransactionAsync(purchase, true);
            } else {
              console.error('[useSubscription iOS] Backend verification failed:', data?.error || 'Unknown error');
              setError(data?.error || 'Unknown verification error');
              Alert.alert('Verification Failed', data?.error || 'Your purchase could not be verified. Please contact support.');
              await InAppPurchases.finishTransactionAsync(purchase, false);
            }
          } catch (err: any) {
            console.error('[useSubscription iOS] Error during purchase verification process:', err);
            setError(err.message);
            Alert.alert('Error', 'An unexpected error occurred during purchase verification. Please contact support.');
            await InAppPurchases.finishTransactionAsync(purchase, false);
          }
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        console.log('[useSubscription iOS] Purchase canceled by user.');
        Alert.alert('Purchase Canceled', 'You have cancelled the purchase.');
      } else {
        console.error(`[useSubscription iOS] Purchase failed with response code: ${responseCode} (${InAppPurchases.IAPResponseCode[responseCode]})`);
        setError(`Purchase failed: ${InAppPurchases.IAPResponseCode[responseCode]}`);
        Alert.alert('Purchase Failed', `An error occurred during your purchase: ${InAppPurchases.IAPResponseCode[responseCode]}`);
      }
      
      setLoading(false);
    });

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      InAppPurchases.disconnectAsync();
      console.log('[useSubscription iOS] IAP disconnected and listener removed.');
    };
  }, [fetchSubscriptionStatus]);

  // Initiate purchase
  const purchaseProduct = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    console.log(`[useSubscription iOS] Attempting to purchase product: ${productId}`);
    
    const productToPurchase = products.find(p => p.productId === productId);
    if (!productToPurchase) {
      const msg = `Product with ID ${productId} not found in fetched products.`;
      console.error(`[useSubscription iOS] ${msg}`);
      setError(msg);
      Alert.alert('Purchase Error', msg);
      setLoading(false);
      return;
    }
    
    try {
      await InAppPurchases.purchaseItemAsync(productId);
      // The listener will handle the rest
    } catch (err: any) {
      console.error('[useSubscription iOS] Error initiating purchase:', err);
      setError(err.message);
      Alert.alert('Purchase Error', `Failed to initiate purchase: ${err.message}`);
      setLoading(false);
    }
  }, [products]);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('[useSubscription iOS] Attempting to restore purchases...');
    
    try {
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      console.log(`[useSubscription iOS] Restore purchases result: { responseCode: ${responseCode}, responseCodeName: "${InAppPurchases.IAPResponseCode[responseCode]}", resultsCount: ${results.length} }`);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length > 0) {
        Alert.alert('Restore Initiated', 'Checking for previous purchases. You will be notified once complete.');
      } else if (responseCode === InAppPurchases.IAPResponseCode.OK && results.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
        setIsSubscribed(false);
      } else {
        console.error(`[useSubscription iOS] Error restoring purchases: ${responseCode} (${InAppPurchases.IAPResponseCode[responseCode]})`);
        setError(`Error restoring purchases: ${InAppPurchases.IAPResponseCode[responseCode]}`);
        Alert.alert('Restore Failed', `Could not restore purchases: ${InAppPurchases.IAPResponseCode[responseCode]}`);
      }
    } catch (err: any) {
      console.error('[useSubscription iOS] Error during restore purchases:', err);
      setError(err.message);
      Alert.alert('Restore Error', `An unexpected error occurred during restore: ${err.message}`);
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
  };
};
