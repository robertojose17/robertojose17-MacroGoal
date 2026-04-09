import React, { useState } from 'react';
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
import { apiPost } from '@/utils/api';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

interface FormField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}

const FIELDS: FormField[] = [
  { key: 'name', label: 'Name *', placeholder: 'e.g. Chicken Breast', required: true },
  { key: 'brand', label: 'Brand', placeholder: 'e.g. Generic' },
  { key: 'calories', label: 'Calories (kcal) *', placeholder: '0', required: true, keyboardType: 'numeric' },
  { key: 'protein', label: 'Protein (g) *', placeholder: '0', required: true, keyboardType: 'decimal-pad' },
  { key: 'carbs', label: 'Carbs (g) *', placeholder: '0', required: true, keyboardType: 'decimal-pad' },
  { key: 'fat', label: 'Fat (g) *', placeholder: '0', required: true, keyboardType: 'decimal-pad' },
  { key: 'serving_size', label: 'Serving Size *', placeholder: '100', required: true, keyboardType: 'decimal-pad' },
  { key: 'serving_unit', label: 'Serving Unit *', placeholder: 'g', required: true },
  { key: 'barcode', label: 'Barcode', placeholder: 'Optional' },
];

export default function MyFoodsCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Record<string, string>>({
    name: '', brand: '', calories: '', protein: '', carbs: '', fat: '',
    serving_size: '100', serving_unit: 'g', barcode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    FIELDS.filter(f => f.required).forEach(f => {
      if (!form[f.key]?.trim()) newErrors[f.key] = `${f.label.replace(' *', '')} is required`;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('[MyFoodsCreate] Save pressed');
    if (!validate()) return;
    setSaving(true);
    try {
      await apiPost(`${API_BASE}/api/my-foods`, {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
        serving_size: Number(form.serving_size),
        serving_unit: form.serving_unit.trim(),
        barcode: form.barcode.trim() || undefined,
      });
      router.back();
    } catch (err) {
      console.error('[MyFoodsCreate] Save error:', err);
      Alert.alert('Error', 'Failed to create food. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Food' }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {FIELDS.map(field => (
            <View key={field.key} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
                {field.label}
              </Text>
              <TextInput
                value={form[field.key]}
                onChangeText={v => {
                  setForm(prev => ({ ...prev, [field.key]: v }));
                  if (errors[field.key]) setErrors(prev => ({ ...prev, [field.key]: '' }));
                }}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textTertiary}
                keyboardType={field.keyboardType ?? 'default'}
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: COLORS.text,
                  borderWidth: 1,
                  borderColor: errors[field.key] ? COLORS.danger : COLORS.border,
                }}
              />
              {errors[field.key] ? (
                <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{errors[field.key]}</Text>
              ) : null}
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
              marginTop: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create Food</Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
