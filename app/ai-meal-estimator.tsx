import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
import { Bot, Sparkles, Plus } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

interface EstimateResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [adding, setAdding] = useState(false);

  const handleEstimate = async () => {
    console.log('[AIMealEstimator] Estimate pressed, description:', description);
    if (!description.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost<EstimateResult>(`${API_BASE}/api/ai/estimate-meal`, {
        description: description.trim(),
      });
      setResult(data);
    } catch (err) {
      console.error('[AIMealEstimator] Estimate error:', err);
      Alert.alert('Error', 'Failed to estimate macros. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDiary = async () => {
    if (!result) return;
    console.log('[AIMealEstimator] Add to diary pressed:', result.name, 'type:', mealType);
    setAdding(true);
    try {
      await apiPost(`${API_BASE}/api/food-logs`, {
        food_name: result.name,
        calories: Number(result.calories),
        protein: Number(result.protein),
        carbs: Number(result.carbs),
        fat: Number(result.fat),
        serving_size: Number(result.serving_size) || 1,
        serving_unit: result.serving_unit || 'serving',
        meal_type: mealType,
        logged_at: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Added!', `${result.name} has been added to your ${mealType}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[AIMealEstimator] Add to diary error:', err);
      Alert.alert('Error', 'Failed to add to diary. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <>
      <Stack.Screen options={{ title: 'AI Estimator' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: 'rgba(245,158,11,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Bot size={32} color={COLORS.warning} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 }}>
            AI Macro Estimator
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 }}>
            Describe your meal and AI will estimate the macros
          </Text>
        </View>

        {/* Input */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Describe your meal</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. 2 scrambled eggs with toast and orange juice"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <AnimatedPressable
          onPress={handleEstimate}
          disabled={loading || !description.trim()}
          style={{
            backgroundColor: COLORS.warning,
            borderRadius: 14,
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 24,
            opacity: !description.trim() ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Sparkles size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Estimate Macros</Text>
            </>
          )}
        </AnimatedPressable>

        {/* Result */}
        {result && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 }}>
              {result.name}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 }}>
              {result.serving_size} {result.serving_unit}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Calories', value: String(Math.round(Number(result.calories))), unit: 'kcal', color: COLORS.primary },
                { label: 'Protein', value: String(Math.round(Number(result.protein))), unit: 'g', color: COLORS.protein },
                { label: 'Carbs', value: String(Math.round(Number(result.carbs))), unit: 'g', color: COLORS.carbs },
                { label: 'Fat', value: String(Math.round(Number(result.fat))), unit: 'g', color: COLORS.fat },
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

            {/* Meal Type */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 10 }}>Add to meal</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map(mt => {
                const isSelected = mealType === mt;
                const label = mt.charAt(0).toUpperCase() + mt.slice(1);
                return (
                  <AnimatedPressable
                    key={mt}
                    onPress={() => setMealType(mt)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#fff' : COLORS.textSecondary }}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <AnimatedPressable
              onPress={handleAddToDiary}
              disabled={adding}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                height: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Plus size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add to {mealTypeLabel}</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}
