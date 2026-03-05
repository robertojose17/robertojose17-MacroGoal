
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

interface SubscriptionPlan {
  productId: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  rcPackage?: PurchasesPackage;
}

/**
 * RevenueCat In-App Purchase Configuration
 * 
 * SETUP REQUIRED:
 * 1. Create a RevenueCat account at https://app.revenuecat.com
 * 2. Create products in RevenueCat Dashboard with IDs: Monthly_MG, Yearly_MG
 * 3. Get your API keys from Project Settings > API Keys
 * 4. Replace the placeholder keys below with your actual keys
 * 5. Configure products in App Store Connect (iOS) and Google Play Console (Android)
 * 6. Set up the webhook in RevenueCat to sync with Supabase
 * 
 * See REVENUECAT_SETUP.md for detailed setup instructions
 */

// RevenueCat API Keys
// TODO: Replace these with your actual RevenueCat API keys from https://app.revenuecat.com
// iOS: Project Settings > API Keys > App-specific API Keys > iOS
// Android: Project Settings > API Keys > App-specific API Keys > Android
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_YOUR_IOS_KEY_HERE', // Replace with your iOS API key
  android: 'goog_YOUR_ANDROID_KEY_HERE', // Replace with your Android API key
}) || '';

// Product identifiers should match your RevenueCat product setup
// These should be configured in RevenueCat Dashboard > Products
const MONTHLY_PRODUCT_ID = 'Monthly_MG';
const YEARLY_PRODUCT_ID = 'Yearly_MG';

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultPlans: SubscriptionPlan[] = useMemo(() => [
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
  ], []);

  useEffect(() => {
    console.log('[Subscription] Initializing subscription screen with RevenueCat');
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      console.log('[Subscription] Configuring RevenueCat SDK');
      
      // Check if API keys are configured
      if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY.includes('YOUR_')) {
        console.warn('[Subscription] ⚠️ RevenueCat API keys not configured');
        console.warn('[Subscription] Please update the API keys in app/subscription.tsx');
        console.warn('[Subscription] See REVENUECAT_SETUP.md for setup instructions');
        setErrorMessage(
          'In-app purchases are not configured yet. Please contact support or check back later.'
        );
        setSubscriptionPlans(defaultPlans);
        setLoading(false);
        return;
      }
      
      // Get current user ID from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Subscription] No user found, cannot initialize RevenueCat');
        setErrorMessage('Please log in to view subscription options');
        setLoading(false);
        return;
      }

      // Configure RevenueCat with user ID
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: user.id,
      });

      console.log('[Subscription] RevenueCat configured for user:', user.id);

      // Check current subscription status
      await checkSubscriptionStatus();

      // Load available offerings
      await loadOfferings();

      setLoading(false);
    } catch (error: any) {
      console.error('[Subscription] Error initializing RevenueCat:', error);
      setErrorMessage('Failed to load subscription options. Please try again.');
      setSubscriptionPlans(defaultPlans);
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      console.log('[Subscription] Checking subscription status via RevenueCat');
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
      
      console.log('[Subscription] Customer info:', {
        activeSubscriptions: customerInfo.activeSubscriptions,
        entitlements: Object.keys(customerInfo.entitlements.active),
      });

      // Check if user has any active entitlements
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlement) {
        console.log('[Subscription] User has active premium subscription');
        setIsPremium(true);
        
        // Sync with Supabase
        await syncPremiumStatusToSupabase(true);
      } else {
        console.log('[Subscription] User does not have active subscription');
        setIsPremium(false);
        await syncPremiumStatusToSupabase(false);
      }
    } catch (error: any) {
      console.error('[Subscription] Error checking subscription status:', error);
    }
  };

  const syncPremiumStatusToSupabase = async (isPremium: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userType = isPremium ? 'premium' : 'free';
      
      const { error } = await supabase
        .from('users')
        .update({ user_type: userType })
        .eq('id', user.id);

      if (error) {
        console.error('[Subscription] Error syncing premium status to Supabase:', error);
      } else {
        console.log('[Subscription] Premium status synced to Supabase:', userType);
      }
    } catch (error) {
      console.error('[Subscription] Error syncing to Supabase:', error);
    }
  };

  const loadOfferings = async () => {
    try {
      console.log('[Subscription] Loading RevenueCat offerings');
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('[Subscription] Found', offerings.current.availablePackages.length, 'packages');
        
        const plans: SubscriptionPlan[] = offerings.current.availablePackages.map((pkg) => {
          const isMonthly = pkg.identifier.toLowerCase().includes('monthly');
          const isYearly = pkg.identifier.toLowerCase().includes('yearly') || pkg.identifier.toLowerCase().includes('annual');
          
          return {
            productId: pkg.identifier,
            title: isMonthly ? 'Monthly Premium' : isYearly ? 'Yearly Premium' : pkg.product.title,
            price: pkg.product.priceString,
            description: isMonthly 
              ? 'Full access to all premium features' 
              : isYearly 
                ? 'Save 33% with annual billing' 
                : pkg.product.description,
            features: defaultPlans[0].features,
            popular: isYearly,
            rcPackage: pkg,
          };
        });
        
        setSubscriptionPlans(plans);
        console.log('[Subscription] Loaded plans:', plans.map(p => p.title));
      } else {
        console.log('[Subscription] No offerings found, using default plans');
        setSubscriptionPlans(defaultPlans);
      }
    } catch (error: any) {
      console.error('[Subscription] Error loading offerings:', error);
      setSubscriptionPlans(defaultPlans);
    }
  };

  const handlePurchase = async (productId: string) => {
    console.log('[Subscription] Purchase initiated for:', productId);
    setSelectedPlan(productId);
    setPurchasing(true);

    try {
      const plan = subscriptionPlans.find(p => p.productId === productId);
      
      if (!plan?.rcPackage) {
        console.error('[Subscription] No RevenueCat package found for product:', productId);
        Alert.alert('Error', 'Unable to process purchase. Please try again.');
        setPurchasing(false);
        setSelectedPlan(null);
        return;
      }

      console.log('[Subscription] Making purchase with RevenueCat');
      const { customerInfo } = await Purchases.purchasePackage(plan.rcPackage);
      
      console.log('[Subscription] Purchase successful!');
      console.log('[Subscription] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      // Check if purchase granted premium access
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlement) {
        console.log('[Subscription] Premium access granted!');
        setIsPremium(true);
        await syncPremiumStatusToSupabase(true);
        
        Alert.alert(
          'Success!',
          'Welcome to Premium! You now have access to all premium features.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        console.log('[Subscription] Purchase completed but no active entitlement found');
        Alert.alert('Purchase Complete', 'Your purchase is being processed. Premium features will be available shortly.');
      }
    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      
      if (error.userCancelled) {
        console.log('[Subscription] User cancelled purchase');
      } else {
        Alert.alert(
          'Purchase Failed',
          error.message || 'Unable to complete purchase. Please try again.'
        );
      }
    } finally {
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const handleRestore = async () => {
    console.log('[Subscription] Restore purchases initiated');
    setLoading(true);

    try {
      console.log('[Subscription] Restoring purchases via RevenueCat');
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('[Subscription] Restore complete');
      console.log('[Subscription] Active entitlements:', Object.keys(customerInfo.entitlements.active));

      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlement) {
        console.log('[Subscription] Premium access restored!');
        setIsPremium(true);
        await syncPremiumStatusToSupabase(true);
        
        Alert.alert(
          'Success!',
          'Your premium subscription has been restored.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        console.log('[Subscription] No active subscriptions found to restore');
        Alert.alert(
          'No Subscriptions Found',
          'We could not find any active subscriptions to restore.'
        );
      }
    } catch (error: any) {
      console.error('[Subscription] Restore error:', error);
      Alert.alert(
        'Restore Failed',
        error.message || 'Unable to restore purchases. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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

  if (errorMessage) {
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
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              setErrorMessage(null);
              setLoading(true);
              initializeRevenueCat();
            }}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
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

        {subscriptionPlans.map((plan) => {
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
                {plan.price}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
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
    color: '#FFFFFF',
    ...typography.bodyBold,
    fontSize: 16,
  },
});
