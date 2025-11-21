
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { MyMeal } from '@/types/myMeals';
import { getMyMealById, calculateMyMealSummary, deleteMyMeal, addMyMealToDiary } from '@/utils/myMealsDatabase';

export default function MyMealDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealId = params.mealId as string;
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const fromAddFood = params.fromAddFood === 'true';

  const [myMeal, setMyMeal] = useState<MyMeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadMyMeal();
  }, [mealId]);

  const loadMyMeal = async () => {
    try {
      setLoading(true);
      const meal = await getMyMealById(mealId);
      setMyMeal(meal);
      console.log('[MyMealDetails] Loaded My Meal:', meal?.name);
    } catch (error) {
      console.error('[MyMealDetails] Error loading My Meal:', error);
      Alert.alert('Error', 'Failed to load meal');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDiary = async () => {
    if (!myMeal) return;

    Alert.alert(
      'Add to Diary',
      `Add "${myMeal.name}" to ${mealType}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: async () => {
            setAdding(true);
            try {
              const success = await addMyMealToDiary(mealId, mealType, date);
              if (success) {
                console.log('[MyMealDetails] My Meal added to diary');
                Alert.alert('Success', 'Meal added to diary', [
                  {
                    text: 'OK',
                    onPress: () => router.dismissTo('/(tabs)/(home)/'),
                  },
                ]);
              } else {
                Alert.alert('Error', 'Failed to add meal to diary');
              }
            } catch (error) {
              console.error('[MyMealDetails] Error adding to diary:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setAdding(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    console.log('[MyMealDetails] Editing My Meal:', mealId);
    router.push({
      pathname: '/my-meals-edit',
      params: {
        mealId: mealId,
      },
    });
  };

  const handleDelete = () => {
    if (!myMeal) return;

    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${myMeal.name}"? This will not affect past diary entries.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMyMeal(mealId);
            if (success) {
              console.log('[MyMealDetails] My Meal deleted');
              Alert.alert('Success', 'Meal deleted', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } else {
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  if (loading || !myMeal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const items = myMeal.items || [];
  const summary = items.length > 0 ? calculateMyMealSummary(items) : null;

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
          Meal Details
        </Text>
        <TouchableOpacity onPress={handleEdit}>
          <IconSymbol
            ios_icon_name="pencil"
            android_material_icon_name="edit"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
            {myMeal.name}
          </Text>
          {myMeal.note && (
            <Text style={[styles.mealNote, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {myMeal.note}
            </Text>
          )}
        </View>

        {summary && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Total Nutrition
            </Text>
            <View style={styles.summaryRow}>
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
          </View>
        )}

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Foods ({items.length})
          </Text>
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemCard,
                {
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                  borderColor: isDark ? colors.borderDark : colors.border,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: isDark ? colors.textDark : colors.text }]}>
                  {item.food_name}
                </Text>
                {item.brand && (
                  <Text style={[styles.itemBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    {item.brand}
                  </Text>
                )}
                <Text style={[styles.itemAmount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {item.amount_display}
                </Text>
              </View>
              <View style={styles.itemNutrition}>
                <Text style={[styles.itemCalories, { color: isDark ? colors.textDark : colors.text }]}>
                  {Math.round((item.per100_calories * item.amount_grams) / 100)}
                </Text>
                <Text style={[styles.itemCaloriesLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  kcal
                </Text>
                <Text style={[styles.itemMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  P: {Math.round((item.per100_protein * item.amount_grams) / 100)}g • C: {Math.round((item.per100_carbs * item.amount_grams) / 100)}g • F: {Math.round((item.per100_fat * item.amount_grams) / 100)}g
                </Text>
              </View>
            </View>
          ))}
        </View>

        {fromAddFood && (
          <TouchableOpacity
            style={[styles.addToDiaryButton, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
            onPress={handleAddToDiary}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addToDiaryButtonText}>
                Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={20}
            color={colors.error}
          />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Delete Meal
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  mealName: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  mealNote: {
    ...typography.body,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.bodyBold,
    fontSize: 20,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  itemBrand: {
    ...typography.caption,
    marginBottom: 2,
  },
  itemAmount: {
    ...typography.caption,
  },
  itemNutrition: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  itemCalories: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  itemCaloriesLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  itemMacros: {
    ...typography.caption,
    fontSize: 11,
  },
  addToDiaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addToDiaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});
