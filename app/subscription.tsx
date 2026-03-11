
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';

// Conditional import for IAP - only available on native platforms
let InAppPurchases: typeof import('expo-in-app-purchases') | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  InAppPurchases = require('expo-in-app-purchases');
}

interface SubscriptionPlan {
  productId: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

// Define subscription plans outside component to prevent re-creation
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    productId: 'Monthly_MG',
    title: 'Monthly Premium',
    price: '$9.99/month',
    description: 'Full access to all premium features',
    features: [
      'Advanced analytics & trends',
      'Multiple goal phases',
      'Custom recipes builder',
      'Habit tracking & streaks',
      'Data export (CSV)',
      'Priority support',
    ],
  },
  {
    productId: 'Yearly_MG',
    title: 'Yearly Premium',
    price: '$79.99/year',
    description: 'Save 33% with annual billing',
    features: [
      'All Monthly Premium features',
      'Save $40 per year',
      'Best value for committed users',
      'Cancel anytime',
    ],
    popular: true,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [iapInitialized, setIapInitialized] = useState(false);

  const verifyPurchaseWithBackend = async (purchase: any, userId: string) => {
    try {
      console.log('[Subscription] Verifying purchase with backend:', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
      });

      const { data, error } = await supabase.functions.invoke('verify-apple-receipt', {
        body: {
          receipt: purchase.transactionReceipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          userId: userId,
        },
      });

      if (error) {
        console.error('[Subscription] Backend verification error:', error);
        throw new Error(error.message || 'Failed to verify purchase with server');
      }

      console.log('[Subscription] Backend verification successful:', data);
      return data;
    } catch (error: any) {
      console.error('[Subscription] Error verifying with backend:', error);
      throw error;
    }
  };

  const handlePurchaseSuccess = async (purchase: any) => {
    try {
      console.log('[Subscription] Processing purchase:', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        acknowledged: purchase.acknowledged,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Subscription] No user found');
        Alert.alert('Error', 'User not found. Please log in again.');
        setPurchasing(false);
        return;
      }

      console.log('[Subscription] Verifying purchase with Apple...');
      
      const verificationResult = await verifyPurchaseWithBackend(purchase, user.id);

      if (!verificationResult?.success) {
        console.error('[Subscription] Verification failed:', verificationResult);
        Alert.alert(
          'Verification Failed',
          'Unable to verify your purchase with Apple. Please contact support if you were charged.'
        );
        setPurchasing(false);
        return;
      }

      console.log('[Subscription] Purchase verified successfully');

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          user_type: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('[Subscription] Error updating user:', updateError);
        throw updateError;
      }

      console.log('[Subscription] User upgraded to premium');

      if (Platform.OS !== 'web' && InAppPurchases) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
        console.log('[Subscription] Transaction finished');
      }

      setPurchasing(false);
      setSelectedPlan(null);
      setIsPremium(true);

      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have access to all premium features.',
        [
          {
            text: 'Get Started',
            onPress: () => router.back(),
          },
        ]
      );

    } catch (error: any) {
      console.error('[Subscription] Error processing purchase:', error);
      Alert.alert(
        'Error',
        'Failed to activate premium: ' + (error.message || 'Unknown error') + '\n\nIf you were charged, your purchase will be restored automatically.'
      );
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  useEffect(() => {
    // Only initialize once
    if (iapInitialized) {
      console.log('[Subscription] IAP already initialized, skipping');
      return;
    }

    const initializeIAP = async () => {
      if (Platform.OS === 'web' || !InAppPurchases) {
        console.log('[Subscription] Web platform or IAP not available');
        setLoading(false);
        return;
      }

      try {
        console.log('[Subscription] Initializing IAP...');
        
        await InAppPurchases.connectAsync();
        console.log('[Subscription] Connected to store');

        const productIds = SUBSCRIPTION_PLANS.map(plan => plan.productId);
        console.log('[Subscription] Fetching products:', productIds);

        const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          console.log('[Subscription] Products fetched:', results?.length || 0);
          setProducts(results || []);
        } else {
          console.error('[Subscription] Failed to fetch products. Response code:', responseCode);
          Alert.alert(
            'Products Not Available',
            'Unable to load subscription products. Please ensure:\n\n1. Products are created in App Store Connect/Google Play Console with IDs:\n   • Monthly_MG\n   • Yearly_MG\n\n2. Products are approved and available\n\n3. You are testing on a real device (not simulator)'
          );
        }

        // Set up purchase listener ONCE
        InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }: any) => {
          console.log('[Subscription] Purchase listener triggered:', { 
            responseCode, 
            errorCode,
            resultsCount: results?.length || 0 
          });
          
          if (responseCode === InAppPurchases.IAPResponseCode.OK) {
            if (results && results.length > 0) {
              results.forEach((purchase: any) => {
                console.log('[Subscription] Processing purchase from listener:', purchase.productId);
                if (!purchase.acknowledged) {
                  handlePurchaseSuccess(purchase);
                } else {
                  console.log('[Subscription] Purchase already acknowledged');
                  setPurchasing(false);
                  setSelectedPlan(null);
                }
              });
            } else {
              console.log('[Subscription] No results in OK response');
              setPurchasing(false);
              setSelectedPlan(null);
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            console.log('[Subscription] User canceled purchase');
            Alert.alert('Cancelled', 'Purchase was cancelled.');
            setPurchasing(false);
            setSelectedPlan(null);
          } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
            console.log('[Subscription] Purchase deferred (awaiting approval)');
            Alert.alert(
              'Purchase Pending',
              'Your purchase is awaiting approval. You will receive access once approved.'
            );
            setPurchasing(false);
            setSelectedPlan(null);
          } else {
            console.error('[Subscription] Purchase failed with code:', responseCode, 'error:', errorCode);
            Alert.alert(
              'Purchase Failed',
              `Unable to complete purchase (Error: ${errorCode || responseCode}). Please try again.`
            );
            setPurchasing(false);
            setSelectedPlan(null);
          }
        });

        setIapInitialized(true);
        console.log('[Subscription] IAP initialization complete');

      } catch (error: any) {
        console.error('[Subscription] IAP initialization error:', error);
        Alert.alert('Error', 'Failed to initialize in-app purchases: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeIAP();
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (userData?.user_type === 'premium') {
        setIsPremium(true);
      }
    } catch (error) {
      console.error('[Subscription] Error checking premium status:', error);
    }
  };

  const handlePurchase = async (productId: string) => {
    if (Platform.OS === 'web' || !InAppPurchases) {
      Alert.alert(
        'Not Available on Web',
        'In-app purchases are only available on iOS and Android. Please use the mobile app to subscribe.'
      );
      return;
    }

    if (purchasing) {
      console.log('[Subscription] Purchase already in progress');
      return;
    }

    try {
      console.log('[Subscription] Starting purchase for:', productId);
      setPurchasing(true);
      setSelectedPlan(productId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to purchase a subscription');
        setPurchasing(false);
        setSelectedPlan(null);
        return;
      }

      console.log('[Subscription] User ID:', user.id);
      console.log('[Subscription] Calling purchaseItemAsync...');

      await InAppPurchases.purchaseItemAsync(productId);
      console.log('[Subscription] purchaseItemAsync called - waiting for listener callback');

    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      
      if (error.code === 'E_IAP_PRODUCT_NOT_FOUND') {
        Alert.alert(
          'Product Not Found',
          'The subscription product was not found. Please ensure:\n\n1. Products are created in App Store Connect/Google Play Console with exact IDs:\n   • Monthly_MG\n   • Yearly_MG\n\n2. Products are approved and available\n\n3. You are testing on a real device'
        );
      } else if (error.code === 'E_USER_CANCELLED') {
        console.log('[Subscription] User cancelled in catch block');
      } else {
        Alert.alert('Purchase Error', error.message || 'Failed to start purchase');
      }
      
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web' || !InAppPurchases) {
      Alert.alert(
        'Not Available on Web',
        'Purchase restoration is only available on iOS and Android. Please use the mobile app.'
      );
      return;
    }

    try {
      console.log('[Subscription] Restoring purchases...');
      setLoading(true);

      const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        console.log('[Subscription] Found purchases to restore:', results.length);
        
        const latestPurchase = results[0];
        await handlePurchaseSuccess(latestPurchase);
        
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        console.log('[Subscription] No purchases to restore');
        Alert.alert('No Purchases Found', 'You have no previous purchases to restore.');
      }

    } catch (error: any) {
      console.error('[Subscription] Restore error:', error);
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (productId: string): string => {
    const product = products.find((p: any) => p.productId === productId);
    const priceText = product?.price || '';
    return priceText;
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Go Premium
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.webMessageContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={64}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.webMessageTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Premium Subscriptions
          </Text>
          <Text style={[styles.webMessageText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            In-app purchases are only available on iOS and Android devices.
          </Text>
          <Text style={[styles.webMessageText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Please download the mobile app to subscribe to Premium and unlock:
          </Text>
          
          <View style={styles.featuresList}>
            {SUBSCRIPTION_PLANS[0].features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading subscription options...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Premium Status
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.premiumStatusContainer}>
          <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={[styles.premiumTitle, { color: isDark ? colors.textDark : colors.text }]}>
            You&apos;re Premium!
          </Text>
          <Text style={[styles.premiumSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Enjoy unlimited access to all premium features
          </Text>

          <View style={[styles.featuresCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.featuresTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Your Premium Features
            </Text>
            {SUBSCRIPTION_PLANS[0].features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: isDark ? colors.textDark : colors.text }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Go Premium
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.heroTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Unlock Premium Features
          </Text>
          <Text style={[styles.heroSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Take your fitness journey to the next level
          </Text>
        </View>

        {SUBSCRIPTION_PLANS.map((plan) => {
          const displayPrice = getProductPrice(plan.productId) || plan.price;
          const isSelected = selectedPlan === plan.productId;
          const isPurchasingThis = purchasing && isSelected;

          return (
            <View
              key={plan.productId}
              style={[
                styles.planCard,
                { backgroundColor: isDark ? colors.cardDark : colors.card },
                plan.popular && styles.popularPlan,
              ]}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={[styles.planTitle, { color: isDark ? colors.textDark : colors.text }]}>
                {plan.title}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {displayPrice}
              </Text>
              <Text style={[styles.planDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {plan.description}
              </Text>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={[styles.featureText, { color: isDark ? colors.textDark : colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  { backgroundColor: colors.primary },
                  isPurchasingThis && styles.subscribeButtonDisabled,
                ]}
                onPress={() => handlePurchase(plan.productId)}
                disabled={purchasing}
              >
                {isPurchasingThis ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.subscribeButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.subscribeButtonText}>
                    Subscribe Now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={[styles.restoreButtonText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
            You can manage your subscription in your App Store account settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  planPrice: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  planDescription: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  subscribeButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  restoreButtonText: {
    ...typography.bodyBold,
    textDecorationLine: 'underline',
  },
  disclaimerContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  disclaimerText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  premiumStatusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  premiumBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  premiumTitle: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featuresCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  button: {
    width: '100%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  webMessageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  webMessageTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  webMessageText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
