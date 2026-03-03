
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import RevenueCatPaywall from '@/components/RevenueCatPaywall';

interface SubscriptionButtonProps {
  onSubscribed?: () => void;
}

export default function SubscriptionButton({ onSubscribed }: SubscriptionButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showPaywall, setShowPaywall] = useState(false);
  
  const { isPro, loading } = useRevenueCat();

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <View style={[styles.notAvailableContainer, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={32}
          color={colors.textSecondary}
        />
        <Text style={[styles.notAvailableText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          In-App Purchases are only available on iOS and Android
        </Text>
      </View>
    );
  }

  if (isPro) {
    return (
      <View style={[styles.subscribedContainer, { backgroundColor: colors.success + '20' }]}>
        <IconSymbol
          ios_icon_name="checkmark.circle.fill"
          android_material_icon_name="check-circle"
          size={32}
          color={colors.success}
        />
        <Text style={[styles.subscribedText, { color: colors.success }]}>
          Premium Active
        </Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowPaywall(true)}
        disabled={loading}
      >
        <IconSymbol
          ios_icon_name="star.fill"
          android_material_icon_name="star"
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.upgradeButtonText}>
          {loading ? 'Loading...' : 'Upgrade to Premium'}
        </Text>
      </TouchableOpacity>

      <RevenueCatPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribed={onSubscribed}
      />
    </>
  );
}

const styles = StyleSheet.create({
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subscribedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  subscribedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notAvailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  notAvailableText: {
    fontSize: 14,
  },
});
