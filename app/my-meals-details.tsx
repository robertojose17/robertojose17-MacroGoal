import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
import { Meal } from '@/types';
import { Edit, Plus } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MyMealsDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; meal: string }>();
  const meal: Meal = params.meal ? JSON.parse(params.meal) : null;
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [adding, setAdding] = useState(false);

  if (!meal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.danger }}>Meal data not found</Text>
      </View>
    );
  }

  const items = meal.items ?? [];
  const totalCals = items.reduce((s, i) => s + (Number(i.calories) || 0), 0);
  const totalProtein = items.reduce((s, i) => s + (Number(i.protein) || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (Number(i.carbs) || 0), 0);
  const totalFat = items.reduce((s, i) => s + (Number(i.fat) || 0), 0);

  const handleAddToDiary = async () => {
    console.log('[MyMealsDetails] Add to diary pressed, meal:', meal.name, 'type:', mealType);
    setAdding(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await Promise.all(
        items.map(item =>
          apiPost(`${API_BASE}/api/food-logs`, {
            food_name: item.food_name,
            calories: Number(item.calories),
            protein: Number(item.protein),
            carbs: Number(item.carbs),
            fat: Number(item.fat),
            serving_size: Number(item.serving_size),
            serving_unit: item.serving_unit,
            meal_type: mealType,
            logged_at: today,
          })
        )
      );
      Alert.alert('Added!', `${meal.name} has been added to your ${mealType}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[MyMealsDetails] Add to diary error:', err);
      Alert.alert('Error', 'Failed to add meal to diary. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <>
      <Stack.Screen
        options={{
          title: meal.name,
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[MyMealsDetails] Edit pressed');
                router.push({ pathname: '/my-meals-edit', params: { id: meal.id, meal: JSON.stringify(meal) } });
              }}
              style={{ padding: 8 }}
            >
              <Edit size={20} color={COLORS.primary} />
            </AnimatedPressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Macro Summary */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 }}>Nutrition Summary</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Calories', value: String(Math.round(totalCals)), unit: 'kcal', color: COLORS.primary },
              { label: 'Protein', value: String(Math.round(totalProtein)), unit: 'g', color: COLORS.protein },
              { label: 'Carbs', value: String(Math.round(totalCarbs)), unit: 'g', color: COLORS.carbs },
              { label: 'Fat', value: String(Math.round(totalFat)), unit: 'g', color: COLORS.fat },
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

        {/* Items */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
            Items ({items.length})
          </Text>
          {items.map((item, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                {item.food_name}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                {item.serving_size}{item.serving_unit} · P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fat)}g
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 4 }}>
                {Math.round(Number(item.calories))} kcal
              </Text>
            </View>
          ))}
        </View>

        {/* Meal Type Selector */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Add to Meal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEAL_TYPES.map(mt => {
              const isSelected = mealType === mt;
              const label = mt.charAt(0).toUpperCase() + mt.slice(1);
              return (
                <AnimatedPressable
                  key={mt}
                  onPress={() => setMealType(mt)}
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
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : COLORS.textSecondary }}>
                    {label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <AnimatedPressable
          onPress={handleAddToDiary}
          disabled={adding || items.length === 0}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 16,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {adding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              Add to {mealTypeLabel}
            </Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
