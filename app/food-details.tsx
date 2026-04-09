import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
import { Food } from '@/types';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ food: string; meal_type?: string; date?: string }>();

  const food: Food = params.food ? JSON.parse(params.food) : null;
  const [servingSize, setServingSize] = useState(String(food?.serving_size ?? 100));
  const [mealType, setMealType] = useState<MealType>((params.meal_type as MealType) ?? 'breakfast');
  const [saving, setSaving] = useState(false);

  if (!food) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.danger }}>Food data not found</Text>
      </View>
    );
  }

  const baseServing = food.serving_size > 0 ? food.serving_size : 100;
  const multiplier = (Number(servingSize) || 0) / baseServing;
  const calcCalories = Math.round((Number(food.calories) || 0) * multiplier);
  const calcProtein = ((Number(food.protein) || 0) * multiplier).toFixed(1);
  const calcCarbs = ((Number(food.carbs) || 0) * multiplier).toFixed(1);
  const calcFat = ((Number(food.fat) || 0) * multiplier).toFixed(1);

  const handleAddToDiary = async () => {
    console.log('[FoodDetails] Add to diary pressed:', food.name, 'serving:', servingSize, 'meal:', mealType);
    setSaving(true);
    try {
      await apiPost(`${API_BASE}/api/food-logs`, {
        food_name: food.name,
        calories: calcCalories,
        protein: Number(calcProtein),
        carbs: Number(calcCarbs),
        fat: Number(calcFat),
        serving_size: Number(servingSize) || baseServing,
        serving_unit: food.serving_unit,
        meal_type: mealType,
        logged_at: params.date ?? new Date().toISOString().split('T')[0],
      });
      router.back();
    } catch (err) {
      console.error('[FoodDetails] Add to diary error:', err);
      Alert.alert('Error', 'Failed to add food to diary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <>
      <Stack.Screen options={{ title: food.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Food Header */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3, marginBottom: 4 }}>
            {food.name}
          </Text>
          {food.brand ? (
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 }}>{food.brand}</Text>
          ) : (
            <View style={{ marginBottom: 16 }} />
          )}

          {/* Macro Grid */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Calories', value: String(calcCalories), unit: 'kcal', color: COLORS.primary },
              { label: 'Protein', value: calcProtein, unit: 'g', color: COLORS.protein },
              { label: 'Carbs', value: calcCarbs, unit: 'g', color: COLORS.carbs },
              { label: 'Fat', value: calcFat, unit: 'g', color: COLORS.fat },
            ].map(item => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{item.unit}</Text>
                <Text style={{ fontSize: 10, color: COLORS.textTertiary }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Serving Size */}
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Serving Size</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TextInput
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="numeric"
              style={{
                flex: 1,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 18,
                fontWeight: '700',
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
                textAlign: 'center',
              }}
            />
            <View
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textSecondary }}>{food.serving_unit}</Text>
            </View>
          </View>
        </View>

        {/* Meal Type */}
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Add to Meal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEAL_TYPES.map(mt => {
              const isSelected = mealType === mt;
              const label = mt.charAt(0).toUpperCase() + mt.slice(1);
              return (
                <AnimatedPressable
                  key={mt}
                  onPress={() => {
                    console.log('[FoodDetails] Meal type selected:', mt);
                    setMealType(mt);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isSelected ? '#fff' : COLORS.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Add Button */}
        <View style={{ paddingHorizontal: 16 }}>
          <AnimatedPressable
            onPress={handleAddToDiary}
            disabled={saving}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 16,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                Add to {mealLabel}
              </Text>
            )}
          </AnimatedPressable>
        </View>
      </ScrollView>
    </>
  );
}
