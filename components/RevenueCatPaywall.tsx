
/**
 * RevenueCat Paywall Component
 * 
 * Complete paywall UI using RevenueCat SDK with:
 * - Product offerings display
 * - Purchase flow
 * - Restore purchases
 * - Customer Center integration
 * - Premium features showcase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { PREMIUM_FEATURES } from '@/config/revenueCatConfig';

interface RevenueCatPaywallProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

export default function RevenueCatPaywall({ visible, onClose, onSubscribed }: RevenueCatPaywallProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [purchasing, setPurchasing] = useState(false);

  const {
    offerings,
    products,
    isPro,
    loading,
    error,
    purchasePackage,
    restorePurchases,
  } = useRevenueCat();

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);

    if (success) {
      onSubscribed?.();
      onClose();
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  const getPackageDisplayName = (packageType: string) => {
    if (packageType.toLowerCase().includes('monthly')) return 'Monthly';
    if (packageType.toLowerCase().includes('annual') || packageType.toLowerCase().includes('yearly')) return 'Annual';
    return 'Premium';
  };

  const getPackagePeriod = (packageType: string) => {
    if (packageType.toLowerCase().includes('monthly')) return '/month';
    if (packageType.toLowerCase().includes('annual') || packageType.toLowerCase().includes('yearly')) return '/year';
    return '';
  };

  const isYearlyPackage = (packageType: string) => {
    return packageType.toLowerCase().includes('annual') || packageType.toLowerCase().includes('yearly');
  };

  if (isPro) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={isDark ? colors.textDark : colors.text}
              />
            </TouchableOpacity>

            <View style={styles.subscribedContainer}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={64}
                color={colors.success}
              />
              <Text style={[styles.subscribedTitle, { color: isDark ? colors.textDark : colors.text }]}>
                You&apos;re a Pro!
              </Text>
              <Text style={[styles.subscribedSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Enjoying all premium features
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.titleSection}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Unlock Macrogoal Pro
              </Text>
              <Text style={[styles.modalSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Get the most out of your fitness journey
              </Text>
            </View>

            <View style={styles.featuresSection}>
              {PREMIUM_FEATURES.map((feature, index) => (
                <React.Fragment key={index}>
                  <FeatureItem
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    isDark={isDark}
                  />
                </React.Fragment>
              ))}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle"
                  android_material_icon_name="warning"
                  size={32}
                  color={colors.error}
                />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {loading && products.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Loading subscription options...
                </Text>
              </View>
            )}

            {!loading && products.length > 0 && offerings?.availablePackages && (
              <View style={styles.pricingSection}>
                {offerings.availablePackages.map((pkg) => {
                  const isYearly = isYearlyPackage(pkg.packageType);
                  return (
                    <React.Fragment key={pkg.identifier}>
                      <TouchableOpacity
                        style={[
                          styles.priceCard,
                          { backgroundColor: isDark ? colors.cardDark : colors.card },
                          isYearly && styles.priceCardHighlighted,
                          purchasing && styles.priceCardDisabled,
                        ]}
                        onPress={() => handlePurchase(pkg)}
                        disabled={purchasing}
                      >
                        <View style={styles.priceCardHeader}>
                          <Text style={[styles.priceCardTitle, { color: isDark ? colors.textDark : colors.text }]}>
                            {getPackageDisplayName(pkg.packageType)}
                          </Text>
                          {isYearly && (
                            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.badgeText}>Best Value</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={[styles.priceAmount, { color: colors.primary }]}>
                            {pkg.product.priceString}
                          </Text>
                          <Text style={[styles.pricePeriod, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                            {getPackagePeriod(pkg.packageType)}
                          </Text>
                        </View>
                        <Text style={[styles.priceDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                          {pkg.product.description}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {!loading && products.length === 0 && !error && (
              <View style={styles.noProductsContainer}>
                <Text style={[styles.noProductsText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  No subscription options available at the moment
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading || purchasing}
            >
              {loading || purchasing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
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
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.sm,
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
  priceCardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 3,
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
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noProductsText: {
    ...typography.body,
    textAlign: 'center',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  restoreButtonText: {
    ...typography.bodyBold,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
  },
  subscribedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  subscribedTitle: {
    ...typography.h2,
  },
  subscribedSubtitle: {
    ...typography.body,
  },
});
