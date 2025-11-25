
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { MacroBar } from '@/components/MacroBar';
import { ProgressCircle } from '@/components/ProgressCircle';

interface Goal {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_fiber: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [goal, setGoal] = useState<Goal | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalData) {
        setGoal(goalData);
      }

      const { data: summaryData } = await supabase
        .from('daily_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (summaryData) {
        setSummary(summaryData);
      } else {
        setSummary({
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fats: 0,
          total_fiber: 0,
        });
      }
    } catch (error) {
      console.error('[Home] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const caloriesConsumed = summary?.total_calories || 0;
  const caloriesGoal = goal?.daily_calories || 2000;
  const caloriesRemaining = Math.max(0, caloriesGoal - caloriesConsumed);
  const caloriesPercent = Math.min(100, (caloriesConsumed / caloriesGoal) * 100);

  const proteinConsumed = summary?.total_protein || 0;
  const proteinGoal = goal?.protein_g || 150;
  const proteinPercent = Math.min(100, (proteinConsumed / proteinGoal) * 100);

  const carbsConsumed = summary?.total_carbs || 0;
  const carbsGoal = goal?.carbs_g || 200;
  const carbsPercent = Math.min(100, (carbsConsumed / carbsGoal) * 100);

  const fatsConsumed = summary?.total_fats || 0;
  const fatsGoal = goal?.fats_g || 65;
  const fatsPercent = Math.min(100, (fatsConsumed / fatsGoal) * 100);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Today&apos;s Progress
          </Text>
          <Text style={[styles.date, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={styles.caloriesHeader}>
            <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Calories
            </Text>
            <TouchableOpacity onPress={() => router.push('/edit-goals')}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit Goals</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressCircleContainer}>
            <ProgressCircle
              size={180}
              strokeWidth={16}
              progress={caloriesPercent}
              color={colors.calories}
              backgroundColor={isDark ? colors.borderDark : colors.border}
            >
              <Text style={[styles.caloriesValue, { color: isDark ? colors.textDark : colors.text }]}>
                {Math.round(caloriesConsumed)}
              </Text>
              <Text style={[styles.caloriesLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                of {Math.round(caloriesGoal)}
              </Text>
            </ProgressCircle>
          </View>

          <View style={styles.caloriesStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {Math.round(caloriesRemaining)}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Remaining
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.calories }]}>
                {Math.round(caloriesConsumed)}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Consumed
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Macros
          </Text>

          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textDark : colors.text }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: colors.protein }]}>
                {Math.round(proteinConsumed)}g / {Math.round(proteinGoal)}g
              </Text>
            </View>
            <MacroBar
              progress={proteinPercent}
              color={colors.protein}
              backgroundColor={isDark ? colors.borderDark : colors.border}
            />
          </View>

          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textDark : colors.text }]}>
                Carbs
              </Text>
              <Text style={[styles.macroValue, { color: colors.carbs }]}>
                {Math.round(carbsConsumed)}g / {Math.round(carbsGoal)}g
              </Text>
            </View>
            <MacroBar
              progress={carbsPercent}
              color={colors.carbs}
              backgroundColor={isDark ? colors.borderDark : colors.border}
            />
          </View>

          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textDark : colors.text }]}>
                Fats
              </Text>
              <Text style={[styles.macroValue, { color: colors.fats }]}>
                {Math.round(fatsConsumed)}g / {Math.round(fatsGoal)}g
              </Text>
            </View>
            <MacroBar
              progress={fatsPercent}
              color={colors.fats}
              backgroundColor={isDark ? colors.borderDark : colors.border}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.body,
    fontSize: 15,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  caloriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
  },
  editLink: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  progressCircleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  caloriesValue: {
    ...typography.h1,
    fontSize: 48,
  },
  caloriesLabel: {
    ...typography.body,
    fontSize: 16,
  },
  caloriesStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statValue: {
    ...typography.h2,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 13,
  },
  macroItem: {
    marginBottom: spacing.md,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  macroValue: {
    ...typography.bodyBold,
    fontSize: 14,
  },
});
