
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Alert, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { MyMealTemplateItem } from '@/types/myMealTemplate';
import { createMyMealTemplate, calculateMyMealSummary } from '@/utils/myMealTemplateDatabase';

// Type for draft items with temp_id
type DraftItem = Omit<MyMealTemplateItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'> & {
  temp_id: string;
};

export default function MyMealBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftId] = useState(() => `draft_${Date.now()}`);

  // ISSUE 2 FIX: Handle returned food item from Add Food flows
  // This effect properly appends items without overwriting
  useEffect(() => {
    if (params.returnedFood) {
      try {
        const foodData = JSON.parse(params.returnedFood as string);
        console.log('[MyMealBuilder] ========== RECEIVED RETURNED FOOD ==========');
        console.log('[MyMealBuilder] Food name:', foodData.food_name);
        console.log('[MyMealBuilder] Current items count BEFORE append:', items.length);
        
        // CRITICAL: Generate unique temp_id using timestamp + random
        // This ensures React doesn't reuse keys and overwrite items
        const uniqueTempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('[MyMealBuilder] Generated unique temp_id:', uniqueTempId);
        
        // Create new item with unique temp_id
        const newItem: DraftItem = {
          temp_id: uniqueTempId,
          food_source: foodData.food_source || 'library',
          food_id: foodData.food_id || undefined,
          barcode: foodData.barcode || undefined,
          ai_snapshot_id: foodData.ai_snapshot_id || undefined,
          food_name: foodData.food_name,
          brand: foodData.brand || undefined,
          amount_grams: foodData.amount_grams,
          amount_display: foodData.amount_display,
          per100_calories: foodData.per100_calories,
          per100_protein: foodData.per100_protein,
          per100_carbs: foodData.per100_carbs,
          per100_fat: foodData.per100_fat,
          per100_fiber: foodData.per100_fiber || 0,
        };
        
        console.log('[MyMealBuilder] Created new item:', {
          temp_id: newItem.temp_id,
          food_name: newItem.food_name,
          amount_grams: newItem.amount_grams,
        });
        
        // CRITICAL FIX: Use functional state update to ensure we're working with latest state
        // This prevents race conditions and ensures proper appending
        setItems(prevItems => {
          const newItems = [...prevItems, newItem];
          console.log('[MyMealBuilder] ✓ APPENDED item to list');
          console.log('[MyMealBuilder] Previous count:', prevItems.length);
          console.log('[MyMealBuilder] New count:', newItems.length);
          console.log('[MyMealBuilder] All temp_ids:', newItems.map(i => i.temp_id));
          return newItems;
        });
        
        // Clear the param to avoid re-adding on re-render
        router.setParams({ returnedFood: undefined });
      } catch (error) {
        console.error('[MyMealBuilder] ✗ Error parsing returned food:', error);
      }
    }
  }, [params.returnedFood]); // Only depend on returnedFood param

  const handleAddFood = () => {
    console.log('[MyMealBuilder] ========== OPENING ADD FOOD MENU ==========');
    console.log('[MyMealBuilder] Draft ID:', draftId);
    console.log('[MyMealBuilder] Current items count:', items.length);
    console.log('[MyMealBuilder] Current items:', items.map(i => ({ temp_id: i.temp_id, name: i.food_name })));
    
    // Navigate to Add Food with builder mode
    router.push({
      pathname: '/add-food',
      params: {
        mode: 'my_meal_builder',
        returnTo: '/my-meal-builder',
        mealId: draftId,
      },
    });
  };

  const handleRemoveItem = (tempId: string) => {
    console.log('[MyMealBuilder] ========== REMOVING ITEM ==========');
    console.log('[MyMealBuilder] Removing item with temp_id:', tempId);
    console.log('[MyMealBuilder] Current items count:', items.length);
    
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.temp_id !== tempId);
      console.log('[MyMealBuilder] ✓ Item removed');
      console.log('[MyMealBuilder] New items count:', newItems.length);
      return newItems;
    });
  };

  const handleSave = async () => {
    console.log('[MyMealBuilder] ========== SAVE MY MEAL ==========');
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one food item');
      return;
    }

    setSaving(true);

    try {
      console.log('[MyMealBuilder] Saving My Meal:', name);
      console.log('[MyMealBuilder] Items count:', items.length);
      console.log('[MyMealBuilder] Items:', items.map(i => ({ name: i.food_name, grams: i.amount_grams })));
      
      // Remove temp_id before saving to database
      const itemsToSave = items.map(({ temp_id, ...item }) => item);
      
      const result = await createMyMealTemplate(name.trim(), itemsToSave, note.trim() || undefined);

      if (result) {
        console.log('[MyMealBuilder] ✓ My Meal created successfully');
        console.log('[MyMealBuilder] Template ID:', result.id);
        
        // FIXED: Navigate back to Add Food with My Meals tab active
        // Use dismissTo to properly close the builder and return to Add Food
        console.log('[MyMealBuilder] Navigating to Add Food → My Meals tab');
        
        // Clear the draft state
        setName('');
        setNote('');
        setItems([]);
        
        // Navigate back to Add Food with My Meals tab selected
        // Use dismissTo to clear the builder from the stack
        router.dismissTo({
          pathname: '/add-food',
          params: {
            meal: 'breakfast', // Default meal type
            date: new Date().toISOString().split('T')[0],
            showMyMeals: 'true', // Flag to show My Meals tab
            refresh: Date.now().toString(), // Timestamp to force refresh
          },
        });
      } else {
        console.error('[MyMealBuilder] ✗ Failed to save meal');
        Alert.alert('Error', 'Failed to save meal. Please try again.');
      }
    } catch (error) {
      console.error('[MyMealBuilder] ✗ Error saving meal:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const summary = items.length > 0 ? calculateMyMealSummary(items as MyMealTemplateItem[]) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Create My Meal
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
              Meal Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                  borderColor: isDark ? colors.borderDark : colors.border,
                  color: isDark ? colors.textDark : colors.text,
                },
              ]}
              placeholder="e.g., Breakfast Combo, Post-Workout"
              placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text, marginTop: spacing.md }]}>
              Note (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                  borderColor: isDark ? colors.borderDark : colors.border,
                  color: isDark ? colors.textDark : colors.text,
                },
              ]}
              placeholder="Add any notes about this meal..."
              placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          {summary && (
            <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Meal Summary
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
            <View style={styles.itemsHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Foods ({items.length})
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddFood}
              >
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.addButtonText}>Add Food</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyItems}>
                <Text style={[styles.emptyItemsText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  No foods added yet. Tap "Add Food" to get started.
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {/* CRITICAL: Use temp_id as key to prevent React from reusing components */}
                {items.map((item) => (
                  <View
                    key={item.temp_id}
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
                      <Text style={[styles.itemNutrition, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round((item.per100_calories * item.amount_grams) / 100)} kcal • P: {Math.round((item.per100_protein * item.amount_grams) / 100)}g • C: {Math.round((item.per100_carbs * item.amount_grams) / 100)}g • F: {Math.round((item.per100_fat * item.amount_grams) / 100)}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item.temp_id)}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  saveText: {
    ...typography.bodyBold,
    fontSize: 16,
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
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyItems: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyItemsText: {
    ...typography.body,
    textAlign: 'center',
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  itemNutrition: {
    ...typography.caption,
    fontSize: 11,
  },
  removeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  bottomSpacer: {
    height: 100,
  },
});
