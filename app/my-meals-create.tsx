import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
import { MealItem } from '@/types';
import { Plus, Trash2, Search } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function MyMealsCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const handleSave = async () => {
    console.log('[MyMealsCreate] Save pressed, name:', name, 'items:', items.length);
    if (!name.trim()) {
      setNameError('Meal name is required');
      return;
    }
    setSaving(true);
    try {
      await apiPost(`${API_BASE}/api/my-meals`, {
        name: name.trim(),
        items,
      });
      router.back();
    } catch (err) {
      console.error('[MyMealsCreate] Save error:', err);
      Alert.alert('Error', 'Failed to create meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalCals = items.reduce((s, i) => s + (Number(i.calories) || 0), 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Create Meal' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Meal Name *</Text>
          <TextInput
            value={name}
            onChangeText={v => { setName(v); setNameError(''); }}
            placeholder="e.g. Post-workout meal"
            placeholderTextColor={COLORS.textTertiary}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: nameError ? COLORS.danger : COLORS.border,
            }}
          />
          {nameError ? <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{nameError}</Text> : null}
        </View>

        {/* Items */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>
              Foods {items.length > 0 ? `(${items.length})` : ''}
            </Text>
            {items.length > 0 && (
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{Math.round(totalCals)} kcal total</Text>
            )}
          </View>

          {items.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                  {item.food_name}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {item.serving_size}{item.serving_unit} · {Math.round(Number(item.calories))} kcal
                </Text>
              </View>
              <AnimatedPressable onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                <Trash2 size={18} color={COLORS.danger} />
              </AnimatedPressable>
            </View>
          ))}

          <AnimatedPressable
            onPress={() => {
              console.log('[MyMealsCreate] Add food pressed');
              router.push({ pathname: '/food-search', params: { for_meal: '1' } });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1.5,
              borderColor: COLORS.primary,
              borderStyle: 'dashed',
            }}
          >
            <Plus size={18} color={COLORS.primary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary }}>Add food</Text>
          </AnimatedPressable>
        </View>

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
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create Meal</Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
