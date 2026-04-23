
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { apiRequest } from '@/utils/api';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealPlanItem {
  id: string;
  plan_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  brand?: string;
  quantity: number;
  grams?: number;
  serving_description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

interface MealPlanDetail {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  items: MealPlanItem[];
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
];

const getDatesInRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatDayHeader = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

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

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    console.log('[MealPlanDetail] Loading plan:', planId);
    try {
      const response = await apiRequest(`/api/meal-plans/${planId}`);
      if (!response.ok) {
        const text = await response.text();
        console.error('[MealPlanDetail] Failed to load plan:', response.status, text);
        setError('Failed to load meal plan.');
        return;
      }
      const data = await response.json();
      console.log('[MealPlanDetail] Plan loaded:', data.name, 'items:', data.items?.length || 0);
      setPlan(data);
      setError(null);
    } catch (err: any) {
      console.error('[MealPlanDetail] Error loading plan:', err);
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

  const handleDeleteItem = async (itemId: string) => {
    console.log('[MealPlanDetail] Delete item pressed:', itemId);
    Alert.alert('Remove Item', 'Remove this food from the plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeletingItemId(itemId);
          try {
            console.log('[MealPlanDetail] DELETE /api/meal-plans/:id/items/:itemId', planId, itemId);
            const response = await apiRequest(`/api/meal-plans/${planId}/items/${itemId}`, { method: 'DELETE' });
            if (!response.ok) {
              const text = await response.text();
              console.error('[MealPlanDetail] Failed to delete item:', response.status, text);
              Alert.alert('Error', 'Failed to remove item. Please try again.');
              return;
            }
            console.log('[MealPlanDetail] Item deleted successfully');
            setPlan(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev);
          } catch (err: any) {
            console.error('[MealPlanDetail] Error deleting item:', err);
            Alert.alert('Error', 'Failed to remove item. Please try again.');
          } finally {
            setDeletingItemId(null);
          }
        },
      },
    ]);
  };

  const handleAddFood = (mealType: MealType, dateStr: string) => {
    console.log('[MealPlanDetail] Add food pressed, meal:', mealType, 'date:', dateStr, 'planId:', planId);
    router.push({
      pathname: '/food-search',
      params: {
        meal: mealType,
        date: dateStr,
        mode: 'meal-plan',
        planId: planId,
      },
    });
  };

  const handleGroceryList = () => {
    console.log('[MealPlanDetail] Grocery list button pressed, planId:', planId);
    router.push({ pathname: '/meal-plan-grocery', params: { planId } });
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Meal Plan</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>{error || 'Plan not found.'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadPlan}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dates = getDatesInRange(plan.start_date, plan.end_date);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          console.log('[MealPlanDetail] Back button pressed');
          router.back();
        }}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>{plan.name}</Text>
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
        {dates.map((dateStr) => {
          const dayItems = plan.items.filter(i => i.date === dateStr);
          const dayCalories = dayItems.reduce((sum, i) => sum + (i.calories || 0), 0);
          const dayCaloriesDisplay = Math.round(dayCalories);

          return (
            <View key={dateStr} style={styles.daySection}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { color: textColor }]}>
                  {formatDayHeader(dateStr)}
                </Text>
                {dayCalories > 0 && (
                  <Text style={[styles.dayCalories, { color: secondaryColor }]}>
                    {dayCaloriesDisplay} kcal
                  </Text>
                )}
              </View>

              {/* Meal sections */}
              <View style={[styles.dayCard, { backgroundColor: cardBg }]}>
                {MEAL_TYPES.map((mealDef, mealIdx) => {
                  const mealItems = dayItems.filter(i => i.meal_type === mealDef.type);
                  const isLast = mealIdx === MEAL_TYPES.length - 1;

                  return (
                    <View key={mealDef.type} style={[styles.mealSection, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}>
                      <View style={styles.mealSectionHeader}>
                        <Text style={[styles.mealSectionTitle, { color: textColor }]}>{mealDef.label}</Text>
                        <TouchableOpacity
                          style={styles.addFoodButton}
                          onPress={() => handleAddFood(mealDef.type, dateStr)}
                          activeOpacity={0.7}
                        >
                          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={22} color={colors.primary} />
                          <Text style={[styles.addFoodText, { color: colors.primary }]}>Add food</Text>
                        </TouchableOpacity>
                      </View>

                      {mealItems.length === 0 ? (
                        <Text style={[styles.emptyMealText, { color: secondaryColor }]}>No foods added</Text>
                      ) : (
                        mealItems.map((item) => {
                          const servingText = item.serving_description || (item.grams ? `${Math.round(item.grams)}g` : `${item.quantity} serving`);
                          const isDeleting = deletingItemId === item.id;

                          return (
                            <View key={item.id} style={styles.planItem}>
                              <View style={styles.planItemInfo}>
                                <Text style={[styles.planItemName, { color: textColor }]}>{item.food_name}</Text>
                                {item.brand && (
                                  <Text style={[styles.planItemBrand, { color: secondaryColor }]}>{item.brand}</Text>
                                )}
                                <Text style={[styles.planItemServing, { color: secondaryColor }]}>{servingText}</Text>
                              </View>
                              <View style={styles.planItemRight}>
                                <Text style={[styles.planItemCalories, { color: textColor }]}>{Math.round(item.calories)}</Text>
                                <Text style={[styles.planItemKcal, { color: secondaryColor }]}>kcal</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.deleteItemButton}
                                onPress={() => handleDeleteItem(item.id)}
                                disabled={isDeleting}
                                activeOpacity={0.7}
                              >
                                {isDeleting ? (
                                  <ActivityIndicator size="small" color={colors.error} />
                                ) : (
                                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color={colors.error} />
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })}
              </View>
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
  retryButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
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
  scrollContent: { padding: spacing.md, paddingBottom: 60 },
  daySection: { marginBottom: spacing.lg },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dayHeaderText: { ...typography.bodyBold },
  dayCalories: { ...typography.caption },
  dayCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  mealSection: { padding: spacing.md },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  mealSectionTitle: { ...typography.bodyBold },
  addFoodButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFoodText: { fontSize: 13, fontWeight: '600' },
  emptyMealText: { ...typography.caption, fontStyle: 'italic' },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  planItemInfo: { flex: 1 },
  planItemName: { ...typography.bodyBold, fontSize: 14 },
  planItemBrand: { ...typography.caption, fontSize: 12 },
  planItemServing: { ...typography.caption, fontSize: 12 },
  planItemRight: { alignItems: 'flex-end' },
  planItemCalories: { fontSize: 15, fontWeight: '600' },
  planItemKcal: { fontSize: 11 },
  deleteItemButton: { padding: spacing.xs, minWidth: 32, alignItems: 'center' },
  bottomSpacer: { height: 40 },
});
