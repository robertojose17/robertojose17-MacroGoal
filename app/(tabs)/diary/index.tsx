import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  LayoutAnimation,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiDelete } from '@/utils/api';
import { FoodLog } from '@/types';
import { Plus, Trash2, Coffee, Sun, Moon, Cookie, ChevronLeft, ChevronRight } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_CONFIG: Record<MealType, { label: string; color: string }> = {
  breakfast: { label: 'Breakfast', color: COLORS.warning },
  lunch: { label: 'Lunch', color: COLORS.accent },
  dinner: { label: 'Dinner', color: COLORS.primary },
  snack: { label: 'Snack', color: COLORS.textSecondary },
};

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function displayDate(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (formatDate(d) === formatDate(today)) return 'Today';
  if (formatDate(d) === formatDate(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (date: Date) => {
    console.log('[Diary] Fetching logs for date:', formatDate(date));
    try {
      const data = await apiGet<{ logs: FoodLog[] }>(`${API_BASE}/api/food-logs?date=${formatDate(date)}`);
      setLogs(data.logs ?? []);
      setError('');
    } catch (err) {
      console.error('[Diary] Fetch error:', err);
      setError('Failed to load diary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLogs(selectedDate);
  }, [selectedDate, fetchLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(selectedDate);
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const handleDelete = (id: string) => {
    console.log('[Diary] Delete log pressed:', id);
    Alert.alert('Remove Food', 'Remove this item from your diary?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLogs(prev => prev.filter(l => l.id !== id));
            await apiDelete(`${API_BASE}/api/food-logs/${id}`);
          } catch (err) {
            console.error('[Diary] Delete error:', err);
            fetchLogs(selectedDate);
          }
        },
      },
    ]);
  };

  const handleAddFood = (meal: MealType) => {
    console.log('[Diary] Add food pressed for meal:', meal);
    router.push({ pathname: '/food-search', params: { meal_type: meal, date: formatDate(selectedDate) } });
  };

  const totalCalories = logs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
  const totalProtein = logs.reduce((s, l) => s + (Number(l.protein) || 0), 0);
  const totalCarbs = logs.reduce((s, l) => s + (Number(l.carbs) || 0), 0);
  const totalFat = logs.reduce((s, l) => s + (Number(l.fat) || 0), 0);

  const dateLabel = displayDate(selectedDate);
  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 4 }}>
          Food Diary
        </Text>
      </View>

      {/* Date Picker */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginHorizontal: 20,
          marginBottom: 16,
          backgroundColor: COLORS.surface,
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <AnimatedPressable onPress={() => changeDate(-1)} style={{ padding: 8 }}>
          <ChevronLeft size={20} color={COLORS.text} />
        </AnimatedPressable>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{dateLabel}</Text>
        <AnimatedPressable onPress={() => changeDate(1)} disabled={isToday} style={{ padding: 8, opacity: isToday ? 0.3 : 1 }}>
          <ChevronRight size={20} color={COLORS.text} />
        </AnimatedPressable>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: COLORS.danger, marginBottom: 12 }}>{error}</Text>
          <AnimatedPressable
            onPress={() => fetchLogs(selectedDate)}
            style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => {
            const mealLogs = logs.filter(l => l.meal_type === meal);
            const cfg = MEAL_CONFIG[meal];
            const mealCals = mealLogs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
            return (
              <View key={meal} style={{ marginHorizontal: 20, marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    overflow: 'hidden',
                  }}
                >
                  {/* Section header */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderBottomWidth: mealLogs.length > 0 ? 1 : 0,
                      borderBottomColor: COLORS.divider,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: cfg.color,
                        }}
                      />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{cfg.label}</Text>
                      {mealCals > 0 && (
                        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{Math.round(mealCals)} kcal</Text>
                      )}
                    </View>
                    <AnimatedPressable
                      onPress={() => handleAddFood(meal)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Plus size={14} color={COLORS.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>Add</Text>
                    </AnimatedPressable>
                  </View>

                  {mealLogs.length === 0 ? (
                    <View style={{ padding: 14 }}>
                      <Text style={{ fontSize: 13, color: COLORS.textTertiary }}>Nothing logged yet</Text>
                    </View>
                  ) : (
                    mealLogs.map((log, idx) => (
                      <View
                        key={log.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 14,
                          borderTopWidth: idx > 0 ? 1 : 0,
                          borderTopColor: COLORS.divider,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                            {log.food_name}
                          </Text>
                          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                            {log.serving_size}{log.serving_unit} · P:{Math.round(log.protein)}g C:{Math.round(log.carbs)}g F:{Math.round(log.fat)}g
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 12 }}>
                          {Math.round(Number(log.calories))} kcal
                        </Text>
                        <AnimatedPressable onPress={() => handleDelete(log.id)}>
                          <Trash2 size={18} color={COLORS.danger} />
                        </AnimatedPressable>
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })}

          {/* Daily Totals */}
          <View
            style={{
              marginHorizontal: 20,
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Daily Totals</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Calories', value: `${Math.round(totalCalories)}`, unit: 'kcal', color: COLORS.primary },
                { label: 'Protein', value: `${Math.round(totalProtein)}`, unit: 'g', color: COLORS.protein },
                { label: 'Carbs', value: `${Math.round(totalCarbs)}`, unit: 'g', color: COLORS.carbs },
                { label: 'Fat', value: `${Math.round(totalFat)}`, unit: 'g', color: COLORS.fat },
              ].map(item => (
                <View key={item.label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: item.color }}>{item.value}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{item.unit}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
