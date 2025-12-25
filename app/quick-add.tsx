
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import SwipeToDeleteRow from '@/components/SwipeToDeleteRow';

interface MyFood {
  id: string;
  name: string;
  brand?: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  created_at: string;
}

export default function QuickAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [myFoods, setMyFoods] = useState<MyFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMyFoods = useCallback(async () => {
    console.log('[QuickAdd] ========== LOADING SAVED FOODS ==========');
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[QuickAdd] No user found');
        setLoading(false);
        return;
      }

      console.log('[QuickAdd] Fetching user-created foods for user:', user.id);

      const { data: foods, error } = await supabase
        .from('foods')
        .select('*')
        .eq('user_created', true)
        .or(`created_by.eq.${user.id},created_by.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[QuickAdd] Error loading foods:', error);
        Alert.alert('Error', 'Failed to load your foods');
        setLoading(false);
        return;
      }

      console.log('[QuickAdd] ✅ Loaded', foods?.length || 0, 'custom foods');
      setMyFoods(foods || []);
      setLoading(false);
    } catch (error) {
      console.error('[QuickAdd] Error in loadMyFoods:', error);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[QuickAdd] Screen focused, loading saved foods');
      loadMyFoods();
    }, [loadMyFoods])
  );

  const handleQuickAddManual = () => {
    console.log('[QuickAdd] Opening manual entry form');
    router.push({
      pathname: '/add-food-simple',
      params: {
        mode: mode,
        meal: mealType,
        date: date,
        returnTo: returnTo,
        mealId: myMealId,
      },
    });
  };

  const handleCreateNewFood = () => {
    console.log('[QuickAdd] Navigating to create new food');
    router.push({
      pathname: '/my-foods-create',
      params: {
        meal: mealType,
        date: date,
        context: 'quickadd',
        returnTo: returnTo,
      },
    });
  };

  const handleSelectFood = useCallback((food: MyFood) => {
    console.log('[QuickAdd] Selected food:', food.name);
    
    // Convert to OpenFoodFacts format for food-details screen
    const offProduct = {
      code: '',
      product_name: food.name,
      brands: food.brand || '',
      serving_size: `${food.serving_amount} ${food.serving_unit}`,
      nutriments: {
        'energy-kcal_100g': food.calories,
        'proteins_100g': food.protein,
        'carbohydrates_100g': food.carbs,
        'fat_100g': food.fats,
        'fiber_100g': food.fiber,
        'sugars_100g': 0,
      },
    };

    router.push({
      pathname: '/food-details',
      params: {
        offData: JSON.stringify(offProduct),
        meal: mealType,
        date: date,
        context: 'quickadd',
        returnTo: returnTo || '/(tabs)/(home)/',
        mode: mode,
        mealId: myMealId,
      },
    });
  }, [router, mealType, date, returnTo, mode, myMealId]);

  const handleDeleteFood = useCallback(async (foodId: string) => {
    console.log('[QuickAdd] Deleting food:', foodId);

    // Optimistic update
    const previousFoods = [...myFoods];
    setMyFoods(myFoods.filter(f => f.id !== foodId));

    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', foodId);

      if (error) {
        console.error('[QuickAdd] Error deleting food:', error);
        setMyFoods(previousFoods);
        Alert.alert('Error', 'Failed to delete food');
      } else {
        console.log('[QuickAdd] ✅ Food deleted successfully');
      }
    } catch (error) {
      console.error('[QuickAdd] Error in handleDeleteFood:', error);
      setMyFoods(previousFoods);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  }, [myFoods]);

  const filteredFoods = myFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFoodItem = useCallback((food: MyFood, index: number) => {
    const servingText = `${food.serving_amount} ${food.serving_unit}`;
    const macrosText = `P: ${Math.round(food.protein)}g • C: ${Math.round(food.carbs)}g • F: ${Math.round(food.fats)}g`;

    return (
      <React.Fragment key={food.id}>
        <SwipeToDeleteRow onDelete={() => handleDeleteFood(food.id)}>
          <TouchableOpacity
            style={[styles.foodCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
            onPress={() => handleSelectFood(food)}
            activeOpacity={0.7}
          >
            <View style={styles.foodInfo}>
              <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
                {food.name}
              </Text>
              <Text style={[styles.foodServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {food.brand ? `${food.brand} • ` : ''}{servingText} • {Math.round(food.calories)} cal
              </Text>
              <Text style={[styles.foodMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {macrosText}
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
          </TouchableOpacity>
        </SwipeToDeleteRow>
      </React.Fragment>
    );
  }, [isDark, handleSelectFood, handleDeleteFood]);

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
          Quick Add
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action Row - 2 Buttons Side-by-Side */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
            onPress={handleQuickAddManual}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.actionButtonText, { color: isDark ? colors.textDark : colors.text }]}>
              Quick Add{'\n'}(Calories & Macros)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
            onPress={handleCreateNewFood}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="fork.knife"
              android_material_icon_name="restaurant"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.actionButtonText, { color: isDark ? colors.textDark : colors.text }]}>
              Create New Food
            </Text>
          </TouchableOpacity>
        </View>

        {/* Saved Foods Section */}
        <View style={styles.savedFoodsSection}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Saved Foods
          </Text>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? colors.cardDark : colors.card,
                borderColor: isDark ? colors.borderDark : colors.border,
              }
            ]}
          >
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: isDark ? colors.textDark : colors.text }
              ]}
              placeholder="Search saved foods..."
              placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Foods List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Loading saved foods...
              </Text>
            </View>
          ) : filteredFoods.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="fork.knife"
                android_material_icon_name="restaurant"
                size={48}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
                {searchQuery ? 'No foods found' : 'No saved foods yet'}
              </Text>
              <Text style={[styles.emptyMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {searchQuery ? 'Try a different search term' : 'Create your first food to reuse it anytime'}
              </Text>
            </View>
          ) : (
            <View style={styles.foodsList}>
              {filteredFoods.map((food, index) => renderFoodItem(food, index))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
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
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
    minHeight: 100,
  },
  actionButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  savedFoodsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 20,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    fontSize: 15,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 18,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  foodsList: {
    marginTop: spacing.xs,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  foodServing: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  foodMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  bottomSpacer: {
    height: 100,
  },
});
