import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiPut } from '@/utils/api';
import { Goals } from '@/types';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function EditGoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      console.log('[EditGoals] Fetching current goals');
      try {
        const data = await apiGet<Goals>(`${API_BASE}/api/goals`);
        setCalories(String(data.calories ?? ''));
        setProtein(String(data.protein ?? ''));
        setCarbs(String(data.carbs ?? ''));
        setFat(String(data.fat ?? ''));
      } catch (err) {
        console.error('[EditGoals] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    console.log('[EditGoals] Save pressed');
    if (!calories || !protein || !carbs || !fat) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    setSaving(true);
    try {
      await apiPut(`${API_BASE}/api/goals`, {
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
      });
      router.back();
    } catch (err) {
      console.error('[EditGoals] Save error:', err);
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Daily Calories', value: calories, setter: setCalories, unit: 'kcal', color: COLORS.primary },
    { label: 'Protein', value: protein, setter: setProtein, unit: 'g', color: COLORS.protein },
    { label: 'Carbohydrates', value: carbs, setter: setCarbs, unit: 'g', color: COLORS.carbs },
    { label: 'Fat', value: fat, setter: setFat, unit: 'g', color: COLORS.fat },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Goals' }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior="padding">
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 }}>
              Set your daily macro targets. These will be used to calculate your progress on the home screen.
            </Text>

            {fields.map(field => (
              <View key={field.label} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
                  {field.label}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TextInput
                    value={field.value}
                    onChangeText={field.setter}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 18,
                      fontWeight: '700',
                      color: field.color,
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
                      paddingVertical: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      minWidth: 60,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textSecondary }}>{field.unit}</Text>
                  </View>
                </View>
              </View>
            ))}

            <AnimatedPressable
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 16,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Goals</Text>
              )}
            </AnimatedPressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </>
  );
}
