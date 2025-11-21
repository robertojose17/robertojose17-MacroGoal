
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  
  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  useEffect(() => {
    console.log('[AddFood] Screen mounted on platform:', Platform.OS);
    console.log('[AddFood] Params:', { mealType, date });
  }, []);

  const handleNavigateToFoodSearch = () => {
    console.log('[AddFood] Navigating to food-search with params:', { meal: mealType, date });
    router.replace(`/food-search?meal=${mealType}&date=${date}`);
  };

  const handleNavigateToBarcodeScan = () => {
    console.log('[AddFood] Navigating to barcode-scan with params:', { meal: mealType, date });
    router.replace(`/barcode-scan?meal=${mealType}&date=${date}`);
  };

  const handleNavigateToQuickAdd = () => {
    console.log('[AddFood] Navigating to quick-add with params:', { meal: mealType, date });
    router.replace(`/quick-add?meal=${mealType}&date=${date}`);
  };

  const options = [
    {
      id: 'search',
      title: 'Search Food Library',
      description: 'Search OpenFoodFacts database',
      icon: 'magnifyingglass',
      androidIcon: 'search',
      onPress: handleNavigateToFoodSearch,
    },
    {
      id: 'barcode',
      title: 'Scan Barcode',
      description: 'Scan product barcode with camera',
      icon: 'barcode.viewfinder',
      androidIcon: 'qr_code_scanner',
      onPress: handleNavigateToBarcodeScan,
    },
    {
      id: 'quick',
      title: 'Quick Add',
      description: 'Manually enter calories & macros',
      icon: 'pencil',
      androidIcon: 'edit',
      onPress: handleNavigateToQuickAdd,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Add Food to {mealLabels[mealType]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          Choose how you&apos;d like to add food:
        </Text>

        {options.map((option, index) => (
          <React.Fragment key={index}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol
                  ios_icon_name={option.icon}
                  android_material_icon_name={option.androidIcon}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={24}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
            </TouchableOpacity>
          </React.Fragment>
        ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyBold,
    fontSize: 18,
    marginBottom: 4,
  },
  optionDescription: {
    ...typography.caption,
  },
});
