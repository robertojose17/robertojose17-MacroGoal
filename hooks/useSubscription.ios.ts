import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '@/app/integrations/supabase/client';
import { IAP_PRODUCT_IDS } from '@/config/iapConfig';

type Product = {
  productId: string;
  title: string;
  description: string;
  price: string;
  currencyCode: string;
};

type UseSubscriptionHook = {
  products: Product[];
  purchaseProduct: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  storeConnected: boolean;
};

const log = (tag: string, msg: string, data?: any) => {
  const ts = new Date().toISOString();
  if (data !== undefined) console.log(`[IAP ${ts}] ${tag}: ${msg}`, data);
  else console.log(`[IAP ${ts}] ${tag}: ${msg}`);
};

export const useSubscription = (): UseSubscriptionHook => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [storeConnected, setStoreConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const listenerRef = useRef<{ remove?: () => void } | null>(null);

  const productIds = [IAP_PRODUCT_IDS.monthly, IAP_PRODUCT_IDS.yearly];

  const fetchSubscriptionStatusFromDB = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubscribed(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (dbError && dbError.code !== 'PGRST116') {
        log('DB', 'Error reading subscription', dbError);
        setIsSubscribed(false);
        return;
      }

      setIsSubscribed(!!data);
    } catch (e) {
      log('DB', 'Unexpected error', e);
      setIsSubscribed(false);
    }
  }, []);

  const verifyReceipt = useCallback(
    async (purchase: InAppPurchases.InAppPurchase) => {
      // Always finish transactions at the end (but NEVER consume subscriptions)
      const finish = async () => {
        try {
          await InAppPurchases.finishTransactionAsync(purchase, false); // <- IMPORTANT: false for subs
        } catch (e) {
          log('FINISH', 'finishTransactionAsync failed', e);
        }
      };

      try {
        if (!purchase?.transactionReceipt) {
          log('VERIFY', 'No receipt on purchase', purchase);
          await finish();
          return { ok: false, reason: 'no_receipt' as const };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          log('VERIFY', 'No authenticated user');
          await finish();
          return { ok: false, reason: 'no_user' as const };
        }

        log('VERIFY', 'Sending receipt to Edge Function', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        });

        const { data, error: fnError } = await supabase.functions.invoke('verify-apple-receipt', {
          body: {
            receipt: purchase.transactionReceipt,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            userId: user.id,
          },
        });

        if (fnError) {
          log('VERIFY', 'Edge Function error', fnError);
          await finish();
          return { ok: false, reason: 'fn_error' as const };
        }

        if (data?.success) {
          setIsSubscribed(true);
          await finish();
          return { ok: true as const };
        }

        log('VERIFY', 'Verification failed response', data);
        await finish();
        return { ok: false, reason: 'verify_failed' as const };
      } catch (e) {
        log('VERIFY', 'Unexpected verify error', e);
        await finish();
        return { ok: false, reason: 'unexpected' as const };
      }
    },
    []
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setLoading(false);
      setError('IAP hook loaded on non-iOS platform');
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        log('INIT', 'Connecting...');
        const conn = await InAppPurchases.connectAsync();
        log('CONNECT', 'Result', conn);

        if (conn.responseCode !== InAppPurchases.IAPResponseCode.OK) {
          throw new Error(conn.debugMessage || `connectAsync failed (${conn.responseCode})`);
        }

        if (cancelled) return;
        setStoreConnected(true);

        log('PRODUCTS', 'Fetching productIds', productIds);
        const prodRes = await InAppPurchases.getProductsAsync(productIds);
        log('PRODUCTS', 'Result', prodRes);

        const results = prodRes.results ?? [];
        if (prodRes.responseCode !== InAppPurchases.IAPResponseCode.OK || results.length === 0) {
          throw new Error('No products returned. App Store Connect setup/attachment is the issue.');
        }

        if (cancelled) return;
        setProducts(
          results.map((p) => ({
            productId: p.productId,
            title: p.title,
            description: p.description,
            price: p.price,
            currencyCode: p.currencyCode,
          }))
        );

        // Listener AFTER products are loaded
        log('LISTENER', 'Setting purchase listener...');
        listenerRef.current = InAppPurchases.setPurchaseListener(async (update) => {
          log('LISTENER', 'Update', update);

          if (!update) return;

          const code = update.responseCode;

          if (code === InAppPurchases.IAPResponseCode.OK) {
            const purchases = update.results ?? [];
            for (const p of purchases) {
              const res = await verifyReceipt(p);
              if (!res.ok) {
                // optional: show a single alert; don’t spam
                Alert.alert('Purchase verification failed', 'We could not verify your purchase. Try Restore Purchases.');
              } else {
                Alert.alert('Success', 'Subscription active!');
              }
            }
            return;
          }

          if (code === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            Alert.alert('Canceled', 'Purchase canceled.');
            return;
          }

          Alert.alert('Purchase error', `Store error: ${InAppPurchases.IAPResponseCode[code]}`);
        });

        await fetchSubscriptionStatusFromDB();
      } catch (e: any) {
        log('INIT', 'Error', e);
        if (!cancelled) {
          setError(e?.message || 'Failed to init IAP');
          setStoreConnected(false);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      try {
        listenerRef.current?.remove?.();
      } catch {}
      InAppPurchases.disconnectAsync().catch(() => {});
    };
  }, [fetchSubscriptionStatusFromDB, productIds, verifyReceipt]);

  const purchaseProduct = useCallback(
    async (productId: string) => {
      if (!storeConnected) {
        Alert.alert('Store not connected', 'IAP not connected.');
        return;
      }

      const exists = products.some((p) => p.productId === productId);
      if (!exists) {
        Alert.alert('Product not loaded', `Product not found: ${productId}`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        log('PURCHASE', `purchaseItemAsync(${productId})`);
        await InAppPurchases.purchaseItemAsync(productId);
        // Listener will handle verification + finishTransaction
      } catch (e: any) {
        log('PURCHASE', 'Error', e);
        setError(e?.message || 'Purchase failed to start');
        Alert.alert('Purchase error', e?.message || 'Purchase failed');
      } finally {
        setLoading(false);
      }
    },
    [products, storeConnected]
  );

  const restorePurchases = useCallback(async () => {
    if (!storeConnected) {
      Alert.alert('Store not connected', 'IAP not connected.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      log('RESTORE', 'getPurchaseHistoryAsync()');
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      log('RESTORE', 'History result', history);

      if (history.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        throw new Error(`Restore failed: ${InAppPurchases.IAPResponseCode[history.responseCode]}`);
      }

      const items = history.results ?? [];
      if (items.length === 0) {
        Alert.alert('No purchases', 'No previous purchases found for this Apple ID.');
        setIsSubscribed(false);
        return;
      }

      // IMPORTANT: verify receipts from history (this is what you were missing)
      let activated = false;
      for (const p of items) {
        const res = await verifyReceipt(p);
        if (res.ok) activated = true;
      }

      await fetchSubscriptionStatusFromDB();

      Alert.alert(
        'Restore complete',
        activated ? 'Subscription restored.' : 'No active subscription found to restore.'
      );
    } catch (e: any) {
      log('RESTORE', 'Error', e);
      setError(e?.message || 'Restore failed');
      Alert.alert('Restore error', e?.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  }, [storeConnected, verifyReceipt, fetchSubscriptionStatusFromDB]);

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