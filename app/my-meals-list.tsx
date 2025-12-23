
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import SwipeToDeleteRow from '@/components/SwipeToDeleteRow';
import { supabase } from '@/app/integrations/supabase/client';
import { MyMeal } from '@/types';

export default function MyMealsListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [myMeals, setMyMeals] = useState<MyMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [deletedMealName, setDeletedMealName] = useState('');
  
  // 🔥 FIX: Prevent refetch during delete operations
  const isDeletingRef = useRef(false);
  const deleteCountRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      console.log('[MyMealsList] 🔄 Screen focused');
      // 🔥 FIX: Only load if not currently deleting
      if (!isDeletingRef.current) {
        console.log('[MyMealsList] ✅ Loading meals (not deleting)');
        loadMyMeals();
      } else {
        console.log('[MyMealsList] ⏸️ Skipping load (delete in progress)');
      }
    }, [])
  );

  const loadMyMeals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[MyMealsList] ❌ No user found');
        setLoading(false);
        return;
      }

      console.log('[MyMealsList] 📥 Loading My Meals for user:', user.id);

      const { data: mealsData, error } = await supabase
        .from('my_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MyMealsList] ❌ Error loading My Meals:', error);
        Alert.alert('Error', 'Failed to load My Meals');
      } else {
        console.log('[MyMealsList] ✅ Loaded', mealsData?.length || 0, 'My Meals');
        setMyMeals(mealsData || []);
      }
    } catch (error) {
      console.error('[MyMealsList] ❌ Error in loadMyMeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMyMeal = () => {
    console.log('[MyMealsList] ➕ Navigating to create My Meal');
    router.push('/my-meal-builder');
  };

  const handleOpenMyMeal = (meal: MyMeal) => {
    console.log('[MyMealsList] 👁️ Opening My Meal details:', meal.id);
    router.push({
      pathname: '/my-meal-details',
      params: {
        mealId: meal.id,
      },
    });
  };

  const handleDeleteMyMeal = async (meal: MyMeal) => {
    // 🔥 FIX: Set deleting flag to prevent refetch
    isDeletingRef.current = true;
    deleteCountRef.current += 1;
    const deleteNumber = deleteCountRef.current;
    
    console.log(`[MyMealsList] 🗑️ DELETE #${deleteNumber} STARTED - Meal: "${meal.name}" (ID: ${meal.id})`);
    console.log(`[MyMealsList] 📊 BEFORE DELETE - Total meals: ${myMeals.length}`);
    
    try {
      // Store meal name for toast
      const mealName = meal.name;
      const mealId = meal.id;

      // 🔥 STEP 1: IMMEDIATELY remove from UI for instant feedback
      console.log(`[MyMealsList] 🎯 DELETE #${deleteNumber} - Removing from local state`);
      setMyMeals(prevMeals => {
        const filtered = prevMeals.filter(m => m.id !== mealId);
        console.log(`[MyMealsList] 📊 DELETE #${deleteNumber} - Local state updated: ${prevMeals.length} → ${filtered.length} meals`);
        return filtered;
      });

      // 🔥 STEP 2: Delete meal items first (foreign key constraint)
      console.log(`[MyMealsList] 🗑️ DELETE #${deleteNumber} - Deleting meal items from backend...`);
      const { error: itemsError } = await supabase
        .from('my_meal_items')
        .delete()
        .eq('my_meal_id', mealId);

      if (itemsError) {
        console.error(`[MyMealsList] ❌ DELETE #${deleteNumber} - Error deleting meal items:`, itemsError);
        // Restore the meal if deletion failed
        setMyMeals(prevMeals => [...prevMeals, meal].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        Alert.alert('Error', 'Failed to delete meal items');
        isDeletingRef.current = false;
        return;
      }
      console.log(`[MyMealsList] ✅ DELETE #${deleteNumber} - Meal items deleted successfully`);

      // 🔥 STEP 3: Delete the meal
      console.log(`[MyMealsList] 🗑️ DELETE #${deleteNumber} - Deleting meal from backend...`);
      const { error: mealError } = await supabase
        .from('my_meals')
        .delete()
        .eq('id', mealId);

      if (mealError) {
        console.error(`[MyMealsList] ❌ DELETE #${deleteNumber} - Error deleting meal:`, mealError);
        // Restore the meal if deletion failed
        setMyMeals(prevMeals => [...prevMeals, meal].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        Alert.alert('Error', 'Failed to delete meal');
        isDeletingRef.current = false;
        return;
      }
      console.log(`[MyMealsList] ✅ DELETE #${deleteNumber} - Meal deleted from backend successfully`);

      // 🔥 STEP 4: Refetch to ensure consistency
      console.log(`[MyMealsList] 🔄 DELETE #${deleteNumber} - Refetching meals to confirm deletion...`);
      await loadMyMeals();
      console.log(`[MyMealsList] ✅ DELETE #${deleteNumber} - Refetch complete`);
      
      // Show success toast
      setDeletedMealName(mealName);
      setShowDeleteToast(true);
      setTimeout(() => {
        setShowDeleteToast(false);
      }, 3000);

      console.log(`[MyMealsList] 🎉 DELETE #${deleteNumber} COMPLETE - "${mealName}" deleted successfully`);
    } catch (error) {
      console.error(`[MyMealsList] ❌ DELETE #${deleteNumber} - Unexpected error:`, error);
      // Restore the meal if an unexpected error occurred
      setMyMeals(prevMeals => [...prevMeals, meal].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      Alert.alert('Error', 'An error occurred while deleting');
    } finally {
      // 🔥 FIX: Clear deleting flag after operation completes
      isDeletingRef.current = false;
      console.log(`[MyMealsList] 🏁 DELETE #${deleteNumber} - Deleting flag cleared`);
    }
  };

  const renderMyMealCard = (meal: MyMeal, index: number) => {
    return (
      <SwipeToDeleteRow
        key={meal.id || `meal-${index}`}
        onDelete={() => {
          console.log(`[MyMealsList] 👆 Swipe delete triggered for: "${meal.name}"`);
          handleDeleteMyMeal(meal);
        }}
      >
        <TouchableOpacity
          style={[
            styles.mealCard,
            { backgroundColor: isDark ? colors.cardDark : colors.card }
          ]}
          onPress={() => handleOpenMyMeal(meal)}
          activeOpacity={0.7}
        >
          <View style={styles.mealInfo}>
            <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
              {meal.name}
            </Text>
            {meal.note && (
              <Text style={[styles.mealNote, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {meal.note}
              </Text>
            )}
            <View style={styles.mealStats}>
              <Text style={[styles.mealCalories, { color: colors.calories }]}>
                {Math.round(meal.total_calories)} cal
              </Text>
              <Text style={[styles.mealMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                P: {Math.round(meal.total_protein)}g • C: {Math.round(meal.total_carbs)}g • F: {Math.round(meal.total_fats)}g
              </Text>
            </View>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
        </TouchableOpacity>
      </SwipeToDeleteRow>
    );
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} 
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          My Meals
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateMyMeal}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add_circle"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.createButtonText}>Create My Meal</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Loading...
            </Text>
          </View>
        ) : myMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="fork.knife"
              android_material_icon_name="restaurant"
              size={64}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
              No saved meals yet
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.xs }]}>
              Create a meal template to quickly log your favorite meals
            </Text>
          </View>
        ) : (
          myMeals.map((meal, index) => renderMyMealCard(meal, index))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delete Success Toast */}
      {showDeleteToast && (
        <View style={[styles.toast, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check_circle"
            size={20}
            color={colors.success || '#4CAF50'}
          />
          <Text style={[styles.toastText, { color: isDark ? colors.textDark : colors.text }]}>
            &quot;{deletedMealName}&quot; deleted
          </Text>
        </View>
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
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  createButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 4,
  },
  mealNote: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 6,
  },
  mealStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealCalories: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  mealMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    fontSize: 14,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  toastText: {
    ...typography.body,
    fontSize: 15,
    flex: 1,
  },
});
