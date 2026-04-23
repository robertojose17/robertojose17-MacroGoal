
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import ProgressCircle from '@/components/ProgressCircle';
import { IconSymbol } from '@/components/IconSymbol';
import SwipeToDeleteRow from '@/components/SwipeToDeleteRow';
import { supabase } from '@/lib/supabase/client';
import { listMealPlans, type MealPlan as ApiMealPlan } from '@/utils/mealPlansApi';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  id: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  serving_description: string | null;
  grams: number | null;
  foods: {
    id: string;
    name: string;
    brand: string | null;
    serving_amount: number;
    serving_unit: string;
    user_created: boolean;
  } | null;
}

interface MealData {
  type: MealType;
  label: string;
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

interface MealPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getServingDisplayText = (item: FoodItem): string => {
  if (item.grams) return `${Math.round(item.grams)} g`;
  if (item.serving_description) return item.serving_description;
  const quantity = item.quantity || 1;
  const servingAmount = item.foods?.serving_amount || 100;
  const servingUnit = item.foods?.serving_unit || 'g';
  if (quantity === 1) return `${servingAmount} ${servingUnit}`;
  return `${quantity}x ${servingAmount} ${servingUnit}`;
};

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'tracking' | 'planning'>('tracking');

  const [goal, setGoal] = useState<any>(null);
  const [meals, setMeals] = useState<MealData[]>([
    { type: 'breakfast', label: 'Breakfast', items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
    { type: 'lunch', label: 'Lunch', items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
    { type: 'dinner', label: 'Dinner', items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
    { type: 'snack', label: 'Snacks', items: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
  ]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalMacros, setTotalMacros] = useState({ protein: 0, carbs: 0, fats: 0, fiber: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('[Home] Error getting user:', userError);
        setError('Failed to authenticate. Please try logging in again.');
        setLoading(false);
        return;
      }
      if (!user) {
        console.log('[Home] No user found');
        setError('No user session found. Please log in.');
        setLoading(false);
        return;
      }

      console.log('[Home] Loading data for user:', user.id);

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[Home] Error loading goal:', goalError);
        setGoal({ daily_calories: 2000, protein_g: 150, carbs_g: 200, fats_g: 65, fiber_g: 30 });
      } else if (goalData) {
        console.log('[Home] Goal loaded:', goalData);
        setGoal(goalData);
      } else {
        console.log('[Home] No active goal found, using defaults');
        setGoal({ daily_calories: 2000, protein_g: 150, carbs_g: 200, fats_g: 65, fiber_g: 30 });
      }

      const dateString = formatDateForStorage(selectedDate);
      console.log('[Home] Loading meals for date:', dateString);

      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`
          id,
          meal_type,
          date,
          meal_items (
            id,
            quantity,
            calories,
            protein,
            carbs,
            fats,
            fiber,
            serving_description,
            grams,
            foods (
              id,
              name,
              brand,
              serving_amount,
              serving_unit,
              user_created
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('date', dateString);

      if (mealsError) {
        console.error('[Home] Error loading meals:', mealsError);
        setError('Failed to load meals. Please try refreshing.');
      } else {
        console.log('[Home] Meals loaded for', dateString, ':', mealsData?.length || 0, 'meals');

        const mealsByType: Record<MealType, FoodItem[]> = {
          breakfast: [], lunch: [], dinner: [], snack: [],
        };

        let totalCals = 0, totalP = 0, totalC = 0, totalF = 0, totalFib = 0;

        if (mealsData && mealsData.length > 0) {
          mealsData.forEach((meal: any) => {
            if (meal.meal_items) {
              meal.meal_items.forEach((item: any) => {
                mealsByType[meal.meal_type as MealType].push(item);
                totalCals += item.calories || 0;
                totalP += item.protein || 0;
                totalC += item.carbs || 0;
                totalF += item.fats || 0;
                totalFib += item.fiber || 0;
              });
            }
          });
        }

        const buildMeal = (type: MealType, label: string): MealData => {
          const items = [...mealsByType[type]];
          return {
            type, label, items,
            totalCalories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
            totalProtein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
            totalCarbs: items.reduce((sum, item) => sum + (item.carbs || 0), 0),
            totalFats: items.reduce((sum, item) => sum + (item.fats || 0), 0),
          };
        };

        setMeals([
          buildMeal('breakfast', 'Breakfast'),
          buildMeal('lunch', 'Lunch'),
          buildMeal('dinner', 'Dinner'),
          buildMeal('snack', 'Snacks'),
        ]);
        setTotalCalories(totalCals);
        setTotalMacros({ protein: totalP, carbs: totalC, fats: totalF, fiber: totalFib });
      }
    } catch (error: any) {
      console.error('[Home] Error in loadData:', error);
      setError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  const loadPlans = useCallback(async () => {
    console.log('[Home] Loading meal plans');
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await listMealPlans();
      console.log('[Home] Meal plans loaded:', data.plans?.length || 0);
      setPlans(data.plans || []);
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('does not exist') || msg.includes('relation')) {
        console.log('[Home] meal_plans table not yet created — showing empty state');
        setPlans([]);
      } else {
        console.error('[Home] Error loading meal plans:', err);
        setPlansError('Failed to load meal plans.');
      }
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[Home] Screen focused, loading data');
      loadData();
      loadPlans();
    }, [loadData, loadPlans])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadPlans();
  };

  const handleAddFood = (mealType: MealType) => {
    console.log('[Home] Opening add food for meal:', mealType);
    const dateString = formatDateForStorage(selectedDate);
    console.log('[Home] Passing date to add-food:', dateString);
    router.push(`/add-food?meal=${mealType}&date=${dateString}`);
  };

  const handleEditFood = (item: FoodItem, isSwiping: boolean) => {
    if (isSwiping) {
      console.log('[Home] Blocked edit - swipe gesture is active');
      return;
    }
    console.log('[Home] Opening edit food:', item.id);
    const dateString = formatDateForStorage(selectedDate);
    router.push({ pathname: '/edit-food', params: { itemId: item.id, date: dateString } });
  };

  const handleDeleteFood = useCallback(async (itemId: string) => {
    console.log('[Home] Delete requested for item:', itemId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      let deletedCalories = 0, deletedProtein = 0, deletedCarbs = 0, deletedFats = 0, deletedFiber = 0;

      setMeals(prevMeals => {
        const newMeals = prevMeals.map(meal => {
          const itemToDelete = meal.items.find(i => i.id === itemId);
          if (itemToDelete) {
            deletedCalories = itemToDelete.calories || 0;
            deletedProtein = itemToDelete.protein || 0;
            deletedCarbs = itemToDelete.carbs || 0;
            deletedFats = itemToDelete.fats || 0;
            deletedFiber = itemToDelete.fiber || 0;
          }
          const filteredItems = meal.items.filter(i => i.id !== itemId);
          return {
            ...meal,
            items: filteredItems,
            totalCalories: filteredItems.reduce((sum, i) => sum + (i.calories || 0), 0),
            totalProtein: filteredItems.reduce((sum, i) => sum + (i.protein || 0), 0),
            totalCarbs: filteredItems.reduce((sum, i) => sum + (i.carbs || 0), 0),
            totalFats: filteredItems.reduce((sum, i) => sum + (i.fats || 0), 0),
          };
        });
        console.log('[Home] UI state updated - item removed from list');
        return newMeals;
      });

      setTotalCalories(prev => prev - deletedCalories);
      setTotalMacros(prev => ({
        protein: prev.protein - deletedProtein,
        carbs: prev.carbs - deletedCarbs,
        fats: prev.fats - deletedFats,
        fiber: prev.fiber - deletedFiber,
      }));

      const { error } = await supabase.from('meal_items').delete().eq('id', itemId);
      if (error) {
        console.error('[Home] Database delete error:', error);
        throw error;
      }
      console.log('[Home] Successfully deleted from database');
    } catch (error: any) {
      console.error('[Home] Error in handleDeleteFood:', error);
      Alert.alert('Delete Failed', error?.message || 'Failed to delete food entry. Please try again.', [{ text: 'OK' }]);
      loadData();
    }
  }, [loadData]);

  const goToPreviousDay = () => {
    console.log('[Home] Navigating to previous day');
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    console.log('[Home] Navigating to next day');
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    console.log('[Home] Navigating to today');
    setSelectedDate(new Date());
  };

  const isToday = () => selectedDate.toDateString() === new Date().toDateString();

  const isTodayOrFuture = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected >= today;
  };

  const handleTabPress = (tab: 'tracking' | 'planning') => {
    console.log('[Home] Segmented control pressed:', tab);
    setActiveTab(tab);
  };

  const handlePlanPress = (plan: MealPlan) => {
    console.log('[Home] Meal plan pressed:', plan.id, plan.name);
    router.push({ pathname: '/meal-plan-detail', params: { planId: plan.id } });
  };

  const handleCreatePlan = () => {
    console.log('[Home] Create new meal plan pressed');
    router.push('/meal-plan-create');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: isDark ? colors.textDark : colors.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const caloriesRemaining = (goal?.daily_calories || 2000) - totalCalories;
  const leftArrowDisabled = false;
  const rightArrowDisabled = isTodayOrFuture();

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <SwipeToDeleteRow onDelete={() => handleDeleteFood(item.id)}>
      {(isSwiping: boolean) => (
        <TouchableOpacity
          style={styles.foodItem}
          onPress={() => handleEditFood(item, isSwiping)}
          activeOpacity={0.7}
          disabled={isSwiping}
        >
          <View style={styles.foodInfo}>
            <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
              {item.foods?.name || 'Unknown Food'}
            </Text>
            {item.foods?.brand && (
              <Text style={[styles.foodBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {item.foods.brand}
              </Text>
            )}
            <Text style={[styles.foodDetails, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {getServingDisplayText(item)}
            </Text>
          </View>
          <View style={styles.foodCalories}>
            <Text style={[styles.foodCaloriesValue, { color: isDark ? colors.textDark : colors.text }]}>
              {Math.round(item.calories)}
            </Text>
            <Text style={[styles.foodCaloriesLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              kcal
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </SwipeToDeleteRow>
  );

  const renderTrackingContent = () => (
    <View>
      <View style={[styles.caloriesCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>Calories</Text>
        <View style={styles.caloriesContent}>
          <ProgressCircle
            current={totalCalories}
            target={goal?.daily_calories || 2000}
            size={140}
            strokeWidth={12}
            color={colors.calories}
            label="kcal"
          />
          <View style={styles.macroSummaryCompact}>
            <MacroSummaryRowCompact label="Protein" eaten={Math.round(totalMacros.protein)} goal={goal?.protein_g || 150} color={colors.protein} isDark={isDark} />
            <MacroSummaryRowCompact label="Carbs" eaten={Math.round(totalMacros.carbs)} goal={goal?.carbs_g || 200} color={colors.carbs} isDark={isDark} />
            <MacroSummaryRowCompact label="Fats" eaten={Math.round(totalMacros.fats)} goal={goal?.fats_g || 65} color={colors.fats} isDark={isDark} />
            <MacroSummaryRowCompact label="Fiber" eaten={Math.round(totalMacros.fiber)} goal={goal?.fiber_g || 30} color={colors.fiber} isDark={isDark} />
          </View>
        </View>
      </View>

      {meals.map((meal) => (
        <View key={meal.type} style={[styles.mealCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={styles.mealHeader}>
            <View style={styles.mealHeaderLeft}>
              <Text style={[styles.mealTitle, { color: isDark ? colors.textDark : colors.text }]}>{meal.label}</Text>
              <View style={styles.mealMacroRow}>
                <Text style={[styles.mealCalories, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {Math.round(meal.totalCalories)} kcal
                </Text>
                {meal.totalCalories > 0 && (
                  <>
                    <Text style={[styles.mealMacroDot, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>{'  ·  '}</Text>
                    <Text style={[styles.mealMacroValue, { color: colors.protein }]}>{Math.round(meal.totalProtein)}P</Text>
                    <Text style={[styles.mealMacroDot, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>{'  '}</Text>
                    <Text style={[styles.mealMacroValue, { color: colors.carbs }]}>{Math.round(meal.totalCarbs)}C</Text>
                    <Text style={[styles.mealMacroDot, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>{'  '}</Text>
                    <Text style={[styles.mealMacroValue, { color: colors.fats }]}>{Math.round(meal.totalFats)}F</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.addMealButton} onPress={() => handleAddFood(meal.type)}>
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add" size={28} color={colors.info} />
            </TouchableOpacity>
          </View>

          {meal.items.length === 0 ? (
            <TouchableOpacity style={styles.emptyMeal} onPress={() => handleAddFood(meal.type)}>
              <Text style={[styles.emptyMealText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>Tap to add food</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={meal.items}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderPlanningContent = () => {
    if (plansLoading) {
      return (
        <View style={styles.plansLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (plansError) {
      return (
        <View style={styles.plansEmptyContainer}>
          <Text style={[styles.plansEmptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {plansError}
          </Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: spacing.md }]} onPress={loadPlans}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        {/* AI Meal Planner card */}
        <View style={[styles.aiCard, { backgroundColor: isDark ? '#1E1535' : '#F0EEFF' }]}>
          <View style={styles.aiCardHeader}>
            <View style={[styles.aiIconCircle, { backgroundColor: isDark ? '#2D1F5E' : '#DDD6FE' }]}>
              <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto-awesome" size={22} color="#7C3AED" />
            </View>
            <View style={styles.aiCardText}>
              <Text style={[styles.aiCardTitle, { color: isDark ? '#E9D5FF' : '#4C1D95' }]}>
                Generate with AI
              </Text>
              <Text style={[styles.aiCardSubtitle, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                Tell us your preferences and we'll build your meal plan automatically
              </Text>
            </View>
          </View>
          <View style={[styles.aiComingSoonBadge, { backgroundColor: isDark ? '#2D1F5E' : '#DDD6FE' }]}>
            <Text style={[styles.aiComingSoonText, { color: isDark ? '#C4B5FD' : '#5B21B6' }]}>
              Coming Soon
            </Text>
          </View>
        </View>

        {plans.length === 0 ? (
          <View style={[styles.plansEmptyCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={40} color={isDark ? colors.textSecondaryDark : colors.textSecondary} />
            <Text style={[styles.plansEmptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
              No meal plans yet
            </Text>
            <Text style={[styles.plansEmptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Create your first plan to get started.
            </Text>
          </View>
        ) : (
          plans.map((plan) => {
            const dateRange = formatDateRange(plan.start_date, plan.end_date);
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                onPress={() => handlePlanPress(plan)}
                activeOpacity={0.7}
              >
                <View style={styles.planCardContent}>
                  <View style={styles.planCardLeft}>
                    <Text style={[styles.planName, { color: isDark ? colors.textDark : colors.text }]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planDateRange, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      {dateRange}
                    </Text>
                  </View>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={18} color={isDark ? colors.textSecondaryDark : colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={[styles.createPlanButton, { backgroundColor: colors.primary }]}
          onPress={handleCreatePlan}
          activeOpacity={0.8}
        >
          <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color="#fff" />
          <Text style={styles.createPlanButtonText}>Create New Plan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const todayLabel = isToday() ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dateDisplay = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      {/* Segmented control */}
      <View style={[styles.segmentedControlWrapper, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={[styles.segmentedControl, { backgroundColor: isDark ? colors.cardDark : '#E8EAF0' }]}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'tracking' && { backgroundColor: colors.primary }]}
            onPress={() => handleTabPress('tracking')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentButtonText, { color: activeTab === 'tracking' ? '#fff' : (isDark ? colors.textSecondaryDark : colors.textSecondary) }]}>
              Tracking
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'planning' && { backgroundColor: colors.primary }]}
            onPress={() => handleTabPress('planning')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentButtonText, { color: activeTab === 'planning' ? '#fff' : (isDark ? colors.textSecondaryDark : colors.textSecondary) }]}>
              Planning
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date navigation — only visible in Tracking mode */}
      {activeTab === 'tracking' && (
        <View style={[styles.stickyHeader, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
          <TouchableOpacity
            onPress={goToPreviousDay}
            style={styles.dateButton}
            disabled={leftArrowDisabled}
            activeOpacity={leftArrowDisabled ? 1 : 0.7}
          >
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={22}
              color={isDark ? colors.textDark : colors.text}
              style={{ opacity: leftArrowDisabled ? 0.4 : 1 }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateCenter} onPress={goToToday} activeOpacity={0.7}>
            <Text style={[styles.dateLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {todayLabel}
            </Text>
            <Text style={[styles.dateText, { color: isDark ? colors.textDark : colors.text }]}>
              {dateDisplay}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNextDay}
            style={styles.dateButton}
            disabled={rightArrowDisabled}
            activeOpacity={rightArrowDisabled ? 1 : 0.7}
          >
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={22}
              color={isDark ? colors.textDark : colors.text}
              style={{ opacity: rightArrowDisabled ? 0.4 : 1 }}
            />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View>
            {activeTab === 'tracking' ? renderTrackingContent() : renderPlanningContent()}
            <View style={styles.bottomSpacer} />
          </View>
        )}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
}

function MacroSummaryRowCompact({ label, eaten, goal, color, isDark }: any) {
  const percentage = Math.min((eaten / goal) * 100, 100);
  return (
    <View style={styles.macroSummaryRowCompact}>
      <Text style={[styles.macroSummaryLabelCompact, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.macroSummaryBarContainer}>
        <View style={[styles.macroSummaryBarBackground, { backgroundColor: isDark ? colors.borderDark : colors.border }]}>
          <View style={[styles.macroSummaryBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.macroSummaryProgressCompact, { color: isDark ? colors.textDark : colors.text }]}>
          {eaten} / {goal}g
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography.body, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  retryButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateButton: { padding: spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dateCenter: { alignItems: 'center', flex: 1 },
  dateLabel: { ...typography.caption, marginBottom: 2 },
  dateText: { ...typography.h3 },
  segmentedControlWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  caloriesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  cardTitle: { ...typography.h3, marginBottom: spacing.md },
  caloriesContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  macroSummaryCompact: { flex: 1, gap: spacing.sm },
  macroSummaryRowCompact: { gap: 4 },
  macroSummaryLabelCompact: { fontSize: 12, fontWeight: '500' },
  macroSummaryBarContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  macroSummaryBarBackground: { flex: 1, height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  macroSummaryBarFill: { height: '100%', borderRadius: borderRadius.full },
  macroSummaryProgressCompact: { fontSize: 11, fontWeight: '500', minWidth: 70, textAlign: 'right' },
  mealCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  mealHeaderLeft: { flex: 1, marginRight: 8 },
  mealMacroRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', marginTop: 2 },
  mealMacroDot: { fontSize: 11, fontWeight: '500' },
  mealMacroValue: { fontSize: 11, fontWeight: '600' },
  mealTitle: { ...typography.h3 },
  mealCalories: { ...typography.caption },
  addMealButton: { padding: spacing.xs },
  emptyMeal: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  emptyMealText: { ...typography.body },
  itemSeparator: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: spacing.xs },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  foodInfo: { flex: 1 },
  foodName: { ...typography.bodyBold, marginBottom: 2 },
  foodBrand: { ...typography.caption, marginBottom: 2 },
  foodDetails: { ...typography.caption },
  foodCalories: { alignItems: 'flex-end' },
  foodCaloriesValue: { ...typography.bodyBold, fontSize: 18 },
  foodCaloriesLabel: { ...typography.caption },
  bottomSpacer: { height: 40 },
  // Planning styles
  plansLoadingContainer: { paddingVertical: spacing.xxl, alignItems: 'center' },
  plansEmptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  plansEmptyContainer: { paddingVertical: spacing.xl, alignItems: 'center' },
  plansEmptyTitle: { ...typography.h3, marginTop: spacing.sm },
  plansEmptyText: { ...typography.body, textAlign: 'center' },
  planCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  planCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCardLeft: { flex: 1 },
  planName: { ...typography.bodyBold, marginBottom: 2 },
  planDateRange: { ...typography.caption },
  createPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  createPlanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // AI card styles
  aiCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 12px rgba(124, 58, 237, 0.15)',
    elevation: 3,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  aiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardText: { flex: 1 },
  aiCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  aiCardSubtitle: { fontSize: 13, lineHeight: 18 },
  aiComingSoonBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  aiComingSoonText: { fontSize: 12, fontWeight: '600' },
});
