
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

interface SubscriptionPlan {
  packageIdentifier: string;
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

  const subscriptionPlans: SubscriptionPlan[] = useMemo(() => [
    {
      packageIdentifier: '$rc_monthly',
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
      packageIdentifier: '$rc_annual',
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

  const initializeRevenueCat = React.useCallback(async () => {
    console.log('[RevenueCat] Initializing SDK, Platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      console.log('[RevenueCat] Web platform detected, skipping initialization');
      setLoading(false);
      return;
    }

    try {
      console.log('[RevenueCat] Starting initialization...');
      
      // Get current user from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[RevenueCat] No user found');
        setLoading(false);
        Alert.alert('Error', 'Please log in to access subscriptions');
        return;
      }

      console.log('[RevenueCat] User ID:', user.id);

      // Configure RevenueCat SDK with your actual API keys
      const apiKey = Platform.select({
        ios: 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE',
        android: 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE', // Use the same SDK key for both platforms
      });

      if (!apiKey) {
        console.error('[RevenueCat] ❌ API key not configured');
        setLoading(false);
        Alert.alert(
          'Configuration Required',
          'RevenueCat API keys need to be configured.'
        );
        return;
      }

      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      // Configure SDK with user ID
      console.log('[RevenueCat] Configuring SDK with user ID:', user.id);
      await Purchases.configure({ apiKey, appUserID: user.id });
      console.log('[RevenueCat] ✅ SDK configured successfully');

      // Fetch available offerings
      console.log('[RevenueCat] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Offerings received:', offerings);

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('[RevenueCat] ✅ Available packages:', offerings.current.availablePackages.length);
        setPackages(offerings.current.availablePackages);
      } else {
        console.warn('[RevenueCat] ⚠️ No packages available');
        Alert.alert(
          'No Subscriptions Available',
          'No subscription packages are currently available. Please ensure:\n\n1. You have created products in App Store Connect/Google Play Console\n2. You have configured offerings in RevenueCat dashboard\n3. Products are linked to RevenueCat offerings\n4. You are testing on a real device (not simulator for production testing)'
        );
      }

      // Get customer info to check premium status
      console.log('[RevenueCat] Fetching customer info...');
      const info = await Purchases.getCustomerInfo();
      console.log('[RevenueCat] Customer info received');
      setCustomerInfo(info);
      
      // Check if user has active premium entitlement
      const hasPremium = typeof info.entitlements.active['premium'] !== 'undefined';
      console.log('[RevenueCat] Has premium entitlement:', hasPremium);
      setIsPremium(hasPremium);

      // Sync premium status to Supabase
      if (hasPremium) {
        console.log('[RevenueCat] Syncing premium status to Supabase...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            user_type: 'premium',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('[RevenueCat] Error syncing to Supabase:', updateError);
        } else {
          console.log('[RevenueCat] ✅ Premium status synced to Supabase');
        }
      }

    } catch (error: any) {
      console.error('[RevenueCat] ❌ Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize subscriptions: ' + error.message);
    } finally {
      console.log('[RevenueCat] ✅ Setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[RevenueCat] Component mounted, initializing...');
    initializeRevenueCat();
  }, [initializeRevenueCat]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'In-app purchases are only available on iOS and Android. Please use the mobile app to subscribe.'
      );
      return;
    }

    try {
      console.log('[RevenueCat] Starting purchase for package:', pkg.identifier);
      setPurchasing(true);
      setSelectedPlan(pkg.identifier);

      // Make the purchase through RevenueCat
      console.log('[RevenueCat] Calling purchasePackage...');
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log('[RevenueCat] ✅ Purchase successful');

      // Check if user now has premium entitlement
      const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
      console.log('[RevenueCat] Has premium after purchase:', hasPremium);

      if (hasPremium) {
        // Update Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[RevenueCat] Updating Supabase user to premium...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              user_type: 'premium',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('[RevenueCat] Error updating Supabase:', updateError);
          } else {
            console.log('[RevenueCat] ✅ Supabase updated successfully');
          }
        }

        setIsPremium(true);
        setCustomerInfo(customerInfo);

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
      } else {
        console.warn('[RevenueCat] ⚠️ Purchase completed but no premium entitlement found');
        Alert.alert(
          'Purchase Completed',
          'Your purchase was successful, but premium access is not yet active. This may take a few moments to sync. Please restart the app if you don\'t see premium features.'
        );
      }

    } catch (error: any) {
      console.error('[RevenueCat] ❌ Purchase error:', error);
      
      // Handle user cancellation gracefully
      if (error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
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
      console.log('[RevenueCat] Restoring purchases...');
      setLoading(true);

      // Restore purchases through RevenueCat
      const customerInfo = await Purchases.restorePurchases();
      console.log('[RevenueCat] Restore completed');

      // Check if user has premium entitlement
      const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
      console.log('[RevenueCat] Has premium after restore:', hasPremium);

      if (hasPremium) {
        // Update Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('[RevenueCat] Updating Supabase user to premium...');
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              user_type: 'premium',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('[RevenueCat] Error updating Supabase:', updateError);
          }
        }

        setIsPremium(true);
        setCustomerInfo(customerInfo);
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        console.log('[RevenueCat] No active subscriptions found');
        Alert.alert('No Purchases Found', 'You have no previous purchases to restore.');
      }

    } catch (error: any) {
      console.error('[RevenueCat] ❌ Restore error:', error);
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  const getPackagePrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const getPackageByIdentifier = (identifier: string): PurchasesPackage | undefined => {
    return packages.find(pkg => pkg.identifier === identifier);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading subscription options...
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Connecting to RevenueCat...
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

        {subscriptionPlans.map((plan) => {
          const pkg = getPackageByIdentifier(plan.packageIdentifier);
          const displayPrice = pkg ? getPackagePrice(pkg) : 'Loading...';
          const isSelected = selectedPlan === plan.packageIdentifier;
          const isPurchasingThis = purchasing && isSelected;

          return (
            <View
              key={plan.packageIdentifier}
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
});
