
/**
 * RevenueCat Customer Center Component
 * 
 * Provides users with subscription management capabilities:
 * - View current subscription status
 * - Manage subscription (cancel, change plan)
 * - View billing history
 * - Contact support
 * 
 * This integrates with RevenueCat's Customer Center feature.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

interface CustomerCenterProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomerCenter({ visible, onClose }: CustomerCenterProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { customerInfo, isPro, restorePurchases } = useRevenueCat();

  const handleManageSubscription = () => {
    // Open Apple's subscription management page
    const url = 'https://apps.apple.com/account/subscriptions';
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open subscription management page');
    });
  };

  const handleContactSupport = () => {
    // Open email to support
    const email = 'support@macrogoal.app';
    const subject = 'Subscription Support Request';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open email client');
    });
  };

  const handleRestorePurchases = async () => {
    await restorePurchases();
  };

  const getSubscriptionStatus = () => {
    if (!customerInfo) return 'Unknown';
    if (isPro) return 'Active';
    return 'Inactive';
  };

  const getActiveSubscriptions = () => {
    if (!customerInfo) return [];
    return customerInfo.activeSubscriptions;
  };

  const getExpirationDate = () => {
    if (!customerInfo || !isPro) return null;
    
    const entitlement = customerInfo.entitlements.active['Macrogoal Pro'];
    if (!entitlement) return null;

    const expirationDate = entitlement.expirationDate;
    if (!expirationDate) return null;

    return new Date(expirationDate).toLocaleDateString();
  };

  const statusText = getSubscriptionStatus();
  const activeSubscriptions = getActiveSubscriptions();
  const expirationDate = getExpirationDate();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Subscription Management
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

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.statusCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <View style={styles.statusHeader}>
                <IconSymbol
                  ios_icon_name={isPro ? 'checkmark.circle.fill' : 'info.circle'}
                  android_material_icon_name={isPro ? 'check-circle' : 'info'}
                  size={32}
                  color={isPro ? colors.success : colors.textSecondary}
                />
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Status
                  </Text>
                  <Text style={[styles.statusValue, { color: isDark ? colors.textDark : colors.text }]}>
                    {statusText}
                  </Text>
                </View>
              </View>

              {isPro && expirationDate && (
                <View style={styles.expirationContainer}>
                  <Text style={[styles.expirationLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Renews on
                  </Text>
                  <Text style={[styles.expirationDate, { color: isDark ? colors.textDark : colors.text }]}>
                    {expirationDate}
                  </Text>
                </View>
              )}

              {activeSubscriptions.length > 0 && (
                <View style={styles.subscriptionsContainer}>
                  <Text style={[styles.subscriptionsLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Active Subscriptions
                  </Text>
                  {activeSubscriptions.map((sub, index) => (
                    <React.Fragment key={index}>
                      <Text style={[styles.subscriptionItem, { color: isDark ? colors.textDark : colors.text }]}>
                        • {sub}
                      </Text>
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                onPress={handleManageSubscription}
              >
                <IconSymbol
                  ios_icon_name="gear"
                  android_material_icon_name="settings"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                    Manage Subscription
                  </Text>
                  <Text style={[styles.actionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Change plan or cancel subscription
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                onPress={handleRestorePurchases}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                    Restore Purchases
                  </Text>
                  <Text style={[styles.actionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Sync your subscription across devices
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                onPress={handleContactSupport}
              >
                <IconSymbol
                  ios_icon_name="envelope"
                  android_material_icon_name="email"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                    Contact Support
                  </Text>
                  <Text style={[styles.actionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Get help with your subscription
                  </Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.footerText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Subscriptions are managed through your Apple ID. Changes made in the App Store will be reflected here.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h3,
  },
  closeButton: {
    padding: spacing.xs,
  },
  statusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h3,
  },
  expirationContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '20',
  },
  expirationLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  expirationDate: {
    ...typography.bodyBold,
  },
  subscriptionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '20',
  },
  subscriptionsLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  subscriptionItem: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  actionsSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.caption,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
  },
});
