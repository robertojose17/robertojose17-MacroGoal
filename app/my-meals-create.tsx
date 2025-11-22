
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Alert, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { MyMealItem } from '@/types/myMeals';
import { createMyMeal, calculateMyMealSummary } from '@/utils/myMealsDatabase';

export default function CreateMyMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Omit<MyMealItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'>[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftId] = useState(() => `draft_${Date.now()}`); // Generate a unique draft ID

  // Handle returned food item from Add Food flows
  useEffect(() => {
    if (params.returnedFood) {
      try {
        const foodData = JSON.parse(params.returnedFood as string);
        console.log('[CreateMyMeal] Received returned food:', foodData);
        
        // Add the food to items list
        const newItem: Omit<MyMealItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'> = {
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
        
        console.log('[CreateMyMeal] Adding item to draft:', newItem.food_name);
        setItems(prevItems => [...prevItems, newItem]);
        
        // Clear the param to avoid re-adding on re-render
        router.setParams({ returnedFood: undefined });
      } catch (error) {
        console.error('[CreateMyMeal] Error parsing returned food:', error);
      }
    }
  }, [params.returnedFood]);

  const handleAddFood = () => {
    console.log('[CreateMyMeal] Opening Add Food menu in My Meal Builder mode');
    console.log('[CreateMyMeal] Draft ID:', draftId);
    
    // Navigate to the main Add Food screen with mode parameter
    router.push({
      pathname: '/add-food',
      params: {
        mode: 'my_meal_builder',
        returnTo: '/my-meals-create',
        mealId: draftId, // Pass the draft ID
      },
    });
  };

  const handleRemoveItem = (index: number) => {
    console.log('[CreateMyMeal] Removing item at index:', index);
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
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
      console.log('[CreateMyMeal] Saving My Meal:', name);
      console.log('[CreateMyMeal] Items count:', items.length);
      
      const result = await createMyMeal({
        name: name.trim(),
        note: note.trim() || undefined,
        items: items,
      });

      if (result) {
        console.log('[CreateMyMeal] My Meal created successfully');
        Alert.alert('Success', 'Meal saved successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save meal. Please try again.');
      }
    } catch (error) {
      console.error('[CreateMyMeal] Error saving meal:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const summary = items.length > 0 ? calculateMyMealSummary(items as MyMealItem[]) : null;

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
            Create Meal
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
                      <Text style={[styles.itemNutrition, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round((item.per100_calories * item.amount_grams) / 100)} kcal • P: {Math.round((item.per100_protein * item.amount_grams) / 100)}g • C: {Math.round((item.per100_carbs * item.amount_grams) / 100)}g • F: {Math.round((item.per100_fat * item.amount_grams) / 100)}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(index)}
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
