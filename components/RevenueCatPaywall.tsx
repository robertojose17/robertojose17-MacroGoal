
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface RevenueCatPaywallProps {
  visible: boolean;
  onClose: () => void;
}

export default function RevenueCatPaywall({ visible, onClose }: RevenueCatPaywallProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { offerings, isLoading, purchasePackage, restorePurchases } = useRevenueCat();

  const [selectedPackage, setSelectedPackage] = React.useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = React.useState(false);

  const currentOffering = offerings?.current;
  const availablePackages = React.useMemo(() => {
    return currentOffering?.availablePackages || [];
  }, [currentOffering]);

  // Auto-select yearly package by default
  React.useEffect(() => {
    if (availablePackages.length > 0 && !selectedPackage) {
      const yearlyPackage = availablePackages.find(pkg => 
        pkg.identifier.toLowerCase().includes('annual') || 
        pkg.identifier.toLowerCase().includes('yearly')
      );
      setSelectedPackage(yearlyPackage || availablePackages[0]);
    }
  }, [availablePackages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    const result = await purchasePackage(selectedPackage);
    setPurchasing(false);

    if (result.success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    await restorePurchases();
    setPurchasing(false);
  };

  const openTerms = () => {
    Linking.openURL('https://your-app-url.com/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://your-app-url.com/privacy');
  };

  const formatPrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString;
  };

  const formatPeriod = (pkg: PurchasesPackage) => {
    const identifier = pkg.identifier.toLowerCase();
    if (identifier.includes('annual') || identifier.includes('yearly')) {
      return 'per year';
    }
    if (identifier.includes('monthly')) {
      return 'per month';
    }
    return '';
  };

  const calculateSavings = () => {
    const monthlyPackage = availablePackages.find(pkg => pkg.identifier.toLowerCase().includes('monthly'));
    const yearlyPackage = availablePackages.find(pkg => 
      pkg.identifier.toLowerCase().includes('annual') || 
      pkg.identifier.toLowerCase().includes('yearly')
    );

    if (monthlyPackage && yearlyPackage) {
      const monthlyPrice = monthlyPackage.product.price;
      const yearlyPrice = yearlyPackage.product.price;
      const monthlyCostPerYear = monthlyPrice * 12;
      const savingsAmount = monthlyCostPerYear - yearlyPrice;
      const savingsPercent = Math.round((savingsAmount / monthlyCostPerYear) * 100);
      return savingsPercent;
    }
    return null;
  };

  const savings = calculateSavings();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
              Upgrade to Pro
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Unlock all premium features and take your fitness journey to the next level
            </Text>
          </View>

          {/* Features List */}
          <View style={[styles.featuresCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <FeatureItem
              icon="chart-line"
              title="Advanced Analytics"
              description="7 and 30-day trends, adherence tracking, and detailed insights"
              isDark={isDark}
            />
            <FeatureItem
              icon="restaurant"
              title="Custom Recipes"
              description="Create and save multi-ingredient recipes with automatic macro calculation"
              isDark={isDark}
            />
            <FeatureItem
              icon="check-circle"
              title="Habit Tracking"
              description="Track daily habits, build streaks, and monitor completion rates"
              isDark={isDark}
            />
            <FeatureItem
              icon="download"
              title="Data Export"
              description="Export your nutrition data to CSV for external analysis"
              isDark={isDark}
            />
            <FeatureItem
              icon="lightbulb"
              title="Smart Suggestions"
              description="AI-powered meal recommendations based on your goals"
              isDark={isDark}
            />
            <FeatureItem
              icon="flag"
              title="Multiple Goal Phases"
              description="Switch between cutting, maintaining, and bulking phases"
              isDark={isDark}
            />
          </View>

          {/* Pricing Options */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Loading subscription plans...
              </Text>
            </View>
          ) : availablePackages.length === 0 ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                No subscription plans available
              </Text>
              <Text style={[styles.errorSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Please check your internet connection and try again
              </Text>
            </View>
          ) : (
            <View style={styles.pricingSection}>
              {availablePackages.map((pkg) => {
                const isYearly = pkg.identifier.toLowerCase().includes('annual') || 
                                pkg.identifier.toLowerCase().includes('yearly');
                const isSelected = selectedPackage?.identifier === pkg.identifier;

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.pricingCard,
                      { backgroundColor: isDark ? colors.cardDark : colors.card },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    {isYearly && savings && (
                      <View style={[styles.savingsBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.savingsBadgeText}>
                          Save {savings}%
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.pricingHeader}>
                      <View style={styles.radioButton}>
                        {isSelected && (
                          <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      <View style={styles.pricingInfo}>
                        <Text style={[styles.pricingTitle, { color: isDark ? colors.textDark : colors.text }]}>
                          {isYearly ? 'Annual Plan' : 'Monthly Plan'}
                        </Text>
                        <Text style={[styles.pricingPrice, { color: colors.primary }]}>
                          {formatPrice(pkg)}
                          <Text style={[styles.pricingPeriod, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                            {' '}{formatPeriod(pkg)}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    {isYearly && (
                      <Text style={[styles.pricingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        Best value - billed annually
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Subscribe Button */}
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: colors.primary },
              (purchasing || !selectedPackage) && { opacity: 0.5 },
            ]}
            onPress={handlePurchase}
            disabled={purchasing || !selectedPackage}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                Subscribe Now
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={purchasing}
          >
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
              Restore Purchases
            </Text>
          </TouchableOpacity>

          {/* Legal Links */}
          <View style={styles.legalSection}>
            <Text style={[styles.legalText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={openTerms}>
                <Text style={[styles.legalLink, { color: colors.primary }]}>
                  Terms of Service
                </Text>
              </TouchableOpacity>
              <Text style={[styles.legalSeparator, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {' · '}
              </Text>
              <TouchableOpacity onPress={openPrivacy}>
                <Text style={[styles.legalLink, { color: colors.primary }]}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, title, description, isDark }: any) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
        <IconSymbol
          ios_icon_name="checkmark"
          android_material_icon_name={icon}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.featureText}>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingBottom: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    fontSize: 16,
  },
  featuresCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.caption,
    fontSize: 13,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  errorSubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  pricingSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pricingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '40',
    position: 'relative',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pricingInfo: {
    flex: 1,
  },
  pricingTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  pricingPrice: {
    ...typography.h3,
    fontSize: 20,
  },
  pricingPeriod: {
    ...typography.body,
    fontSize: 14,
  },
  pricingSubtext: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginLeft: 36,
  },
  subscribeButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  restoreButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  legalSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalText: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    ...typography.caption,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...typography.caption,
    fontSize: 12,
  },
});
