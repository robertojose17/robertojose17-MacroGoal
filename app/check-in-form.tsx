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

export default function CheckInFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!weight.trim()) newErrors.weight = 'Weight is required';
    else if (isNaN(Number(weight)) || Number(weight) <= 0) newErrors.weight = 'Enter a valid weight';
    if (bodyFat && (isNaN(Number(bodyFat)) || Number(bodyFat) < 0 || Number(bodyFat) > 100)) {
      newErrors.bodyFat = 'Enter a valid body fat % (0-100)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('[CheckInForm] Save pressed, weight:', weight, 'date:', date);
    if (!validate()) return;
    setSaving(true);
    try {
      await apiPost(`${API_BASE}/api/check-ins`, {
        date,
        weight: Number(weight),
        body_fat: bodyFat ? Number(bodyFat) : undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      console.error('[CheckInForm] Save error:', err);
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Check-in' }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
          </View>

          {/* Weight */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Weight (kg) *</Text>
            <TextInput
              value={weight}
              onChangeText={v => { setWeight(v); setErrors(prev => ({ ...prev, weight: '' })); }}
              placeholder="e.g. 75.5"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: errors.weight ? COLORS.danger : COLORS.border,
              }}
            />
            {errors.weight ? <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{errors.weight}</Text> : null}
          </View>

          {/* Body Fat */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Body Fat % (optional)</Text>
            <TextInput
              value={bodyFat}
              onChangeText={v => { setBodyFat(v); setErrors(prev => ({ ...prev, bodyFat: '' })); }}
              placeholder="e.g. 18.5"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: errors.bodyFat ? COLORS.danger : COLORS.border,
              }}
            />
            {errors.bodyFat ? <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{errors.bodyFat}</Text> : null}
          </View>

          {/* Notes */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling? Any observations..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
            />
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
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Check-in</Text>
            )}
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
