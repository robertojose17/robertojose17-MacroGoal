
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { getMealPlan, deleteMealPlanItem, updateMealPlanItem, type MealPlanDetail, type MealPlanItem } from '@/utils/mealPlansApi';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { type: 'lunch', label: 'Lunch', emoji: '☀️' },
  { type: 'dinner', label: 'Dinner', emoji: '🌙' },
  { type: 'snack', label: 'Snack', emoji: '🍎' },
];

function getNumDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function deduplicateItems(items: MealPlanItem[]): MealPlanItem[] {
  const seen = new Set<string>();
  const result: MealPlanItem[] = [];
  for (const item of items) {
    const key = item.food_name.toLowerCase().trim() + '|' + item.meal_type;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export default function MealPlanDetailScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [plan, setPlan] = useState<MealPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingGrams, setEditingGrams] = useState<string>('');

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;
  const cardBorderColor = isDark ? colors.cardBorderDark : colors.cardBorder;

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    console.log('[MealPlanDetail] Loading plan:', planId);
    try {
      const data = await getMealPlan(planId);
      console.log('[MealPlanDetail] Plan loaded:', data.name, 'items:', data.items?.length ?? 0);
      setPlan(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[MealPlanDetail] Error loading plan:', msg);
      setError('Failed to load meal plan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[MealPlanDetail] Screen focused');
      setLoading(true);
      loadPlan();
    }, [loadPlan])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPlan();
  };

  const handleDeleteItem = (itemId: string) => {
    console.log('[MealPlanDetail] Delete item pressed:', itemId);
    Alert.alert('Remove Item', 'Remove this food from the plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeletingItemId(itemId);
          try {
            console.log('[MealPlanDetail] Deleting item:', itemId, 'from plan:', planId);
            await deleteMealPlanItem(planId, itemId);
            console.log('[MealPlanDetail] Item deleted successfully');
            setPlan(prev =>
              prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[MealPlanDetail] Error deleting item:', msg);
            Alert.alert('Error', 'Failed to remove item. Please try again.');
          } finally {
            setDeletingItemId(null);
          }
        },
      },
    ]);
  };

  const handleStartEdit = (item: MealPlanItem) => {
    const gramsValue = item.grams != null ? item.grams : item.quantity * 100;
    console.log('[MealPlanDetail] Start editing item:', item.id, 'food:', item.food_name, 'grams:', gramsValue);
    setEditingItemId(item.id);
    setEditingGrams(String(Math.round(gramsValue)));
  };

  const handleCancelEdit = () => {
    console.log('[MealPlanDetail] Cancel editing item:', editingItemId);
    setEditingItemId(null);
    setEditingGrams('');
  };

  const handleConfirmEdit = async (item: MealPlanItem) => {
    const newGrams = parseFloat(editingGrams);
    if (isNaN(newGrams) || newGrams <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid number greater than 0.');
      return;
    }
    const oldGrams = item.grams != null ? item.grams : item.quantity * 100;
    if (oldGrams === 0) return;
    const ratio = newGrams / oldGrams;
    const newCalories = Math.round((Number(item.calories) || 0) * ratio);
    const newProtein = Math.round((Number(item.protein) || 0) * ratio * 10) / 10;
    const newCarbs = Math.round((Number(item.carbs) || 0) * ratio * 10) / 10;
    const newFats = Math.round((Number(item.fats) || 0) * ratio * 10) / 10;
    console.log('[MealPlanDetail] Confirm edit item:', item.id, 'oldGrams:', oldGrams, 'newGrams:', newGrams, 'newCalories:', newCalories);
    setEditingItemId(null);
    setEditingGrams('');
    try {
      await updateMealPlanItem(planId, item.id, {
        grams: newGrams,
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fats: newFats,
      });
      // Update all items with same food_name+meal_type in local state
      setPlan(prev => {
        if (!prev) return prev;
        const updatedItems = prev.items.map(i => {
          if (i.food_name.toLowerCase().trim() === item.food_name.toLowerCase().trim() && i.meal_type === item.meal_type) {
            const iOldGrams = i.grams != null ? i.grams : i.quantity * 100;
            const iRatio = iOldGrams > 0 ? newGrams / iOldGrams : 1;
            return {
              ...i,
              grams: newGrams,
              calories: Math.round((Number(i.calories) || 0) * iRatio),
              protein: Math.round((Number(i.protein) || 0) * iRatio * 10) / 10,
              carbs: Math.round((Number(i.carbs) || 0) * iRatio * 10) / 10,
              fats: Math.round((Number(i.fats) || 0) * iRatio * 10) / 10,
            };
          }
          return i;
        });
        return { ...prev, items: updatedItems };
      });
      console.log('[MealPlanDetail] Item updated successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[MealPlanDetail] Error updating item:', msg);
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleAddFood = (mealType: MealType) => {
    if (!plan) return;
    console.log('[MealPlanDetail] Add food pressed, meal:', mealType, 'date:', plan.start_date, 'planId:', planId);
    router.push({
      pathname: '/food-search',
      params: {
        meal: mealType,
        date: plan.start_date,
        mode: 'meal-plan',
        planId,
      },
    });
  };

  const handleGroceryList = () => {
    console.log('[MealPlanDetail] Grocery list button pressed, planId:', planId);
    router.push({ pathname: '/meal-plan-grocery', params: { planId } });
  };

  const handleBack = () => {
    console.log('[MealPlanDetail] Back button pressed');
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Meal Plan</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>{error ?? 'Plan not found.'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadPlan}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const numDays = getNumDays(plan.start_date, plan.end_date);
  const dedupedItems = deduplicateItems(plan.items);

  const dayCalories = dedupedItems.reduce((s, i) => s + (Number(i.calories) || 0), 0);
  const dayProtein = dedupedItems.reduce((s, i) => s + (Number(i.protein) || 0), 0);
  const dayCarbs = dedupedItems.reduce((s, i) => s + (Number(i.carbs) || 0), 0);
  const dayFats = dedupedItems.reduce((s, i) => s + (Number(i.fats) || 0), 0);

  const totalCalories = Math.round(dayCalories * numDays);
  const totalProtein = Math.round(dayProtein * numDays);
  const totalCarbs = Math.round(dayCarbs * numDays);
  const totalFats = Math.round(dayFats * numDays);

  const dayCaloriesDisplay = Math.round(dayCalories);
  const dayProteinDisplay = Math.round(dayProtein);
  const dayCarbsDisplay = Math.round(dayCarbs);
  const dayFatsDisplay = Math.round(dayFats);

  const daysLabel = numDays === 1 ? '1 day' : `${numDays} days`;
  const repeatSubtitle = `Repeats for ${daysLabel}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {plan.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.groceryButton} onPress={handleGroceryList} activeOpacity={0.7}>
          <Text style={styles.groceryButtonText}>🛒</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Macros Summary Card */}
        <View style={[styles.macroCard, { backgroundColor: cardBg, borderColor: cardBorderColor }]}>
          <View style={styles.macroCardHeader}>
            <Text style={[styles.macroCardTitle, { color: textColor }]}>Weekly Summary</Text>
            <Text style={[styles.macroCardSubtitle, { color: secondaryColor }]}>{repeatSubtitle}</Text>
          </View>

          {/* Per day row */}
          <View style={styles.macroRow}>
            <Text style={[styles.macroRowLabel, { color: secondaryColor }]}>Per day</Text>
            <View style={styles.macroPills}>
              <View style={[styles.macroPill, { backgroundColor: colors.calories + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.calories }]}>{dayCaloriesDisplay}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.calories }]}>kcal</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.protein + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.protein }]}>{dayProteinDisplay}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.protein }]}>P</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.carbs + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.carbs }]}>{dayCarbsDisplay}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.carbs }]}>C</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.fats + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.fats }]}>{dayFatsDisplay}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.fats }]}>F</Text>
              </View>
            </View>
          </View>

          <View style={[styles.macroDivider, { backgroundColor: borderColor }]} />

          {/* Total row */}
          <View style={styles.macroRow}>
            <Text style={[styles.macroRowLabel, { color: secondaryColor }]}>
              {'For '}
              {daysLabel}
            </Text>
            <View style={styles.macroPills}>
              <View style={[styles.macroPill, { backgroundColor: colors.calories + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.calories }]}>{totalCalories}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.calories }]}>kcal</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.protein + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.protein }]}>{totalProtein}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.protein }]}>P</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.carbs + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.carbs }]}>{totalCarbs}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.carbs }]}>C</Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: colors.fats + '22' }]}>
                <Text style={[styles.macroPillValue, { color: colors.fats }]}>{totalFats}</Text>
                <Text style={[styles.macroPillUnit, { color: colors.fats }]}>F</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Meal Sections */}
        {MEAL_TYPES.map((mealDef, mealIdx) => {
          const mealItems = dedupedItems.filter(i => i.meal_type === mealDef.type);
          const isLast = mealIdx === MEAL_TYPES.length - 1;

          return (
            <View
              key={mealDef.type}
              style={[
                styles.mealCard,
                { backgroundColor: cardBg, borderColor: cardBorderColor },
                !isLast && styles.mealCardSpacing,
              ]}
            >
              {/* Meal header */}
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderLeft}>
                  <Text style={styles.mealEmoji}>{mealDef.emoji}</Text>
                  <Text style={[styles.mealTitle, { color: textColor }]}>{mealDef.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addFoodButton}
                  onPress={() => handleAddFood(mealDef.type)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.addFoodText, { color: colors.primary }]}>Add food</Text>
                </TouchableOpacity>
              </View>

              {/* Items */}
              {mealItems.length === 0 ? (
                <Text style={[styles.emptyMealText, { color: secondaryColor }]}>No foods added yet</Text>
              ) : (
                mealItems.map((item, idx) => {
                  const isDeleting = deletingItemId === item.id;
                  const isEditing = editingItemId === item.id;
                  const servingText = item.serving_description
                    ? item.serving_description
                    : item.grams
                    ? `${Math.round(item.grams)}g`
                    : `${item.quantity} serving`;
                  const itemCalories = Math.round(Number(item.calories) || 0);
                  const isLastItem = idx === mealItems.length - 1;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.foodItem,
                        !isLastItem && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                      ]}
                    >
                      <View style={styles.foodItemInfo}>
                        <Text style={[styles.foodItemName, { color: textColor }]} numberOfLines={1}>
                          {item.food_name}
                        </Text>
                        {!!item.brand && (
                          <Text style={[styles.foodItemMeta, { color: secondaryColor }]}>{item.brand}</Text>
                        )}
                        {isEditing ? (
                          <View style={styles.editRow}>
                            <TextInput
                              style={[styles.gramsInput, { color: textColor, borderColor: colors.primary }]}
                              value={editingGrams}
                              onChangeText={setEditingGrams}
                              keyboardType="decimal-pad"
                              autoFocus
                              selectTextOnFocus
                            />
                            <Text style={[styles.gramsLabel, { color: secondaryColor }]}>g</Text>
                            <TouchableOpacity
                              style={styles.editActionBtn}
                              onPress={() => handleConfirmEdit(item)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.editActionText, { color: colors.primary }]}>✓</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.editActionBtn}
                              onPress={handleCancelEdit}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.editActionText, { color: colors.error }]}>✗</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.servingRow}
                            onPress={() => handleStartEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.foodItemMeta, { color: secondaryColor }]}>{servingText}</Text>
                            <IconSymbol
                              ios_icon_name="pencil"
                              android_material_icon_name="edit"
                              size={11}
                              color={secondaryColor}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.foodItemRight}>
                        <Text style={[styles.foodItemCalories, { color: textColor }]}>{itemCalories}</Text>
                        <Text style={[styles.foodItemKcal, { color: secondaryColor }]}>kcal</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteItem(item.id)}
                        disabled={isDeleting || isEditing}
                        activeOpacity={0.7}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <IconSymbol
                            ios_icon_name="trash"
                            android_material_icon_name="delete"
                            size={17}
                            color={isEditing ? borderColor : colors.error}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography.body, textAlign: 'center', marginBottom: spacing.lg },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  headerCenter: { flex: 1 },
  headerTitle: { ...typography.h3 },
  headerRight: { width: 40 },
  groceryButton: { padding: spacing.xs, minWidth: 40, alignItems: 'center' },
  groceryButtonText: { fontSize: 22 },

  // Scroll
  scrollContent: { padding: spacing.md, paddingBottom: 60 },

  // Macro card
  macroCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  macroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  macroCardTitle: { ...typography.bodyBold },
  macroCardSubtitle: { ...typography.small },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  macroRowLabel: { ...typography.caption, minWidth: 60 },
  macroPills: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  macroPillValue: { fontSize: 13, fontWeight: '700' },
  macroPillUnit: { fontSize: 10, fontWeight: '600' },
  macroDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },

  // Meal card
  mealCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  mealCardSpacing: { marginBottom: spacing.md },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealEmoji: { fontSize: 18 },
  mealTitle: { ...typography.bodyBold },
  addFoodButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFoodText: { fontSize: 13, fontWeight: '600' },
  emptyMealText: {
    ...typography.caption,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  // Food item
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  foodItemInfo: { flex: 1 },
  foodItemName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  foodItemMeta: { fontSize: 12, lineHeight: 16 },
  foodItemRight: { alignItems: 'flex-end' },
  foodItemCalories: { fontSize: 15, fontWeight: '700' },
  foodItemKcal: { fontSize: 11 },
  deleteButton: { padding: spacing.xs, minWidth: 32, alignItems: 'center' },

  // Inline edit
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  gramsInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    minWidth: 52,
    textAlign: 'center',
  },
  gramsLabel: { fontSize: 12 },
  editActionBtn: { padding: 4 },
  editActionText: { fontSize: 16, fontWeight: '700' },

  bottomSpacer: { height: 40 },
});
