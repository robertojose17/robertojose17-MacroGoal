
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { createMealPlan } from '@/utils/mealPlansApi';

const formatDateForStorage = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function MealPlanCreateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 6);

  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const handleStartDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (date) {
      console.log('[MealPlanCreate] Start date changed:', formatDateForStorage(date));
      setStartDate(date);
      if (date > endDate) {
        const newEnd = new Date(date);
        newEnd.setDate(date.getDate() + 6);
        setEndDate(newEnd);
      }
    }
  };

  const handleEndDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (date) {
      console.log('[MealPlanCreate] End date changed:', formatDateForStorage(date));
      setEndDate(date);
    }
  };

  const handleCreate = async () => {
    console.log('[MealPlanCreate] Create Plan button pressed, name:', planName);
    if (!planName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your meal plan.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Invalid Dates', 'End date must be on or after start date.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: planName.trim(),
        start_date: formatDateForStorage(startDate),
        end_date: formatDateForStorage(endDate),
      };
      console.log('[MealPlanCreate] POST meal-plans body:', body);

      const newPlan = await createMealPlan(body);
      console.log('[MealPlanCreate] Plan created successfully:', newPlan.id);

      router.replace({ pathname: '/meal-plan-detail', params: { planId: newPlan.id } });
    } catch (err: any) {
      console.error('[MealPlanCreate] Error creating plan:', err);
      Alert.alert('Error', 'Failed to create meal plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          console.log('[MealPlanCreate] Back button pressed');
          router.back();
        }}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>New Meal Plan</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Plan Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: secondaryColor }]}>PLAN NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g. Week of Jun 2"
            placeholderTextColor={secondaryColor}
            returnKeyType="done"
            autoFocus
          />
        </View>

        {/* Start Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: secondaryColor }]}>START DATE</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: cardBg, borderColor }]}
            onPress={() => {
              console.log('[MealPlanCreate] Start date picker opened');
              setShowStartPicker(true);
              setShowEndPicker(false);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: textColor }]}>{formatDateDisplay(startDate)}</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={16} color={secondaryColor} />
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleStartDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* End Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: secondaryColor }]}>END DATE</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: cardBg, borderColor }]}
            onPress={() => {
              console.log('[MealPlanCreate] End date picker opened');
              setShowEndPicker(true);
              setShowStartPicker(false);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: textColor }]}>{formatDateDisplay(endDate)}</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={16} color={secondaryColor} />
          </TouchableOpacity>
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={startDate}
            />
          )}
        </View>

        {/* Duration hint */}
        <View style={[styles.hintCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.hintText, { color: secondaryColor }]}>
            {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} day plan
          </Text>
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Plan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitle: { ...typography.h3, flex: 1 },
  headerRight: { width: 40 },
  scrollContent: { padding: spacing.md, paddingBottom: 60 },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dateButtonText: { flex: 1, fontSize: 16 },
  hintCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  hintText: { fontSize: 14, fontWeight: '500' },
  createButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  createButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
