
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSubscription } from '@/hooks/useSubscription';
import { STRIPE_CONFIG } from '@/utils/stripeConfig';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { handleSubscribe, restoreSubscription, subscriptionLoading } = useSubscription();

  const features = [
    'Advanced analytics & trends',
    'Multiple goal phases',
    'Custom recipes builder',
    'Habit tracking & streaks',
    'Data export (CSV)',
    'AI meal suggestions',
    'Priority support',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={isDark ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: isDark ? colors.dark.text : colors.light.text }]}>
          Upgrade to Premium
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Unlock all features and take your fitness journey to the next level
        </Text>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={24} color="#10B981" />
              <Text style={[styles.featureText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[styles.planCard, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}
            onPress={() => handleSubscribe('yearly')}
            disabled={subscriptionLoading}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>BEST VALUE</Text>
            </View>
            <Text style={[styles.planTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Yearly</Text>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>
              ${STRIPE_CONFIG.yearlyPrice}/year
            </Text>
            <Text style={[styles.planSavings, { color: colors.primary }]}>
              Save ${(STRIPE_CONFIG.monthlyPrice * 12 - STRIPE_CONFIG.yearlyPrice).toFixed(2)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}
            onPress={() => handleSubscribe('monthly')}
            disabled={subscriptionLoading}
          >
            <Text style={[styles.planTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>
              ${STRIPE_CONFIG.monthlyPrice}/month
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={restoreSubscription} disabled={subscriptionLoading}>
          <Text style={[styles.restoreText, { color: colors.primary }]}>
            {subscriptionLoading ? 'Loading...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  closeButton: { alignSelf: 'flex-end', marginBottom: spacing.md },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: spacing.xl, textAlign: 'center' },
  featuresContainer: { marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  featureText: { fontSize: 16, marginLeft: spacing.md, flex: 1 },
  plansContainer: { gap: spacing.md, marginBottom: spacing.lg },
  planCard: { padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -10, backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  planTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: spacing.xs },
  planPrice: { fontSize: 24, fontWeight: 'bold' },
  planSavings: { fontSize: 14, marginTop: spacing.xs },
  restoreText: { textAlign: 'center', fontSize: 16, marginBottom: spacing.lg },
  disclaimer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
