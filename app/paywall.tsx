
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/hooks/useSubscription';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

const PRICE_IDS = {
  monthly: 'price_1QYourMonthlyPriceID',
  yearly: 'price_1QYourYearlyPriceID',
};

export default function PaywallScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { createCheckoutSession } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const priceId = PRICE_IDS[selectedPlan];
      const url = await createCheckoutSession(priceId, selectedPlan);
      
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err) {
      console.error('[Paywall] Subscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={isDark ? colors.dark.text : colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: isDark ? colors.dark.text : colors.light.text }]}>
          Unlock Premium
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Get advanced analytics, custom recipes, and more
        </Text>

        <View style={styles.features}>
          {[
            'Advanced 7/30-day analytics',
            'Multiple goal phases',
            'Custom recipe builder',
            'Habit tracking & streaks',
            'Data export (CSV)',
            'AI meal suggestions',
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={20} color={colors.accent} />
              <Text style={[styles.featureText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Save 40%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>$59.99/year</Text>
            <Text style={[styles.planDetail, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
              $5/month
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
            <Text style={[styles.planName, { color: isDark ? colors.dark.text : colors.light.text }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: isDark ? colors.dark.text : colors.light.text }]}>$9.99/month</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
          Cancel anytime. Auto-renews unless cancelled.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  closeButton: { padding: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  features: { marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  featureText: { fontSize: 16, marginLeft: spacing.md },
  plans: { marginBottom: spacing.lg },
  planCard: { padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md, borderWidth: 2, borderColor: 'transparent' },
  planCardSelected: { borderColor: colors.accent },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  planName: { fontSize: 20, fontWeight: '600' },
  badge: { backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  planPrice: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  planDetail: { fontSize: 14 },
  subscribeButton: { backgroundColor: colors.accent, padding: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center' },
  subscribeButtonDisabled: { opacity: 0.6 },
  subscribeButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
