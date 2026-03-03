
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface SubscriptionButtonProps {
  onPress: () => void;
  style?: any;
}

export default function SubscriptionButton({ onPress, style }: SubscriptionButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPro, isLoading } = useRevenueCat();

  if (isLoading) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isDark ? colors.cardDark : colors.card },
          style,
        ]}
        disabled
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </TouchableOpacity>
    );
  }

  if (isPro) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 },
          style,
        ]}
        onPress={onPress}
      >
        <IconSymbol
          ios_icon_name="star.fill"
          android_material_icon_name="star"
          size={20}
          color={colors.primary}
        />
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          Pro Member
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        style,
      ]}
      onPress={onPress}
    >
      <IconSymbol
        ios_icon_name="star.fill"
        android_material_icon_name="star"
        size={20}
        color="#FFFFFF"
      />
      <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
        Upgrade to Pro
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
