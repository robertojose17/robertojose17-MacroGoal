
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

export default function QuickAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const mode = params.mode as string;
  const returnTo = params.returnTo as string;
  const targetMealId = params.mealId as string;

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [fiber, setFiber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!foodName.trim() || !calories.trim()) {
      Alert.alert('Error', 'Please enter at least food name and calories');
      return;
    }

    setSaving(true);

    try {
      // Check if we're in My Meal Builder mode
      if (mode === 'my_meal_builder') {
        console.log('[QuickAdd] My Meal Builder mode - returning food data');
        
        // Prepare food data to return
        const foodData = {
          food_source: 'quickadd',
          food_id: undefined,
          food_name: foodName.trim(),
          brand: undefined,
          amount_grams: 100, // Quick add is per serving, we'll use 100g as base
          amount_display: '1 serving',
          per100_calories: parseFloat(calories) || 0,
          per100_protein: parseFloat(protein) || 0,
          per100_carbs: parseFloat(carbs) || 0,
          per100_fat: parseFloat(fats) || 0,
          per100_fiber: parseFloat(fiber) || 0,
        };
        
        console.log('[QuickAdd] Returning food data:', foodData);
        
        // Navigate back to the return screen with the food data
        if (returnTo) {
          router.push({
            pathname: returnTo,
            params: {
              returnedFood: JSON.stringify(foodData),
              mealId: targetMealId,
            },
          });
        } else {
          console.error('[QuickAdd] No returnTo path specified');
          router.back();
        }
        
        setSaving(false);
        return;
      }

      // Normal diary mode - log to diary
      console.log('[QuickAdd] Starting Quick Add save process...');
      console.log('[QuickAdd] Meal:', mealType, 'Date:', date);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[QuickAdd] No user found');
        Alert.alert('Error', 'You must be logged in to add food');
        setSaving(false);
        return;
      }

      console.log('[QuickAdd] User ID:', user.id);

      // Create food entry
      const foodPayload = {
        name: foodName.trim(),
        serving_amount: 1,
        serving_unit: 'serving',
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        fiber: parseFloat(fiber) || 0,
        user_created: true,
        created_by: user.id,
      };

      console.log('[QuickAdd] Creating food with payload:', foodPayload);

      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .insert(foodPayload)
        .select()
        .single();

      if (foodError) {
        console.error('[QuickAdd] Error creating food:', foodError);
        Alert.alert('Error', `Failed to create food entry: ${foodError.message}`);
        setSaving(false);
        return;
      }

      console.log('[QuickAdd] Food created successfully:', foodData);

      // Create or get meal for the date
      console.log('[QuickAdd] Looking for existing meal...');
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (!mealId) {
        console.log('[QuickAdd] No existing meal found, creating new meal...');
        const { data: newMeal, error: mealError } = await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            date: date,
            meal_type: mealType,
          })
          .select()
          .single();

        if (mealError) {
          console.error('[QuickAdd] Error creating meal:', mealError);
          Alert.alert('Error', `Failed to create meal: ${mealError.message}`);
          setSaving(false);
          return;
        }

        mealId = newMeal.id;
        console.log('[QuickAdd] New meal created:', mealId);
      } else {
        console.log('[QuickAdd] Using existing meal:', mealId);
      }

      // Add meal item
      const mealItemPayload = {
        meal_id: mealId,
        food_id: foodData.id,
        quantity: 1,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        fiber: parseFloat(fiber) || 0,
        serving_description: '1 serving',
        grams: null,
      };

      console.log('[QuickAdd] Creating meal item with payload:', mealItemPayload);

      const { data: mealItemData, error: mealItemError } = await supabase
        .from('meal_items')
        .insert(mealItemPayload)
        .select()
        .single();

      if (mealItemError) {
        console.error('[QuickAdd] Error creating meal item:', mealItemError);
        Alert.alert('Error', `Failed to add food to meal: ${mealItemError.message}`);
        setSaving(false);
        return;
      }

      console.log('[QuickAdd] ✅ Meal item created successfully:', mealItemData);
      console.log('[QuickAdd] Quick Add complete! Navigating back to diary...');
      
      // Success! Navigate back
      // We need to go back twice: once to close quick-add, once to close add-food
      // This will return to the diary which will refresh via useFocusEffect
      setSaving(false);
      
      // Use replace to go directly back to home, which will trigger a refresh
      router.replace('/(tabs)/(home)/');
      
    } catch (error) {
      console.error('[QuickAdd] Unexpected error in handleSave:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Food Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                Food Name *
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                placeholder="e.g., Homemade Smoothie"
                placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                value={foodName}
                onChangeText={setFoodName}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                Calories *
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                placeholder="e.g., 250"
                placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={setCalories}
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text, marginTop: spacing.lg }]}>
              Macros (Optional)
            </Text>

            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                  Protein (g)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={protein}
                  onChangeText={setProtein}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.macroInput}>
                <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                  Carbs (g)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={carbs}
                  onChangeText={setCarbs}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                  Fats (g)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={fats}
                  onChangeText={setFats}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.macroInput}>
                <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                  Fiber (g)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={fiber}
                  onChangeText={setFiber}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === 'my_meal_builder' ? 'Add to My Meal' : `Add to ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`}
              </Text>
            )}
          </TouchableOpacity>

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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroInput: {
    flex: 1,
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
  bottomSpacer: {
    height: 100,
  },
});
