
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/hooks/useSubscription';
import * as InAppPurchases from 'expo-in-app-purchases';
import { IAP_PRODUCT_IDS, IAP_PRICING, getAllProductIds } from '@/config/iapConfig';

// Calculate savings
const yearlySavings = Math.round((1 - (IAP_PRICING.yearly / 12) / IAP_PRICING.monthly) * 100);
const yearlyMonthlyEquivalent = (IAP_PRICING.yearly / 12).toFixed(2);

export default function PaywallScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isSubscribed, refreshSubscription } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [iapConnected, setIapConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Paywall iOS] Screen mounted, initializing IAP');
    console.log('[Paywall iOS] Product IDs configured:', getAllProductIds());
    console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    initializeIAP();

    return () => {
      console.log('[Paywall iOS] Screen unmounted, disconnecting IAP');
      InAppPurchases.disconnectAsync().catch(err => 
        console.error('[Paywall iOS] Error disconnecting IAP:', err)
      );
    };
  }, []);

  const initializeIAP = async () => {
    try {
      console.log('[Paywall iOS] Step 1: Connecting to App Store...');
      await InAppPurchases.connectAsync();
      setIapConnected(true);
      console.log('[Paywall iOS] ✅ Step 1 Complete: Connected to App Store');

      const productIds = getAllProductIds();
      console.log('[Paywall iOS] Step 2: Fetching products...');
      console.log('[Paywall iOS] Product IDs to fetch:', productIds);
      
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

      console.log('[Paywall iOS] Products API Response:');
      console.log('[Paywall iOS]   - Response Code:', responseCode);
      console.log('[Paywall iOS]   - Products Found:', results?.length || 0);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          setProducts(results);
          console.log('[Paywall iOS] ✅ Step 2 Complete: Products loaded successfully');
          console.log('[Paywall iOS] Product Details:');
          results.forEach((product, index) => {
            console.log(`[Paywall iOS]   ${index + 1}. ${product.productId}`);
            console.log(`[Paywall iOS]      - Title: ${product.title}`);
            console.log(`[Paywall iOS]      - Price: ${product.priceString} (${product.price})`);
            console.log(`[Paywall iOS]      - Description: ${product.description}`);
          });
          setConnectionError(null);
        } else {
          console.error('[Paywall iOS] ❌ Step 2 Failed: No products returned');
          console.error('[Paywall iOS] This means:');
          console.error('[Paywall iOS]   1. Products are not created in App Store Connect, OR');
          console.error('[Paywall iOS]   2. Product IDs in code do not match App Store Connect, OR');
          console.error('[Paywall iOS]   3. Products are not approved/ready for testing');
          console.error('[Paywall iOS]');
          console.error('[Paywall iOS] Expected Product IDs:', productIds);
          console.error('[Paywall iOS]');
          console.error('[Paywall iOS] To fix:');
          console.error('[Paywall iOS]   1. Open App Store Connect');
          console.error('[Paywall iOS]   2. Go to your app → In-App Purchases');
          console.error('[Paywall iOS]   3. Verify products exist with EXACT IDs above');
          console.error('[Paywall iOS]   4. Ensure products are "Ready to Submit"');
          console.error('[Paywall iOS]   5. Wait 2-4 hours after creating products');
          
          const errorMsg = `Products not found in App Store.\n\nExpected Product IDs:\n${productIds.join('\n')}\n\nPlease verify these match your App Store Connect configuration.`;
          setConnectionError(errorMsg);
          
          Alert.alert(
            'Products Not Found',
            'The subscription products are not available. This usually means:\n\n' +
            '1. Products not created in App Store Connect\n' +
            '2. Product IDs don\'t match\n' +
            '3. Products not approved yet\n\n' +
            'Check the console logs for details.',
            [
              { text: 'View Diagnostics', onPress: () => router.push('/iap-diagnostics') },
              { text: 'OK' },
            ]
          );
        }
      } else {
        console.error('[Paywall iOS] ❌ Step 2 Failed: API returned error code:', responseCode);
        const errorMsg = `Failed to fetch products (Code: ${responseCode})`;
        setConnectionError(errorMsg);
        Alert.alert(
          'Products Unavailable',
          'Unable to load subscription options. Please try again later.'
        );
      }
    } catch (error: any) {
      console.error('[Paywall iOS] ❌ Fatal Error during IAP initialization:', error);
      console.error('[Paywall iOS] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      const errorMsg = `Connection error: ${error.message}`;
      setConnectionError(errorMsg);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the App Store. Please check your internet connection and try again.'
      );
    } finally {
      setProductsLoading(false);
      console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  const handleSubscribe = async () => {
    if (!iapConnected) {
      Alert.alert('Not Connected', 'Please wait while we connect to the App Store...');
      return;
    }

    if (products.length === 0) {
      Alert.alert(
        'Products Not Available',
        'Subscription products are not available. Please check your App Store Connect configuration.',
        [
          { text: 'View Diagnostics', onPress: () => router.push('/iap-diagnostics') },
          { text: 'OK' },
        ]
      );
      return;
    }

    try {
      setLoading(true);
      console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Paywall iOS] 🚀 Starting purchase flow');
      console.log('[Paywall iOS] Selected plan:', selectedPlan);

      const productId = IAP_PRODUCT_IDS[selectedPlan];
      console.log('[Paywall iOS] Product ID:', productId);

      // Find the product
      const product = products.find(p => p.productId === productId);
      if (!product) {
        console.error('[Paywall iOS] ❌ Product not found in loaded products');
        console.error('[Paywall iOS] Looking for:', productId);
        console.error('[Paywall iOS] Available products:', products.map(p => p.productId));
        Alert.alert(
          'Product Not Found',
          `The selected subscription (${productId}) is not available. Please try again or contact support.`
        );
        return;
      }

      console.log('[Paywall iOS] 💳 Purchasing product:', {
        productId: product.productId,
        price: product.priceString,
        title: product.title,
      });

      // Purchase the product
      const { responseCode, results } = await InAppPurchases.purchaseItemAsync(productId);

      console.log('[Paywall iOS] Purchase response code:', responseCode);
      console.log('[Paywall iOS] Purchase results:', results);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log('[Paywall iOS] ✅ Purchase successful!');
        
        // Process the purchase
        if (results && results.length > 0) {
          const purchase = results[0];
          console.log('[Paywall iOS] Processing purchase:', {
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            acknowledged: purchase.acknowledged,
          });

          // Finish the transaction
          await InAppPurchases.finishTransactionAsync(purchase, true);
          console.log('[Paywall iOS] ✅ Transaction finished');

          // Refresh subscription status
          await refreshSubscription();
          console.log('[Paywall iOS] ✅ Subscription status refreshed');

          Alert.alert(
            'Success!',
            'Your subscription is now active. Enjoy premium features!',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        console.log('[Paywall iOS] ℹ️ User canceled purchase');
      } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
        console.log('[Paywall iOS] ⏳ Purchase deferred (Ask to Buy)');
        Alert.alert(
          'Purchase Pending',
          'Your purchase is pending approval. You will be notified when it is approved.'
        );
      } else {
        console.error('[Paywall iOS] ❌ Purchase failed with code:', responseCode);
        Alert.alert(
          'Purchase Failed',
          'Unable to complete your purchase. Please try again.'
        );
      }

      console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error('[Paywall iOS] ❌ Error during purchase:', error);
      Alert.alert(
        'Purchase Error',
        error.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!iapConnected) {
      Alert.alert('Not Connected', 'Please wait while we connect to the App Store...');
      return;
    }

    try {
      setLoading(true);
      console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Paywall iOS] 🔄 Restoring purchases...');

      // Get purchase history
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('[Paywall iOS] Restore response code:', responseCode);
      console.log('[Paywall iOS] Purchase history:', results?.length || 0, 'items');

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          console.log('[Paywall iOS] ✅ Found', results.length, 'previous purchases');
          
          // Process each purchase
          for (const purchase of results) {
            console.log('[Paywall iOS] Processing purchase:', {
              productId: purchase.productId,
              transactionId: purchase.transactionId,
            });

            // Finish the transaction
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }

          // Refresh subscription status
          await refreshSubscription();
          console.log('[Paywall iOS] ✅ Subscription status refreshed');

          Alert.alert(
            'Restore Successful',
            'Your purchases have been restored. Your subscription is now active!',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          console.log('[Paywall iOS] ℹ️ No previous purchases found');
          Alert.alert(
            'No Purchases Found',
            'We could not find any previous purchases to restore. If you believe this is an error, please contact support.'
          );
        }
      } else {
        console.error('[Paywall iOS] ❌ Restore failed with code:', responseCode);
        Alert.alert(
          'Restore Failed',
          'Unable to restore purchases. Please try again.'
        );
      }

      console.log('[Paywall iOS] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error('[Paywall iOS] ❌ Error restoring purchases:', error);
      Alert.alert(
        'Restore Error',
        error.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Get product price string or fallback to hardcoded price
  const getProductPrice = (planType: 'monthly' | 'yearly'): string => {
    const product = products.find(p => p.productId === IAP_PRODUCT_IDS[planType]);
    return product?.priceString || `$${IAP_PRICING[planType]}`;
  };

  const isLoadingState = loading || productsLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/iap-diagnostics')} style={styles.diagnosticsButton}>
          <IconSymbol
            ios_icon_name="wrench.and.screwdriver"
            android_material_icon_name="settings"
            size={20}
            color={isDark ? colors.textDark : colors.text}
          />
          <Text style={[styles.diagnosticsText, { color: isDark ? colors.textDark : colors.text }]}>
            Diagnostics
          </Text>
        </TouchableOpacity>
      </View>

      {connectionError && (
        <View style={[styles.errorBanner, { backgroundColor: '#FFF3CD', borderColor: '#FFC107' }]}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={20}
            color="#856404"
          />
          <Text style={[styles.errorText, { color: '#856404' }]}>
            {connectionError}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="auto_awesome"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.heroTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Unlock AI Features
          </Text>
          <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Get instant meal estimates with our AI-powered nutrition assistant
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="sparkles"
            androidIcon="auto_awesome"
            title="AI Meal Estimator"
            description="Describe any meal and get instant calorie and macro estimates"
            isDark={isDark}
          />
          <FeatureItem
            icon="chart.bar.fill"
            androidIcon="bar_chart"
            title="Ingredient Breakdown"
            description="See detailed nutrition for each ingredient in your meals"
            isDark={isDark}
          />
          <FeatureItem
            icon="slider.horizontal.3"
            androidIcon="tune"
            title="Adjust Portions"
            description="Fine-tune ingredient quantities to match your exact portions"
            isDark={isDark}
          />
          <FeatureItem
            icon="bolt.fill"
            androidIcon="flash_on"
            title="Future AI Tools"
            description="Get early access to new AI-powered features as we release them"
            isDark={isDark}
          />
        </View>

        {/* Pricing Plans */}
        <View style={styles.pricingSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Choose Your Plan
          </Text>

          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Loading subscription options...
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.errorContainer}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="error"
                size={48}
                color="#F44336"
              />
              <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Products Not Available
              </Text>
              <Text style={[styles.errorMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Subscription products could not be loaded. This usually means the products are not configured in App Store Connect.
              </Text>
              <TouchableOpacity
                style={[styles.diagnosticsButtonLarge, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/iap-diagnostics')}
              >
                <Text style={styles.diagnosticsButtonText}>Run Diagnostics</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <React.Fragment>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isDark ? colors.cardDark : colors.card,
                    borderColor: selectedPlan === 'monthly' ? colors.primary : (isDark ? colors.borderDark : colors.border),
                    borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.7}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planTitleContainer}>
                    <Text style={[styles.planTitle, { color: isDark ? colors.textDark : colors.text }]}>
                      Monthly
                    </Text>
                    <Text style={[styles.planPrice, { color: colors.primary }]}>
                      {getProductPrice('monthly')}<Text style={styles.planPeriod}>/month</Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      {
                        borderColor: selectedPlan === 'monthly' ? colors.primary : (isDark ? colors.borderDark : colors.border),
                      },
                    ]}
                  >
                    {selectedPlan === 'monthly' && (
                      <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </View>
                <Text style={[styles.planDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Perfect for trying out AI features
                </Text>
              </TouchableOpacity>

              {/* Yearly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isDark ? colors.cardDark : colors.card,
                    borderColor: selectedPlan === 'yearly' ? colors.primary : (isDark ? colors.borderDark : colors.border),
                    borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedPlan('yearly')}
                activeOpacity={0.7}
              >
                <View style={styles.badgeContainer}>
                  <View style={[styles.saveBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.saveBadgeText}>Save {yearlySavings}%</Text>
                  </View>
                </View>
                <View style={styles.planHeader}>
                  <View style={styles.planTitleContainer}>
                    <Text style={[styles.planTitle, { color: isDark ? colors.textDark : colors.text }]}>
                      Yearly
                    </Text>
                    <Text style={[styles.planPrice, { color: colors.primary }]}>
                      {getProductPrice('yearly')}<Text style={styles.planPeriod}>/year</Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      {
                        borderColor: selectedPlan === 'yearly' ? colors.primary : (isDark ? colors.borderDark : colors.border),
                      },
                    ]}
                  >
                    {selectedPlan === 'yearly' && (
                      <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </View>
                <Text style={[styles.planDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Best value - just ${yearlyMonthlyEquivalent}/month
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          )}
        </View>

        {/* Subscribe Button */}
        {products.length > 0 && (
          <React.Fragment>
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                { backgroundColor: colors.primary, opacity: isLoadingState ? 0.6 : 1 },
              ]}
              onPress={handleSubscribe}
              disabled={isLoadingState}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="lock.fill"
                    android_material_icon_name="lock"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.subscribeButtonText}>
                    Subscribe Now
                  </Text>
                </React.Fragment>
              )}
            </TouchableOpacity>

            {/* Restore Button */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              activeOpacity={0.7}
              disabled={isLoadingState}
            >
              <Text style={[styles.restoreButtonText, { color: colors.primary, opacity: isLoadingState ? 0.6 : 1 }]}>
                Restore Purchases
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            • Cancel anytime from your Apple ID settings
          </Text>
          <Text style={[styles.footerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            • Secure payment through Apple
          </Text>
          <Text style={[styles.footerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            • Subscription auto-renews unless canceled
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, androidIcon, title, description, isDark }: any) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
        <IconSymbol
          ios_icon_name={icon}
          android_material_icon_name={androidIcon}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.featureContent}>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  diagnosticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  diagnosticsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    fontSize: 18,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  diagnosticsButtonLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  diagnosticsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  featuresSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  pricingSection: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 24,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
  },
  saveBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planTitleContainer: {
    flex: 1,
  },
  planTitle: {
    ...typography.h3,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  planPrice: {
    ...typography.h2,
    fontSize: 28,
  },
  planPeriod: {
    fontSize: 16,
    fontWeight: '400',
  },
  planDescription: {
    ...typography.body,
    fontSize: 14,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + spacing.xs,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    fontSize: 13,
    textAlign: 'center',
  },
});
