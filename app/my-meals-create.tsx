
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import SwipeToDeleteRow from '@/components/SwipeToDeleteRow';
import { loadDraft, saveDraft, clearDraft, DraftItem } from '@/utils/myMealsDraft';

export default function MyMealsCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;

  const [mealName, setMealName] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize: clear draft on first mount
  React.useEffect(() => {
    const initializeScreen = async () => {
      if (!isInitialized) {
        console.log('[MyMealsCreate] Initializing screen, clearing old draft');
        await clearDraft();
        setIsInitialized(true);
      }
    };
    initializeScreen();
  }, [isInitialized]);

  // Load draft items from AsyncStorage when screen focuses
  useFocusEffect(
    useCallback(() => {
      console.log('[MyMealsCreate] Screen focused');
      if (isInitialized) {
        loadDraftFromStorage();
      }
    }, [isInitialized])
  );

  const loadDraftFromStorage = async () => {
    try {
      const draft = await loadDraft();
      console.log('[MyMealsCreate] Loaded draft:', draft.length, 'items');
      setDraftItems(draft);
    } catch (error) {
      console.error('[MyMealsCreate] Error loading draft:', error);
    }
  };

  const handleAddFood = () => {
    console.log('[MyMealsCreate] Navigating to add food');
    // Navigate to add-food with context="my_meal_builder"
    router.push({
      pathname: '/add-food',
      params: {
        mode: 'my_meal_builder',
        context: 'my_meal_builder',
        meal: mealType,
        date: date,
        returnTo: '/my-meals-create',
      },
    });
  };

  const handleRemoveItem = async (tempId: string) => {
    console.log('[MyMealsCreate] Removing item:', tempId);
    const updatedItems = draftItems.filter(item => item.tempId !== tempId);
    setDraftItems(updatedItems);
    await saveDraft(updatedItems);
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    if (draftItems.length === 0) {
      Alert.alert('Error', 'Please add at least one food item');
      return;
    }

    console.log('[MyMealsCreate] Saving meal:', mealName);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save meals');
        setSaving(false);
        return;
      }

      // Create saved meal
      const { data: savedMeal, error: mealError } = await supabase
        .from('saved_meals')
        .insert({
          user_id: user.id,
          name: mealName.trim(),
        })
        .select()
        .single();

      if (mealError) {
        console.error('[MyMealsCreate] Error creating saved meal:', mealError);
        Alert.alert('Error', 'Failed to save meal');
        setSaving(false);
        return;
      }

      console.log('[MyMealsCreate] Saved meal created:', savedMeal.id);

      // Create saved meal items
      const itemsToInsert = draftItems.map(item => ({
        saved_meal_id: savedMeal.id,
        food_id: item.food_id,
        serving_amount: item.serving_amount,
        serving_unit: item.serving_unit,
        servings_count: item.servings_count,
      }));

      const { error: itemsError } = await supabase
        .from('saved_meal_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[MyMealsCreate] Error creating saved meal items:', itemsError);
        // Rollback: delete the saved meal
        await supabase.from('saved_meals').delete().eq('id', savedMeal.id);
        Alert.alert('Error', 'Failed to save meal items');
        setSaving(false);
        return;
      }

      console.log('[MyMealsCreate] Meal saved successfully!');
      
      // Clear draft after successful save
      await clearDraft();
      
      Alert.alert('Success', 'Meal saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      setSaving(false);
    } catch (error) {
      console.error('[MyMealsCreate] Error in handleSave:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setSaving(false);
    }
  };

  const calculateTotals = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    draftItems.forEach(item => {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFats += item.fats;
    });

    return {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
    };
  };

  const totals = calculateTotals();

  const renderDraftItem = (item: DraftItem, index: number) => {
    return (
      <React.Fragment key={item.tempId}>
        <SwipeToDeleteRow onDelete={() => handleRemoveItem(item.tempId)}>
          <View style={[styles.itemCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: isDark ? colors.textDark : colors.text }]}>
                {item.food_name}
              </Text>
              {item.food_brand && (
                <Text style={[styles.itemBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {item.food_brand}
                </Text>
              )}
              <Text style={[styles.itemServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {item.servings_count} × {item.serving_amount} {item.serving_unit} • {Math.round(item.calories)} cal
              </Text>
              <Text style={[styles.itemMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                P: {Math.round(item.protein)}g • C: {Math.round(item.carbs)}g • F: {Math.round(item.fats)}g
              </Text>
            </View>
          </View>
        </SwipeToDeleteRow>
      </React.Fragment>
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
          Create Meal
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.nameCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.nameLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Meal Name
          </Text>
          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: isDark ? colors.backgroundDark : colors.background,
                borderColor: isDark ? colors.borderDark : colors.border,
                color: isDark ? colors.textDark : colors.text,
              }
            ]}
            placeholder="e.g., Breakfast Bowl, Post-Workout Meal"
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={mealName}
            onChangeText={setMealName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Foods ({draftItems.length})
          </Text>
          <TouchableOpacity
            style={[styles.addFoodButton, { backgroundColor: colors.primary }]}
            onPress={handleAddFood}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.addFoodButtonText}>Add Food</Text>
          </TouchableOpacity>
        </View>

        {draftItems.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="fork.knife"
              android_material_icon_name="restaurant"
              size={48}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              No foods added yet
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Tap "Add Food" to start building your meal
            </Text>
          </View>
        ) : (
          <React.Fragment>
            {draftItems.map((item, index) => renderDraftItem(item, index))}

            <View style={[styles.totalsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.totalsTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Total Nutrition
              </Text>
              <View style={styles.totalsRow}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { color: colors.calories }]}>
                    {Math.round(totals.calories)}
                  </Text>
                  <Text style={[styles.totalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Calories
                  </Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { color: colors.protein }]}>
                    {Math.round(totals.protein)}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Protein
                  </Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { color: colors.carbs }]}>
                    {Math.round(totals.carbs)}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Carbs
                  </Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { color: colors.fats }]}>
                    {Math.round(totals.fats)}g
                  </Text>
                  <Text style={[styles.totalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Fat
                  </Text>
                </View>
              </View>
            </View>
          </React.Fragment>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {draftItems.length > 0 && (
        <View style={[styles.footer, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Meal</Text>
            )}
          </TouchableOpacity>
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
  nameCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
  },
  nameLabel: {
    ...typography.caption,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  addFoodButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    fontSize: 15,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    fontSize: 13,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  itemBrand: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  itemServing: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  itemMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  totalsCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
  },
  totalsTitle: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  totalLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
  },
  saveButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
