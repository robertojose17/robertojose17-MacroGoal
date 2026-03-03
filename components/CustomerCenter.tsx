
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
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface CustomerCenterProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomerCenter({ visible, onClose }: CustomerCenterProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPro, customerInfo, isLoading, restorePurchases } = useRevenueCat();

  const [restoring, setRestoring] = React.useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    await restorePurchases();
    setRestoring(false);
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const getSubscriptionStatus = () => {
    if (!customerInfo) return null;

    const entitlement = customerInfo.entitlements.active['Macrogoal Pro'];
    if (!entitlement) return null;

    const expirationDate = entitlement.expirationDate;
    const willRenew = entitlement.willRenew;

    return {
      isActive: true,
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      willRenew,
      productIdentifier: entitlement.productIdentifier,
    };
  };

  const subscriptionStatus = getSubscriptionStatus();

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProductName = (identifier: string) => {
    if (identifier.toLowerCase().includes('annual') || identifier.toLowerCase().includes('yearly')) {
      return 'Annual Plan';
    }
    if (identifier.toLowerCase().includes('monthly')) {
      return 'Monthly Plan';
    }
    return identifier;
  };

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
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Subscription
          </Text>
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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Loading subscription info...
              </Text>
            </View>
          ) : isPro && subscriptionStatus ? (
            <>
              {/* Pro Status Card */}
              <View style={[styles.statusCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                <View style={styles.statusHeader}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.statusTitle, { color: colors.primary }]}>
                    Pro Member
                  </Text>
                </View>
                <Text style={[styles.statusSubtitle, { color: isDark ? colors.textDark : colors.text }]}>
                  You have access to all premium features
                </Text>
              </View>

              {/* Subscription Details */}
              <View style={[styles.detailsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Subscription Details
                </Text>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Plan
                  </Text>
                  <Text style={[styles.detailValue, { color: isDark ? colors.textDark : colors.text }]}>
                    {getProductName(subscriptionStatus.productIdentifier)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Status
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.success }]}>
                    Active
                  </Text>
                </View>

                {subscriptionStatus.expirationDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      {subscriptionStatus.willRenew ? 'Renews on' : 'Expires on'}
                    </Text>
                    <Text style={[styles.detailValue, { color: isDark ? colors.textDark : colors.text }]}>
                      {formatDate(subscriptionStatus.expirationDate)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Manage Subscription Button */}
              <TouchableOpacity
                style={[styles.manageButton, { backgroundColor: colors.primary }]}
                onPress={handleManageSubscription}
              >
                <Text style={styles.manageButtonText}>
                  Manage Subscription
                </Text>
                <IconSymbol
                  ios_icon_name="arrow.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <Text style={[styles.manageHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                You will be redirected to {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} to manage your subscription
              </Text>
            </>
          ) : (
            <>
              {/* Free User Card */}
              <View style={[styles.statusCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                <View style={styles.statusHeader}>
                  <IconSymbol
                    ios_icon_name="person"
                    android_material_icon_name="person"
                    size={32}
                    color={isDark ? colors.textDark : colors.text}
                  />
                  <Text style={[styles.statusTitle, { color: isDark ? colors.textDark : colors.text }]}>
                    Free Member
                  </Text>
                </View>
                <Text style={[styles.statusSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Upgrade to Pro to unlock all premium features
                </Text>
              </View>

              {/* Restore Purchases */}
              <View style={[styles.detailsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Already subscribed?
                </Text>
                <Text style={[styles.restoreHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  If you previously purchased a subscription, you can restore it here.
                </Text>
                <TouchableOpacity
                  style={[styles.restoreButton, { backgroundColor: colors.primary }]}
                  onPress={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.restoreButtonText}>
                      Restore Purchases
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
  },
  statusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusTitle: {
    ...typography.h2,
  },
  statusSubtitle: {
    ...typography.body,
    marginLeft: 40,
  },
  detailsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.body,
  },
  detailValue: {
    ...typography.bodyBold,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manageHint: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  restoreHint: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  restoreButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
