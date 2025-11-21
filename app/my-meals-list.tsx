
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { MyMeal } from '@/types/myMeals';
import { getMyMeals, calculateMyMealSummary } from '@/utils/myMealsDatabase';

export default function MyMealsListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const fromAddFood = params.fromAddFood === 'true';

  const [myMeals, setMyMeals] = useState<MyMeal[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadMyMeals();
    }, [])
  );

  const loadMyMeals = async () => {
    try {
      setLoading(true);
      const meals = await getMyMeals();
      setMyMeals(meals);
      console.log('[MyMealsList] Loaded', meals.length, 'My Meals');
    } catch (error) {
      console.error('[MyMealsList] Error loading My Meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeal = () => {
    console.log('[MyMealsList] Creating new My Meal');
    router.push('/my-meals-create');
  };

  const handleMealPress = (meal: MyMeal) => {
    console.log('[MyMealsList] Opening My Meal:', meal.name);
    if (fromAddFood) {
      // If coming from Add Food, go to details with option to add to diary
      router.push({
        pathname: '/my-meals-details',
        params: {
          mealId: meal.id,
          meal: mealType,
          date: date,
          fromAddFood: 'true',
        },
      });
    } else {
      // Otherwise just view details
      router.push({
        pathname: '/my-meals-details',
        params: {
          mealId: meal.id,
        },
      });
    }
  };

  const renderMealCard = (meal: MyMeal, index: number) => {
    const items = meal.items || [];
    const summary = items.length > 0 ? calculateMyMealSummary(items) : null;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.mealCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
        onPress={() => handleMealPress(meal)}
        activeOpacity={0.7}
      >
        <View style={styles.mealCardHeader}>
          <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
            {meal.name}
          </Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
        </View>

        {meal.note && (
          <Text style={[styles.mealNote, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {meal.note}
          </Text>
        )}

        {summary && (
          <React.Fragment>
            <View style={styles.mealSummary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.calories }]}>
                  {Math.round(summary.totalCalories)}
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  kcal
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.protein }]}>
                  {Math.round(summary.totalProtein)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Protein
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.carbs }]}>
                  {Math.round(summary.totalCarbs)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Carbs
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.fats }]}>
                  {Math.round(summary.totalFat)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Fat
                </Text>
              </View>
            </View>

            <Text style={[styles.itemCount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
            </Text>
          </React.Fragment>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          My Meals
        </Text>
        <TouchableOpacity onPress={handleCreateMeal}>
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {myMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={64}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
                No Saved Meals Yet
              </Text>
              <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Create meal templates to quickly log your favorite food combinations
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateMeal}
              >
                <Text style={styles.createButtonText}>Create Your First Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <React.Fragment>
              <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {myMeals.length} {myMeals.length === 1 ? 'Saved Meal' : 'Saved Meals'}
              </Text>
              {myMeals.map((meal, index) => renderMealCard(meal, index))}
            </React.Fragment>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  mealCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mealName: {
    ...typography.h3,
    flex: 1,
  },
  mealNote: {
    ...typography.caption,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  mealSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  itemCount: {
    ...typography.caption,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  createButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
});
