
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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import Purchases, { 
  PurchasesPackage, 
  PurchasesOffering,
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import Constants from 'expo-constants';

// Premium features list
const PREMIUM_FEATURES = [
  'Advanced analytics & trends',
  'Multiple goal phases',
  'Custom recipes builder',
  'Habit tracking & streaks',
  'Data export (CSV)',
  'Priority support',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Initialize RevenueCat
  const initializeRevenueCat = async () => {
    if (Platform.OS === 'web') {
      console.log('[Subscription] Web platform - RevenueCat not available');
      setLoading(false);
      return;
    }

    try {
      console.log('[Subscription] Initializing RevenueCat...');

      // Get RevenueCat API keys from app.json
      const revenueCatConfig = Constants.expoConfig?.extra?.revenueCat;
      const apiKey = Platform.select({
        ios: revenueCatConfig?.iosApiKey,
        android: revenueCatConfig?.androidApiKey,
      });

      if (!apiKey || apiKey.includes('YOUR')) {
        console.error('[Subscription] RevenueCat API key not configured');
        Alert.alert(
          'Configuration Error',
          'RevenueCat is not configured. Please add your API keys to the app configuration.'
        );
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Subscription] No user found');
        setLoading(false);
        return;
      }

      // Configure RevenueCat with user ID
      await Purchases.configure({
        apiKey,
        appUserID: user.id, // Use Supabase user ID as RevenueCat app_user_id
      });

      // Enable debug logs in development
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      console.log('[Subscription] RevenueCat configured with user ID:', user.id);

      // Fetch offerings
      const offerings = await Purchases.getOfferings();
      console.log('[Subscription] Offerings fetched:', offerings.current?.identifier);

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        setOfferings(offerings.current);
        setPackages(offerings.current.availablePackages);
        console.log('[Subscription] Available packages:', offerings.current.availablePackages.length);
      } else {
        console.warn('[Subscription] No offerings available');
        Alert.alert(
          'No Subscriptions Available',
          'No subscription plans are currently available. Please ensure:\n\n1. Products are created in RevenueCat\n2. An offering is configured\n3. Products are linked to the offering'
        );
      }

      // Check current premium status
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      const hasActiveEntitlement = info.entitlements.active['premium_access']?.isActive || false;
      setIsPremium(hasActiveEntitlement);
      console.log('[Subscription] Current premium status:', hasActiveEntitlement);

    } catch (error: any) {
      console.error('[Subscription] RevenueCat initialization error:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize subscriptions: ' + (error.message || 'Unknown error')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  // Handle purchase
  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (Platform.OS === 'web') {
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
      console.log('[Subscription] Starting purchase for:', pkg.identifier);
      setPurchasing(true);
      setSelectedPackage(pkg.identifier);

      // Make purchase through RevenueCat
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
      
      console.log('[Subscription] Purchase successful:', productIdentifier);
      console.log('[Subscription] Customer info updated');

      // Check if premium entitlement is now active
      const hasActiveEntitlement = customerInfo.entitlements.active['premium_access']?.isActive || false;
      setIsPremium(hasActiveEntitlement);
      setCustomerInfo(customerInfo);

      if (hasActiveEntitlement) {
        console.log('[Subscription] Premium access granted');
        setShowSuccessModal(true);
      } else {
        console.warn('[Subscription] Purchase completed but premium not active');
        Alert.alert(
          'Purchase Completed',
          'Your purchase was successful. Premium access will be activated shortly.'
        );
      }

    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      
      // Handle specific error codes
      if (error.code === 'PURCHASE_CANCELLED') {
        console.log('[Subscription] User cancelled purchase');
        // Don't show alert for user cancellation
      } else if (error.code === 'PRODUCT_ALREADY_PURCHASED') {
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription. Use "Restore Purchases" if you don\'t see your premium features.'
        );
      } else if (error.code === 'NETWORK_ERROR') {
        Alert.alert(
          'Network Error',
          'Unable to connect to the store. Please check your internet connection and try again.'
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          error.message || 'Unable to complete purchase. Please try again.'
        );
      }
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  // Restore purchases
  const handleRestore = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Purchase restoration is only available on iOS and Android. Please use the mobile app.'
      );
      return;
    }

    try {
      console.log('[Subscription] Restoring purchases...');
      setLoading(true);

      // Restore purchases through RevenueCat
      const info = await Purchases.restorePurchases();
      console.log('[Subscription] Purchases restored');

      setCustomerInfo(info);
      const hasActiveEntitlement = info.entitlements.active['premium_access']?.isActive || false;
      setIsPremium(hasActiveEntitlement);

      if (hasActiveEntitlement) {
        Alert.alert(
          'Success',
          'Your purchases have been restored! You now have access to all premium features.'
        );
      } else {
        Alert.alert(
          'No Active Subscriptions',
          'No active subscriptions were found. If you believe this is an error, please contact support.'
        );
      }

    } catch (error: any) {
      console.error('[Subscription] Restore error:', error);
      Alert.alert(
        'Restore Failed',
        error.message || 'Failed to restore purchases. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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
            {PREMIUM_FEATURES.map((feature, index) => (
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
            {PREMIUM_FEATURES.map((feature, index) => (
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

        {packages.map((pkg, index) => {
          const isSelected = selectedPackage === pkg.identifier;
          const isPurchasingThis = purchasing && isSelected;
          const isPopular = pkg.packageType === 'ANNUAL' || pkg.identifier.toLowerCase().includes('annual') || pkg.identifier.toLowerCase().includes('yearly');

          // Get package details
          const product = pkg.product;
          const title = product.title || pkg.identifier;
          const price = product.priceString;
          const description = product.description || '';

          return (
            <View
              key={pkg.identifier}
              style={[
                styles.planCard,
                { backgroundColor: isDark ? colors.cardDark : colors.card },
                isPopular && styles.popularPlan,
              ]}
            >
              {isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={[styles.planTitle, { color: isDark ? colors.textDark : colors.text }]}>
                {title}
              </Text>
              <Text style={[styles.planPrice, { color: colors.primary }]}>
                {price}
              </Text>
              {description && (
                <Text style={[styles.planDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {description}
                </Text>
              )}

              <View style={styles.featuresContainer}>
                {PREMIUM_FEATURES.map((feature, idx) => (
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
                onPress={() => handlePurchase(pkg)}
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

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={[styles.successIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={64}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Welcome to Premium! 🎉
            </Text>
            <Text style={[styles.modalMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              You now have access to all premium features. Enjoy your enhanced experience!
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButton: {
    width: '100%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
