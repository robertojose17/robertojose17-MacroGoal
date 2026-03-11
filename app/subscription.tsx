
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { usePremium } from '@/hooks/usePremium';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

// CRITICAL: These must match your RevenueCat dashboard configuration
const ENTITLEMENT_IDENTIFIER = 'Macrogoal Pro';
const PRODUCT_IDS = {
  MONTHLY: 'Monthly_MG',
  YEARLY: 'Yearly_MG',
};

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  rcPackage?: PurchasesPackage;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPremium, loading: premiumLoading, refreshPremiumStatus } = usePremium();

  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    console.log('[Subscription] Starting initialization...');
    setIsInitializing(true);
    setLoading(true);
    setError(null);

    try {
      // CRITICAL: Wait for SDK to be configured
      console.log('[Subscription] Checking if RevenueCat SDK is configured...');
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max wait
      
      while (!Purchases.isConfigured && attempts < maxAttempts) {
        console.log(`[Subscription] SDK not ready, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!Purchases.isConfigured) {
        console.error('[Subscription] ❌ SDK not configured after waiting');
        setError('RevenueCat SDK is not initialized. Please restart the app and try again.');
        setIsInitializing(false);
        setLoading(false);
        return;
      }

      console.log('[Subscription] ✅ SDK is configured, proceeding to fetch offerings');
      setIsInitializing(false);

      // Now fetch offerings
      await fetchOfferings();

    } catch (error: any) {
      console.error('[Subscription] ❌ Initialization error:', error);
      setError('Failed to initialize subscription system. Please try again.');
      setIsInitializing(false);
      setLoading(false);
    }
  };

  const fetchOfferings = async (retryCount = 0) => {
    try {
      console.log('[Subscription] Fetching offerings from RevenueCat...');
      setLoading(true);
      setError(null);

      // Verify SDK is still configured
      if (!Purchases.isConfigured) {
        console.error('[Subscription] SDK not configured when fetching offerings');
        throw new Error('SDK not configured');
      }

      const offerings = await Purchases.getOfferings();
      console.log('[Subscription] Offerings received:', {
        current: offerings.current?.identifier,
        packagesCount: offerings.current?.availablePackages.length || 0,
        allOfferings: Object.keys(offerings.all),
      });

      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        console.warn('[Subscription] No subscription packages available in current offering');
        
        // Check if there are any offerings at all
        const allOfferingKeys = Object.keys(offerings.all);
        if (allOfferingKeys.length > 0) {
          console.log('[Subscription] Found offerings:', allOfferingKeys);
          // Try to use the first available offering
          const firstOffering = offerings.all[allOfferingKeys[0]];
          if (firstOffering && firstOffering.availablePackages.length > 0) {
            console.log('[Subscription] Using first available offering:', firstOffering.identifier);
            const mappedPlans = mapPackagesToPlans(firstOffering.availablePackages);
            setPlans(mappedPlans);
            setLoading(false);
            return;
          }
        }
        
        // Retry logic for SDK initialization race condition
        if (retryCount < 5) {
          console.log(`[Subscription] Retrying in 2 seconds... (attempt ${retryCount + 1}/5)`);
          setTimeout(() => fetchOfferings(retryCount + 1), 2000);
          return;
        }
        
        setError('No subscription packages are currently available. Please make sure you have configured offerings in RevenueCat dashboard with the identifier "Monthly_MG".');
        setLoading(false);
        return;
      }

      // Map RevenueCat packages to our UI format
      const mappedPlans = mapPackagesToPlans(offerings.current.availablePackages);
      console.log('[Subscription] Mapped plans:', mappedPlans.map(p => ({ id: p.id, price: p.price })));
      setPlans(mappedPlans);
      setLoading(false);
    } catch (error: any) {
      console.error('[Subscription] Error fetching offerings:', error);
      console.error('[Subscription] Error details:', {
        message: error.message,
        code: error.code,
        underlyingErrorMessage: error.underlyingErrorMessage,
      });
      
      // Retry logic
      if (retryCount < 5) {
        console.log(`[Subscription] Retrying in 2 seconds... (attempt ${retryCount + 1}/5)`);
        setTimeout(() => fetchOfferings(retryCount + 1), 2000);
        return;
      }
      
      setError(`Failed to load subscription options: ${error.message || 'Unknown error'}. Please check your internet connection and try again.`);
      setLoading(false);
    }
  };

  const mapPackagesToPlans = (packages: PurchasesPackage[]): SubscriptionPlan[] => {
    return packages.map((pkg) => {
      const isMonthly = pkg.product.identifier === PRODUCT_IDS.MONTHLY;
      const isYearly = pkg.product.identifier === PRODUCT_IDS.YEARLY;

      return {
        id: pkg.product.identifier,
        name: isMonthly ? 'Monthly Premium' : isYearly ? 'Yearly Premium' : pkg.product.title,
        price: pkg.product.priceString,
        period: isMonthly ? 'per month' : isYearly ? 'per year' : '',
        features: isMonthly
          ? [
              'Advanced analytics & trends',
              'Multiple goal phases',
              'Custom recipes builder',
              'Habit tracking & streaks',
              'Data export (CSV)',
              'Priority support',
            ]
          : [
              'All Monthly Premium features',
              'Save up to 33% per year',
              'Best value for committed users',
              'Cancel anytime',
            ],
        popular: isYearly,
        rcPackage: pkg,
      };
    });
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!plan.rcPackage) {
      console.error('[Subscription] No RevenueCat package for plan:', plan.id);
      Alert.alert('Error', 'This subscription option is not available.');
      return;
    }

    console.log('[Subscription] Starting purchase for:', plan.id);
    setSelectedPlan(plan.id);

    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(plan.rcPackage);
      
      console.log('[Subscription] ✅ Purchase successful:', {
        productIdentifier,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      // Refresh premium status
      await refreshPremiumStatus();

      // Show success message
      Alert.alert(
        '🎉 Welcome to Premium!',
        'Your subscription is now active. Enjoy all premium features!',
        [
          {
            text: 'Continue',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      
      // User cancelled
      if (error.userCancelled) {
        console.log('[Subscription] User cancelled purchase');
      } else {
        Alert.alert(
          'Purchase Failed',
          error.message || 'Unable to complete purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setSelectedPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      console.log('[Subscription] Restoring purchases...');
      setLoading(true);

      const customerInfo = await Purchases.restorePurchases();
      
      console.log('[Subscription] Restore complete:', {
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      await refreshPremiumStatus();

      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER] !== undefined;

      if (hasPremium) {
        Alert.alert(
          '✅ Purchases Restored',
          'Your premium subscription has been restored!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We could not find any active subscriptions to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('[Subscription] Restore error:', error);
      Alert.alert(
        'Restore Failed',
        error.message || 'Unable to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading || premiumLoading || isInitializing) {
    const loadingMessage = isInitializing 
      ? 'Initializing RevenueCat SDK...' 
      : 'Loading subscription options...';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            {loadingMessage}
          </Text>
          {isInitializing && (
            <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              This may take a few seconds...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
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
            Subscription
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.errorText, { color: isDark ? colors.textDark : colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => initializeAndFetch()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Premium status UI
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
            {[
              'Advanced analytics & trends',
              'Multiple goal phases',
              'Custom recipes builder',
              'Habit tracking & streaks',
              'Data export (CSV)',
              'Priority support',
            ].map((feature, index) => (
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

  // Subscription plans UI
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
        <TouchableOpacity onPress={handleRestorePurchases} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: colors.primary }]}>
            Restore
          </Text>
        </TouchableOpacity>
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

        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isPurchasing = isSelected;

          return (
            <View
              key={plan.id}
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
                {plan.name}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.planPrice, { color: colors.primary }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planPeriod, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {plan.period}
                </Text>
              </View>

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
                  isPurchasing && styles.subscribeButtonDisabled,
                ]}
                onPress={() => handleSubscribe(plan)}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.disclaimerContainer}>
          <Text style={[styles.disclaimerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
            Manage your subscription in the App Store.
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
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  restoreButton: {
    padding: spacing.xs,
  },
  restoreText: {
    ...typography.bodyBold,
    fontSize: 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  planPrice: {
    ...typography.h1,
  },
  planPeriod: {
    ...typography.body,
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
