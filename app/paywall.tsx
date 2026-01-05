
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/hooks/useSubscription';
import { STRIPE_CONFIG } from '@/utils/stripeConfig';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { createCheckoutSession, restoreSubscription, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const premiumFeatures = [
    { icon: 'chart.bar.fill', title: 'Advanced Analytics', description: '7/30-day trends & adherence' },
    { icon: 'target', title: 'Multiple Goal Phases', description: 'Cut, maintain, bulk cycles' },
    { icon: 'fork.knife', title: 'Custom Recipes', description: 'Multi-ingredient meal builder' },
    { icon: 'checkmark.circle.fill', title: 'Habit Tracking', description: 'Streaks & completion stats' },
    { icon: 'arrow.down.doc.fill', title: 'Data Export', description: 'CSV export for all data' },
    { icon: 'sparkles', title: 'AI Suggestions', description: 'Smart nutrition tips' },
  ];

  async function handleSubscribe() {
    setLoading(true);
    try {
      console.log('[Paywall] Starting subscription for plan:', selectedPlan);
      
      const priceId = selectedPlan === 'monthly' 
        ? STRIPE_CONFIG.MONTHLY_PRICE_ID 
        : STRIPE_CONFIG.YEARLY_PRICE_ID;
      
      console.log('[Paywall] Using price ID:', priceId);
      
      const checkoutUrl = await createCheckoutSession(priceId);
      
      if (checkoutUrl) {
        console.log('[Paywall] Opening checkout URL:', checkoutUrl);
        const supported = await Linking.canOpenURL(checkoutUrl);
        if (supported) {
          await Linking.openURL(checkoutUrl);
        } else {
          console.error('[Paywall] Cannot open URL:', checkoutUrl);
        }
      }
    } catch (error) {
      console.error('[Paywall] Error in handleSubscribe:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      console.log('[Paywall] Restoring subscription...');
      await restoreSubscription();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={isDark ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace-premium" size={60} color="#FFD700" />
          <Text style={[styles.title, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Unlock Premium
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            Take your fitness journey to the next level
          </Text>
        </View>

        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: isDark ? colors.dark.text : colors.light.text }]}>Yearly</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save {STRIPE_CONFIG.YEARLY_SAVINGS_PERCENT}%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>
              ${STRIPE_CONFIG.YEARLY_PRICE.toFixed(2)}/year
            </Text>
            <Text style={[styles.planDetail, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
              Just ${STRIPE_CONFIG.YEARLY_MONTHLY_EQUIVALENT}/month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: isDark ? colors.dark.text : colors.light.text }]}>Monthly</Text>
            </View>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>
              ${STRIPE_CONFIG.MONTHLY_PRICE.toFixed(2)}/month
            </Text>
            <Text style={[styles.planDetail, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
              Billed monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          {premiumFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol ios_icon_name={feature.icon} android_material_icon_name="check-circle" size={24} color="#FFD700" />
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading || subscriptionLoading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.subscribeButtonText}>Start Premium</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading || subscriptionLoading}
        >
          <Text style={[styles.restoreButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Cancel anytime. Terms apply.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#FFD700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planName: {
    ...typography.h3,
  },
  saveBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  saveText: {
    ...typography.caption,
    color: '#000',
    fontWeight: '700',
  },
  planPrice: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  planDetail: {
    ...typography.body,
  },
  featuresContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  },
  subscribeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    ...typography.h3,
    color: '#000',
  },
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  restoreButtonText: {
    ...typography.body,
    textDecorationLine: 'underline',
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'center',
  },
});
