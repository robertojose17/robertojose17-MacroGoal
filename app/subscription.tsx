
import React, { useState, useEffect } from 'react';
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
import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '@/app/integrations/supabase/client';

interface SubscriptionPlan {
  productId: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [products, setProducts] = useState<InAppPurchases.IAPItemDetails[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const subscriptionPlans: SubscriptionPlan[] = [
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

  useEffect(() => {
    initializeIAP();
    checkPremiumStatus();
  }, []);

  const initializeIAP = async () => {
    try {
      console.log('[Subscription] Initializing IAP...');
      
      // Connect to store
      await InAppPurchases.connectAsync();
      console.log('[Subscription] Connected to store');

      // Get product IDs
      const productIds = subscriptionPlans.map(plan => plan.productId);
      console.log('[Subscription] Fetching products:', productIds);

      // Fetch products from store
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log('[Subscription] Products fetched:', results);
        setProducts(results);
      } else {
        console.error('[Subscription] Failed to fetch products. Response code:', responseCode);
        Alert.alert(
          'Products Not Available',
          'Unable to load subscription products. Please ensure:\n\n1. Products are created in App Store Connect/Google Play Console with IDs:\n   • Monthly_MG\n   • Yearly_MG\n\n2. Products are approved and available\n\n3. You are testing on a real device (not simulator)'
        );
      }

      // Set up purchase listener
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('[Subscription] Purchase listener triggered:', { responseCode, errorCode });
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results?.forEach(purchase => {
            console.log('[Subscription] Purchase successful:', purchase);
            handlePurchaseSuccess(purchase);
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('[Subscription] User canceled purchase');
          setPurchasing(false);
        } else {
          console.error('[Subscription] Purchase failed:', errorCode);
          Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
          setPurchasing(false);
        }
      });

    } catch (error: any) {
      console.error('[Subscription] IAP initialization error:', error);
      Alert.alert('Error', 'Failed to initialize in-app purchases: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePurchaseSuccess = async (purchase: InAppPurchases.InAppPurchase) => {
    try {
      console.log('[Subscription] Processing purchase:', purchase);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Subscription] No user found');
        return;
      }

      // Update user to premium
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

      // Finish transaction
      await InAppPurchases.finishTransactionAsync(purchase, true);
      console.log('[Subscription] Transaction finished');

      setPurchasing(false);
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
      Alert.alert('Error', 'Failed to activate premium: ' + error.message);
      setPurchasing(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      console.log('[Subscription] Starting purchase for:', productId);
      setPurchasing(true);
      setSelectedPlan(productId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to purchase a subscription');
        setPurchasing(false);
        return;
      }

      // Set customer ID for RevenueCat (user's Supabase ID)
      console.log('[Subscription] Setting customer ID:', user.id);

      // Purchase the product
      await InAppPurchases.purchaseItemAsync(productId);
      console.log('[Subscription] Purchase initiated');

    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      
      if (error.code === 'E_IAP_PRODUCT_NOT_FOUND') {
        Alert.alert(
          'Product Not Found',
          'The subscription product was not found. Please ensure:\n\n1. Products are created in App Store Connect/Google Play Console with exact IDs:\n   • Monthly_MG\n   • Yearly_MG\n\n2. Products are approved and available\n\n3. You are testing on a real device'
        );
      } else {
        Alert.alert('Purchase Error', error.message || 'Failed to start purchase');
      }
      
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const handleRestore = async () => {
    try {
      console.log('[Subscription] Restoring purchases...');
      setLoading(true);

      const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
        console.log('[Subscription] Found purchases to restore:', results);
        
        // Process the most recent purchase
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
    const product = products.find(p => p.productId === productId);
    const priceText = product?.price || '';
    return priceText;
  };

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
            {subscriptionPlans[0].features.map((feature, index) => (
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

        {subscriptionPlans.map((plan, index) => {
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
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
});
