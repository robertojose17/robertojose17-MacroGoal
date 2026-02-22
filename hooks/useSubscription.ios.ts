
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  diagnostics: string[];
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
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const initializedRef = useRef(false);
  const listenerRef = useRef<{ remove?: () => void } | null>(null);
  const isMountedRef = useRef(true);

  // Memoize productIds to prevent unnecessary re-renders
  const productIds = useMemo(() => [IAP_PRODUCT_IDS.monthly, IAP_PRODUCT_IDS.yearly], []);

  const addDiagnostic = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const diagnosticMessage = `[${timestamp}] ${message}`;
    if (isMountedRef.current) {
      setDiagnostics(prev => [...prev, diagnosticMessage]);
    }
    log('DIAGNOSTIC', message);
  }, []);

  const fetchSubscriptionStatusFromDB = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMountedRef.current) {
          setIsSubscribed(false);
        }
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
        if (isMountedRef.current) {
          setIsSubscribed(false);
        }
        return;
      }

      if (isMountedRef.current) {
        setIsSubscribed(!!data);
      }
    } catch (e) {
      log('DB', 'Unexpected error', e);
      if (isMountedRef.current) {
        setIsSubscribed(false);
      }
    }
  }, []);

  const verifyReceipt = useCallback(
    async (purchase: InAppPurchases.InAppPurchase) => {
      const finish = async () => {
        try {
          await InAppPurchases.finishTransactionAsync(purchase, false);
        } catch (e) {
          log('FINISH', 'finishTransactionAsync failed', e);
        }
      };

      try {
        if (!purchase?.transactionReceipt) {
          log('VERIFY', 'No receipt on purchase', purchase);
          addDiagnostic('❌ Purchase has no receipt');
          await finish();
          return { ok: false, reason: 'no_receipt' as const };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          log('VERIFY', 'No authenticated user');
          addDiagnostic('❌ No authenticated user for verification');
          await finish();
          return { ok: false, reason: 'no_user' as const };
        }

        log('VERIFY', 'Sending receipt to Edge Function', {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        });
        addDiagnostic(`📤 Verifying receipt with Apple (Product: ${purchase.productId})`);

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
          addDiagnostic(`❌ Verification failed: ${fnError.message}`);
          await finish();
          return { ok: false, reason: 'fn_error' as const };
        }

        if (data?.success) {
          addDiagnostic('✅ Receipt verified successfully!');
          if (isMountedRef.current) {
            setIsSubscribed(true);
          }
          await finish();
          return { ok: true as const };
        }

        log('VERIFY', 'Verification failed response', data);
        addDiagnostic(`❌ Verification failed: ${data?.error || 'Unknown error'}`);
        await finish();
        return { ok: false, reason: 'verify_failed' as const };
      } catch (e: any) {
        log('VERIFY', 'Unexpected verify error', e);
        addDiagnostic(`❌ Verification error: ${e?.message || 'Unknown'}`);
        await finish();
        return { ok: false, reason: 'unexpected' as const };
      }
    },
    [addDiagnostic]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (Platform.OS !== 'ios') {
      setLoading(false);
      setError('IAP only available on iOS');
      addDiagnostic('⚠️ Not running on iOS - IAP unavailable');
      return;
    }

    if (initializedRef.current) {
      log('INIT', 'Already initialized, skipping');
      return;
    }
    initializedRef.current = true;

    const init = async () => {
      log('INIT', 'Starting initialization sequence');
      
      if (!isMountedRef.current) return;
      
      setLoading(true);
      setError(null);
      setDiagnostics([]);

      try {
        addDiagnostic('🚀 Starting IAP initialization...');
        addDiagnostic(`📦 Product IDs: ${productIds.join(', ')}`);
        
        log('INIT', 'Connecting to StoreKit...');
        addDiagnostic('🔌 Connecting to Apple StoreKit...');
        
        const conn = await InAppPurchases.connectAsync();
        log('CONNECT', 'Result', conn);

        if (!isMountedRef.current) {
          log('INIT', 'Component unmounted after connect');
          return;
        }

        if (conn.responseCode !== InAppPurchases.IAPResponseCode.OK) {
          const errorMsg = conn.debugMessage || `StoreKit connection failed (code: ${conn.responseCode})`;
          addDiagnostic(`❌ StoreKit connection failed: ${errorMsg}`);
          addDiagnostic('💡 Troubleshooting:');
          addDiagnostic('  1. Are you testing on a real iOS device or TestFlight?');
          addDiagnostic('  2. Is the device signed in to a valid Apple ID?');
          addDiagnostic('  3. Is the app properly configured in App Store Connect?');
          addDiagnostic('  4. Check Bundle ID matches: com.robertojose17.macrogoal');
          
          if (isMountedRef.current) {
            setError(errorMsg);
            setStoreConnected(false);
            setLoading(false);
          }
          return;
        }

        addDiagnostic('✅ Connected to StoreKit successfully');
        
        if (isMountedRef.current) {
          setStoreConnected(true);
        }

        if (!isMountedRef.current) {
          log('INIT', 'Component unmounted after setting storeConnected');
          return;
        }

        log('PRODUCTS', 'Fetching productIds', productIds);
        addDiagnostic('📦 Fetching product information from App Store...');
        
        const prodRes = await InAppPurchases.getProductsAsync(productIds);
        log('PRODUCTS', 'Result', prodRes);

        if (!isMountedRef.current) {
          log('INIT', 'Component unmounted after getProductsAsync');
          return;
        }

        const results = prodRes.results ?? [];
        
        if (prodRes.responseCode !== InAppPurchases.IAPResponseCode.OK) {
          addDiagnostic(`❌ Product fetch failed with code: ${prodRes.responseCode}`);
          
          if (isMountedRef.current) {
            setError('Failed to fetch products from App Store');
            setLoading(false);
          }
          return;
        }

        if (results.length === 0) {
          addDiagnostic('❌ No products returned from App Store');
          addDiagnostic('💡 Common causes:');
          addDiagnostic('  1. Product IDs don\'t match App Store Connect exactly');
          addDiagnostic('  2. Products not in "Ready to Submit" status');
          addDiagnostic('  3. Bundle ID mismatch (app.json vs App Store Connect)');
          addDiagnostic('  4. Testing on Simulator (use real device/TestFlight)');
          addDiagnostic('  5. Products not configured as Auto-Renewable Subscriptions');
          addDiagnostic(`  6. Expected IDs: ${productIds.join(', ')}`);
          
          if (isMountedRef.current) {
            setError('No products available. Check App Store Connect setup.');
            setProducts([]);
            setLoading(false);
          }
          return;
        }

        addDiagnostic(`✅ Loaded ${results.length} product(s) successfully`);
        results.forEach((p, i) => {
          addDiagnostic(`  ${i + 1}. ${p.title} (${p.productId}) - ${p.price}`);
        });

        if (isMountedRef.current) {
          setProducts(
            results.map((p) => ({
              productId: p.productId,
              title: p.title,
              description: p.description,
              price: p.price,
              currencyCode: p.currencyCode,
            }))
          );
        }

        if (!isMountedRef.current) {
          log('INIT', 'Component unmounted after setting products');
          return;
        }

        log('LISTENER', 'Setting purchase listener...');
        addDiagnostic('🎧 Setting up purchase listener...');
        
        listenerRef.current = InAppPurchases.setPurchaseListener(async (update) => {
          log('LISTENER', 'Update', update);

          if (!update) {
            addDiagnostic('⚠️ Received empty purchase update');
            return;
          }

          const code = update.responseCode;
          addDiagnostic(`📥 Purchase update received (code: ${code})`);

          if (code === InAppPurchases.IAPResponseCode.OK) {
            const purchases = update.results ?? [];
            addDiagnostic(`✅ Purchase successful (${purchases.length} transaction(s))`);
            
            for (const p of purchases) {
              addDiagnostic(`🔍 Verifying transaction: ${p.transactionId}`);
              const res = await verifyReceipt(p);
              if (!res.ok) {
                Alert.alert('Purchase verification failed', 'We could not verify your purchase. Try Restore Purchases.');
              } else {
                Alert.alert('Success', 'Subscription active!');
              }
            }
            return;
          }

          if (code === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            addDiagnostic('ℹ️ User canceled the purchase');
            Alert.alert('Canceled', 'Purchase canceled.');
            return;
          }

          addDiagnostic(`❌ Purchase failed with code: ${code}`);
          Alert.alert('Purchase error', `Store error: ${InAppPurchases.IAPResponseCode[code]}`);
        });

        addDiagnostic('✅ Purchase listener active');
        addDiagnostic('🎉 IAP initialization complete!');

        await fetchSubscriptionStatusFromDB();
        
        // Ensure loading is set to false after everything completes successfully
        if (isMountedRef.current) {
          setLoading(false);
        }
        log('INIT', 'Initialization complete, loading set to false');
      } catch (e: any) {
        log('INIT', 'Error', e);
        if (isMountedRef.current) {
          const errorMessage = e?.message || 'Failed to initialize IAP';
          setError(errorMessage);
          addDiagnostic(`❌ Initialization failed: ${errorMessage}`);
          setStoreConnected(false);
          setProducts([]);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      log('CLEANUP', 'Cleaning up IAP resources');
      isMountedRef.current = false;
      try {
        listenerRef.current?.remove?.();
        listenerRef.current = null;
      } catch (e) {
        log('CLEANUP', 'Error removing listener', e);
      }
      InAppPurchases.disconnectAsync().catch((e) => {
        log('CLEANUP', 'Error disconnecting', e);
      });
    };
  }, [fetchSubscriptionStatusFromDB, productIds, verifyReceipt, addDiagnostic]);

  const purchaseProduct = useCallback(
    async (productId: string) => {
      if (!storeConnected) {
        Alert.alert('Store not connected', 'Cannot connect to App Store. Please try again later.');
        addDiagnostic('❌ Purchase attempt failed: Store not connected');
        return;
      }

      const exists = products.some((p) => p.productId === productId);
      if (!exists) {
        Alert.alert('Product not available', `Product not found: ${productId}`);
        addDiagnostic(`❌ Purchase attempt failed: Product ${productId} not found`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        log('PURCHASE', `purchaseItemAsync(${productId})`);
        addDiagnostic(`🛒 Initiating purchase for: ${productId}`);
        await InAppPurchases.purchaseItemAsync(productId);
        addDiagnostic('✅ Purchase initiated - waiting for App Store response...');
      } catch (e: any) {
        log('PURCHASE', 'Error', e);
        const errorMessage = e?.message || 'Purchase failed to start';
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        addDiagnostic(`❌ Purchase failed: ${errorMessage}`);
        Alert.alert('Purchase error', errorMessage);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [products, storeConnected, addDiagnostic]
  );

  const restorePurchases = useCallback(async () => {
    if (!storeConnected) {
      Alert.alert('Store not connected', 'Cannot connect to App Store. Please try again later.');
      addDiagnostic('❌ Restore attempt failed: Store not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      log('RESTORE', 'getPurchaseHistoryAsync()');
      addDiagnostic('🔄 Restoring purchases from Apple...');
      
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      log('RESTORE', 'History result', history);

      if (history.responseCode !== InAppPurchases.IAPResponseCode.OK) {
        const errorMsg = `Restore failed: ${InAppPurchases.IAPResponseCode[history.responseCode]}`;
        addDiagnostic(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const items = history.results ?? [];
      addDiagnostic(`📦 Found ${items.length} previous purchase(s)`);
      
      if (items.length === 0) {
        addDiagnostic('ℹ️ No previous purchases found for this Apple ID');
        Alert.alert('No purchases', 'No previous purchases found for this Apple ID.');
        if (isMountedRef.current) {
          setIsSubscribed(false);
        }
        return;
      }

      let activated = false;
      for (const p of items) {
        addDiagnostic(`🔍 Verifying restored transaction: ${p.transactionId}`);
        const res = await verifyReceipt(p);
        if (res.ok) activated = true;
      }

      await fetchSubscriptionStatusFromDB();

      const message = activated ? 'Subscription restored successfully!' : 'No active subscription found to restore.';
      addDiagnostic(activated ? '✅ Restore successful!' : 'ℹ️ No active subscription found');
      
      Alert.alert('Restore complete', message);
    } catch (e: any) {
      log('RESTORE', 'Error', e);
      const errorMessage = e?.message || 'Restore failed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      addDiagnostic(`❌ Restore failed: ${errorMessage}`);
      Alert.alert('Restore error', errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [storeConnected, verifyReceipt, fetchSubscriptionStatusFromDB, addDiagnostic]);

  return {
    products,
    purchaseProduct,
    restorePurchases,
    isSubscribed,
    loading,
    error,
    storeConnected,
    diagnostics,
  };
};

// Helper function for logging with timestamp
export const logWithTimestamp = (tag: string, message: string, data?: any): string => {
  log(tag, message, data);
  return `[${tag}] ${message}`;
};
</write file>

Now let me also update the SubscriptionButton component to show better error messages in Spanish since the user is Spanish-speaking:

<write file="components/SubscriptionButton.tsx">
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSubscription } from '@/hooks/useSubscription';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

interface SubscriptionButtonProps {
  onSubscribed?: () => void;
}

export default function SubscriptionButton({ onSubscribed }: SubscriptionButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showModal, setShowModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const { products, purchaseProduct, restorePurchases, isSubscribed, loading, error, storeConnected, diagnostics } = useSubscription();

  const handlePurchase = async (productId: string) => {
    await purchaseProduct(productId);
    if (onSubscribed) {
      onSubscribed();
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  const getProductDisplayName = (productId: string) => {
    if (productId.includes('monthly')) return 'Monthly';
    if (productId.includes('yearly')) return 'Annual';
    return 'Premium';
  };

  const getProductPeriod = (productId: string) => {
    if (productId.includes('monthly')) return '/month';
    if (productId.includes('yearly')) return '/year';
    return '';
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={[styles.notAvailableContainer, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={32}
          color={colors.textSecondary}
        />
        <Text style={[styles.notAvailableText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          In-App Purchases are only available on iOS
        </Text>
      </View>
    );
  }

  if (isSubscribed) {
    return (
      <View style={[styles.subscribedContainer, { backgroundColor: colors.success + '20' }]}>
        <IconSymbol
          ios_icon_name="checkmark.circle.fill"
          android_material_icon_name="check-circle"
          size={32}
          color={colors.success}
        />
        <Text style={[styles.subscribedText, { color: colors.success }]}>
          Premium Active
        </Text>
      </View>
    );
  }

  const canPurchase = storeConnected && products.length > 0 && !loading;
  const canRestore = storeConnected && !loading;

  return (
    <>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowModal(true)}
      >
        <IconSymbol
          ios_icon_name="star.fill"
          android_material_icon_name="star"
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={isDark ? colors.textDark : colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.titleSection}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={48}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Unlock Premium Features
                </Text>
                <Text style={[styles.modalSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Get the most out of Macro Goal
                </Text>
              </View>

              <View style={styles.featuresSection}>
                <FeatureItem
                  icon="trending-up"
                  title="Advanced Analytics"
                  description="7/30-day charts, trends, and adherence tracking"
                  isDark={isDark}
                />
                <FeatureItem
                  icon="restaurant"
                  title="Custom Recipes"
                  description="Multi-ingredient recipe builder"
                  isDark={isDark}
                />
                <FeatureItem
                  icon="flag"
                  title="Multiple Goal Phases"
                  description="Switch between cut, maintain, and bulk"
                  isDark={isDark}
                />
                <FeatureItem
                  icon="check-circle"
                  title="Habit Tracking"
                  description="Track streaks and completion rates"
                  isDark={isDark}
                />
                <FeatureItem
                  icon="download"
                  title="Data Export"
                  description="Export your data as CSV"
                  isDark={isDark}
                />
                <FeatureItem
                  icon="lightbulb"
                  title="Smart Suggestions"
                  description="AI-powered tips and recommendations"
                  isDark={isDark}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="error"
                    size={48}
                    color={colors.error}
                  />
                  <Text style={[styles.errorTitle, { color: colors.error }]}>
                    Connection Error
                  </Text>
                  <Text style={[styles.errorText, { color: isDark ? colors.textDark : colors.text }]}>
                    {error}
                  </Text>
                  <View style={[styles.errorHintBox, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                    <Text style={[styles.errorHintTitle, { color: isDark ? colors.textDark : colors.text }]}>
                      💡 Troubleshooting Steps:
                    </Text>
                    <Text style={[styles.errorHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      • Make sure you&apos;re testing on a real iOS device or TestFlight (not Simulator)
                    </Text>
                    <Text style={[styles.errorHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      • Verify your device is signed in to a valid Apple ID
                    </Text>
                    <Text style={[styles.errorHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      • Check that you have an active internet connection
                    </Text>
                    <Text style={[styles.errorHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      • Try restarting the app
                    </Text>
                  </View>
                  
                  {diagnostics.length > 0 && (
                    <TouchableOpacity 
                      style={[styles.diagnosticsButton, { borderColor: colors.primary }]}
                      onPress={() => setShowDiagnostics(!showDiagnostics)}
                    >
                      <Text style={[styles.diagnosticsButtonText, { color: colors.primary }]}>
                        {showDiagnostics ? 'Hide' : 'Show'} Technical Details
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {showDiagnostics && diagnostics.length > 0 && (
                <View style={[styles.diagnosticsContainer, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                  <Text style={[styles.diagnosticsTitle, { color: isDark ? colors.textDark : colors.text }]}>
                    Connection Diagnostics
                  </Text>
                  <ScrollView style={styles.diagnosticsScroll} nestedScrollEnabled>
                    {diagnostics.map((diag, index) => (
                      <Text 
                        key={index} 
                        style={[styles.diagnosticLine, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}
                      >
                        {diag}
                      </Text>
                    ))}
                  </ScrollView>
                </View>
              )}

              {loading && products.length === 0 && !error && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Connecting to App Store...
                  </Text>
                  <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    This may take a few seconds
                  </Text>
                </View>
              )}

              {!loading && !error && products.length > 0 && (
                <View style={styles.pricingSection}>
                  {products.map((product) => (
                    <TouchableOpacity
                      key={product.productId}
                      style={[
                        styles.priceCard,
                        { backgroundColor: isDark ? colors.cardDark : colors.card },
                        !canPurchase && styles.priceCardDisabled,
                      ]}
                      onPress={() => handlePurchase(product.productId)}
                      disabled={!canPurchase}
                    >
                      <View style={styles.priceCardHeader}>
                        <Text style={[styles.priceCardTitle, { color: isDark ? colors.textDark : colors.text }]}>
                          {getProductDisplayName(product.productId)}
                        </Text>
                        {product.productId.includes('yearly') && (
                          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.badgeText}>Best Value</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceAmount, { color: colors.primary }]}>
                          {product.price}
                        </Text>
                        <Text style={[styles.pricePeriod, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                          {getProductPeriod(product.productId)}
                        </Text>
                      </View>
                      <Text style={[styles.priceDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {product.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!loading && !error && products.length === 0 && (
                <View style={styles.noProductsContainer}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.circle"
                    android_material_icon_name="info"
                    size={48}
                    color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  />
                  <Text style={[styles.noProductsText, { color: isDark ? colors.textDark : colors.text }]}>
                    No subscription options available
                  </Text>
                  <Text style={[styles.noProductsSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Please check your App Store Connect configuration
                  </Text>
                  {diagnostics.length > 0 && (
                    <TouchableOpacity 
                      style={[styles.diagnosticsButton, { borderColor: colors.primary, marginTop: spacing.md }]}
                      onPress={() => setShowDiagnostics(!showDiagnostics)}
                    >
                      <Text style={[styles.diagnosticsButtonText, { color: colors.primary }]}>
                        {showDiagnostics ? 'Hide' : 'Show'} Technical Details
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.restoreButton, !canRestore && styles.restoreButtonDisabled]}
                onPress={handleRestore}
                disabled={!canRestore}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.restoreButtonText, { color: canRestore ? colors.primary : colors.textSecondary }]}>
                    Restore Purchases
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.footerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Subscriptions auto-renew unless canceled 24 hours before the end of the current period.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function FeatureItem({ icon, title, description, isDark }: { icon: string; title: string; description: string; isDark: boolean }) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: colors.primary + '20' }]}>
        <IconSymbol
          ios_icon_name={icon}
          android_material_icon_name={icon}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: isDark ? colors.textDark : colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subscribedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  subscribedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notAvailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  notAvailableText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.h2,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  featuresSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.caption,
  },
  pricingSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  priceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  priceCardDisabled: {
    opacity: 0.5,
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceCardTitle: {
    ...typography.h3,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  priceDescription: {
    ...typography.caption,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyBold,
  },
  loadingSubtext: {
    ...typography.caption,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  errorHintBox: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  errorHintTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  errorHint: {
    ...typography.caption,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  diagnosticsButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  diagnosticsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diagnosticsContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    maxHeight: 200,
  },
  diagnosticsTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  diagnosticsScroll: {
    maxHeight: 150,
  },
  diagnosticLine: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: spacing.xs,
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  noProductsText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  noProductsSubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  restoreButtonDisabled: {
    opacity: 0.5,
  },
  restoreButtonText: {
    ...typography.bodyBold,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
  },
});
