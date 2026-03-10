
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
import Purchases, { 
  PurchasesPackage, 
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';

// RevenueCat Configuration - Must match app/_layout.tsx
const ENTITLEMENT_IDENTIFIER = 'Macrogoal Pro';
const PRODUCT_IDS = {
  MONTHLY: 'Monthly_MG',
  YEARLY: 'Yearly_MG',
};

interface SubscriptionPlan {
  productIdentifier: string;
  title: string;
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
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const subscriptionPlans: SubscriptionPlan[] = useMemo(() => [
    {
      productIdentifier: PRODUCT_IDS.MONTHLY,
      title: 'Monthly Premium',
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
      productIdentifier: PRODUCT_IDS.YEARLY,
      title: 'Yearly Premium',
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

  const fetchOfferings = React.useCallback(async () => {
    console.log('[Subscription] ========== FETCHING OFFERINGS ==========');
    
    if (Platform.OS === 'web') {
      console.log('[Subscription] Web platform detected, skipping');
      setLoading(false);
      return;
    }

    try {
      console.log('[Subscription] Step 1: Get current user');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[Subscription] ❌ No user found');
        setErrorMessage('Please log in to access subscriptions');
        setLoading(false);
        return;
      }

      console.log('[Subscription] ✅ User ID:', user.id);

      // CRITICAL FIX: Don't re-initialize SDK here, just fetch offerings
      // The SDK is already initialized in app/_layout.tsx
      console.log('[Subscription] Step 2: Fetching offerings from already-configured SDK...');
      
      const offerings = await Purchases.getOfferings();
      
      console.log('[Subscription] Offerings response:');
      console.log('[Subscription] - All offerings:', Object.keys(offerings.all));
      console.log('[Subscription] - Current offering ID:', offerings.current?.identifier || 'none');
      
      if (offerings.current) {
        console.log('[Subscription] - Available packages:', offerings.current.availablePackages.length);
        offerings.current.availablePackages.forEach((pkg, index) => {
          console.log(`[Subscription]   Package ${index + 1}:`);
          console.log(`[Subscription]     - Identifier: ${pkg.identifier}`);
          console.log(`[Subscription]     - Product ID: ${pkg.product.identifier}`);
          console.log(`[Subscription]     - Price: ${pkg.product.priceString}`);
        });
      }

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('[Subscription] ✅ Packages loaded successfully');
        setPackages(offerings.current.availablePackages);
        setErrorMessage(null);
        setRetryCount(0); // Reset retry count on success
      } else {
        console.warn('[Subscription] ⚠️ No packages available');
        
        const errorMsg = `No subscription packages found.\n\nTroubleshooting:\n\n1. Products Setup:\n   - Create "${PRODUCT_IDS.MONTHLY}" and "${PRODUCT_IDS.YEARLY}" in ${Platform.OS === 'ios' ? 'App Store Connect' : 'Google Play Console'}\n   - Products must be in "Ready to Submit" or "Approved" status\n\n2. RevenueCat Dashboard:\n   - Add products to RevenueCat\n   - Create an offering (e.g., "default")\n   - Link products to the offering\n   - Set "${ENTITLEMENT_IDENTIFIER}" as the entitlement\n\n3. Testing:\n   - Use a real device (not simulator)\n   - Use a sandbox test account\n   - Wait 15-30 minutes after configuration\n\n4. Current Status:\n   - Platform: ${Platform.OS}\n   - User ID: ${user.id}\n   - Available offerings: ${Object.keys(offerings.all).join(', ') || 'none'}`;
        
        setErrorMessage(errorMsg);
      }

      // Get customer info
      console.log('[Subscription] Step 3: Fetching customer info...');
      const info = await Purchases.getCustomerInfo();
      console.log('[Subscription] Customer info received');
      console.log('[Subscription] - Active entitlements:', Object.keys(info.entitlements.active).join(', ') || 'none');
      
      setCustomerInfo(info);
      
      const hasPremium = typeof info.entitlements.active[ENTITLEMENT_IDENTIFIER] !== 'undefined';
      console.log(`[Subscription] - Has "${ENTITLEMENT_IDENTIFIER}":`, hasPremium);
      setIsPremium(hasPremium);

      // Sync to Supabase if premium
      if (hasPremium) {
        console.log('[Subscription] Step 4: Syncing premium status to Supabase...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            user_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('[Subscription] ❌ Error syncing to Supabase:', updateError);
        } else {
          console.log('[Subscription] ✅ Premium status synced to Supabase');
        }
      }

      console.log('[Subscription] ========== FETCH COMPLETE ==========');

    } catch (error: any) {
      console.error('[Subscription] ❌ FETCH ERROR:', error);
      console.error('[Subscription] Error name:', error.name);
      console.error('[Subscription] Error message:', error.message);
      console.error('[Subscription] Error code:', error.code);
      
      // Check if this is a "SDK not configured" error
      if (error.message && error.message.includes('not configured')) {
        console.log('[Subscription] SDK not configured yet, will retry...');
        setErrorMessage('Initializing subscription system... Please wait.');
        
        // Auto-retry after a delay (max 3 times)
        if (retryCount < 3) {
          setTimeout(() => {
            console.log(`[Subscription] Auto-retry ${retryCount + 1}/3`);
            setRetryCount(prev => prev + 1);
            fetchOfferings();
          }, 2000);
        } else {
          setErrorMessage('Failed to initialize subscriptions. Please restart the app and try again.');
        }
      } else {
        const errorMsg = `Failed to load subscriptions:\n\n${error.message}\n\nPlease check:\n1. RevenueCat API key is correct\n2. Products "${PRODUCT_IDS.MONTHLY}" and "${PRODUCT_IDS.YEARLY}" are configured\n3. Products are linked in RevenueCat dashboard\n4. Entitlement "${ENTITLEMENT_IDENTIFIER}" is configured\n5. You're using a real device (not simulator)`;
        
        setErrorMessage(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    console.log('[Subscription] Screen mounted, fetching offerings...');
    // Small delay to ensure SDK is initialized in _layout.tsx
    const timer = setTimeout(() => {
      fetchOfferings();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [fetchOfferings]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'In-app purchases are only available on iOS and Android. Please use the mobile app to subscribe.'
      );
      return;
    }

    try {
      console.log('[Subscription] ========== PURCHASE START ==========');
      console.log('[Subscription] Package:', pkg.identifier);
      console.log('[Subscription] Product ID:', pkg.product.identifier);
      console.log('[Subscription] Price:', pkg.product.priceString);
      
      setPurchasing(true);
      setSelectedPlan(pkg.product.identifier);

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log('[Subscription] ✅ Purchase successful');
      console.log('[Subscription] Active entitlements:', Object.keys(customerInfo.entitlements.active).join(', '));

      const hasPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER] !== 'undefined';
      console.log(`[Subscription] Has "${ENTITLEMENT_IDENTIFIER}":`, hasPremium);

      if (hasPremium) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[Subscription] Updating Supabase...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              user_type: 'premium',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('[Subscription] ❌ Supabase update error:', updateError);
          } else {
            console.log('[Subscription] ✅ Supabase updated');
          }
        }

        setIsPremium(true);
        setCustomerInfo(customerInfo);

        Alert.alert(
          'Welcome to Premium! 🎉',
          'You now have access to all premium features.',
          [{ text: 'Get Started', onPress: () => router.back() }]
        );
      } else {
        console.warn(`[Subscription] ⚠️ Purchase completed but no "${ENTITLEMENT_IDENTIFIER}" entitlement`);
        Alert.alert(
          'Purchase Completed',
          `Your purchase was successful, but premium access is not yet active. This may take a few moments to sync. Please restart the app if you don't see premium features.`
        );
      }

      console.log('[Subscription] ========== PURCHASE COMPLETE ==========');

    } catch (error: any) {
      console.error('[Subscription] ❌ PURCHASE ERROR:', error);
      
      if (error.userCancelled) {
        console.log('[Subscription] User cancelled purchase');
      } else {
        Alert.alert('Purchase Error', error.message || 'Failed to complete purchase');
      }
    } finally {
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Purchase restoration is only available on iOS and Android. Please use the mobile app.'
      );
      return;
    }

    try {
      console.log('[Subscription] ========== RESTORE START ==========');
      setLoading(true);

      const customerInfo = await Purchases.restorePurchases();
      console.log('[Subscription] Restore completed');
      console.log('[Subscription] Active entitlements:', Object.keys(customerInfo.entitlements.active).join(', '));

      const hasPremium = typeof customerInfo.entitlements.active[ENTITLEMENT_IDENTIFIER] !== 'undefined';
      console.log(`[Subscription] Has "${ENTITLEMENT_IDENTIFIER}":`, hasPremium);

      if (hasPremium) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[Subscription] Updating Supabase...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              user_type: 'premium',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('[Subscription] ❌ Supabase update error:', updateError);
          }
        }

        setIsPremium(true);
        setCustomerInfo(customerInfo);
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        console.log('[Subscription] No active subscriptions found');
        Alert.alert('No Purchases Found', 'You have no previous purchases to restore.');
      }

      console.log('[Subscription] ========== RESTORE COMPLETE ==========');

    } catch (error: any) {
      console.error('[Subscription] ❌ RESTORE ERROR:', error);
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const getPackagePrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const getPackageByProductId = (productId: string): PurchasesPackage | undefined => {
    return packages.find(pkg => pkg.product.identifier === productId);
  };

  // Web platform UI
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
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading subscription options...
          </Text>
          {retryCount > 0 && (
            <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Retry attempt {retryCount}/3...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (errorMessage && packages.length === 0) {
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
            Subscriptions
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.errorContainer}>
          <View style={[styles.errorCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={64}
              color="#F59E0B"
            />
            <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Configuration Required
            </Text>
            <Text style={[styles.errorMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {errorMessage}
            </Text>
            
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setRetryCount(0);
                setLoading(true);
                fetchOfferings();
              }}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backButtonAlt, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonAltText, { color: isDark ? colors.textDark : colors.text }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
          const pkg = getPackageByProductId(plan.productIdentifier);
          const displayPrice = pkg ? getPackagePrice(pkg) : 'Not Available';
          const isSelected = selectedPlan === plan.productIdentifier;
          const isPurchasingThis = purchasing && isSelected;

          return (
            <View
              key={plan.productIdentifier}
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
                  (isPurchasingThis || !pkg) && styles.subscribeButtonDisabled,
                ]}
                onPress={() => pkg && handlePurchase(pkg)}
                disabled={purchasing || !pkg}
              >
                {isPurchasingThis ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.subscribeButtonText}>
                    {pkg ? 'Subscribe Now' : 'Not Available'}
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
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  errorContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  errorCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButtonAlt: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  backButtonAltText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
