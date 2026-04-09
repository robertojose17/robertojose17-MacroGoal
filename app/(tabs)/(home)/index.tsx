import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MacroRing } from '@/components/MacroRing';
import { MacroBar } from '@/components/MacroBar';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiDelete } from '@/utils/api';
import { Goals, FoodLog } from '@/types';
import {
  UtensilsCrossed,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ChefHat,
  Bot,
  BookOpen,
  Trash2,
  Plus,
} from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_CONFIG: Record<MealType, { label: string; icon: React.ReactNode; color: string }> = {
  breakfast: { label: 'Breakfast', icon: <Coffee size={18} color={COLORS.warning} />, color: COLORS.warning },
  lunch: { label: 'Lunch', icon: <Sun size={18} color={COLORS.accent} />, color: COLORS.accent },
  dinner: { label: 'Dinner', icon: <Moon size={18} color={COLORS.primary} />, color: COLORS.primary },
  snack: { label: 'Snack', icon: <Cookie size={18} color={COLORS.textSecondary} />, color: COLORS.textSecondary },
};

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function greetingText(name?: string) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name.split(' ')[0]}!` : `${greeting}!`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<Goals | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    console.log('[Home] Fetching goals and food logs');
    try {
      const [goalsData, logsData] = await Promise.all([
        apiGet<Goals>(`${API_BASE}/api/goals`),
        apiGet<{ logs: FoodLog[] }>(`${API_BASE}/api/food-logs?date=${todayDate()}`),
      ]);
      setGoals(goalsData);
      setLogs(logsData.logs ?? []);
      setError('');
    } catch (err) {
      console.error('[Home] Fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDeleteLog = async (id: string) => {
    console.log('[Home] Delete log pressed:', id);
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
            console.error('[Home] Delete error:', err);
            fetchData();
          }
        },
      },
    ]);
  };

  const handleQuickAdd = (mealType: MealType) => {
    console.log('[Home] Quick add pressed for meal type:', mealType);
    router.push({ pathname: '/food-search', params: { meal_type: mealType } });
  };

  // Computed totals
  const totalCalories = logs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
  const totalProtein = logs.reduce((s, l) => s + (Number(l.protein) || 0), 0);
  const totalCarbs = logs.reduce((s, l) => s + (Number(l.carbs) || 0), 0);
  const totalFat = logs.reduce((s, l) => s + (Number(l.fat) || 0), 0);

  const logsByMeal = (meal: MealType) => logs.filter(l => l.meal_type === meal);

  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greetingDisplay = greetingText(user?.name);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 }}>
          {greetingDisplay}
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>{dateDisplay}</Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 16, color: COLORS.danger, marginBottom: 12 }}>{error}</Text>
          <AnimatedPressable
            onPress={fetchData}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          {/* Macro Ring Card */}
          <View
            style={{
              marginHorizontal: 20,
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text }}>Today's Nutrition</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                {Math.round(totalCalories)} / {goals?.calories ?? 0} kcal
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <MacroRing
                calories={totalCalories}
                calorieGoal={goals?.calories ?? 2000}
                size={150}
              />
            </View>
            <MacroBar
              label="Protein"
              value={totalProtein}
              goal={goals?.protein ?? 150}
              color={COLORS.protein}
            />
            <MacroBar
              label="Carbs"
              value={totalCarbs}
              goal={goals?.carbs ?? 200}
              color={COLORS.carbs}
            />
            <MacroBar
              label="Fat"
              value={totalFat}
              goal={goals?.fat ?? 65}
              color={COLORS.fat}
            />
          </View>

          {/* Quick Add Row */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Quick Add</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => {
                const cfg = MEAL_CONFIG[meal];
                return (
                  <AnimatedPressable
                    key={meal}
                    onPress={() => handleQuickAdd(meal)}
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.surface,
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    {cfg.icon}
                    <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary }}>
                      {cfg.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Meals Summary */}
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => {
            const mealLogs = logsByMeal(meal);
            const cfg = MEAL_CONFIG[meal];
            const mealCals = mealLogs.reduce((s, l) => s + (Number(l.calories) || 0), 0);
            return (
              <View key={meal} style={{ marginHorizontal: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {cfg.icon}
                    <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{cfg.label}</Text>
                    {mealCals > 0 && (
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{Math.round(mealCals)} kcal</Text>
                    )}
                  </View>
                  <AnimatedPressable
                    onPress={() => handleQuickAdd(meal)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={16} color={COLORS.primary} />
                  </AnimatedPressable>
                </View>
                {mealLogs.length === 0 ? (
                  <Text style={{ fontSize: 13, color: COLORS.textTertiary, paddingLeft: 4, paddingBottom: 4 }}>
                    Nothing logged yet
                  </Text>
                ) : (
                  mealLogs.map(log => (
                    <View
                      key={log.id}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: COLORS.border,
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
                      <AnimatedPressable onPress={() => handleDeleteLog(log.id)}>
                        <Trash2 size={18} color={COLORS.danger} />
                      </AnimatedPressable>
                    </View>
                  ))
                )}
              </View>
            );
          })}

          {/* Bottom Actions */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>Tools</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'My Foods', icon: <UtensilsCrossed size={20} color={COLORS.primary} />, route: '/my-foods' },
                { label: 'My Meals', icon: <ChefHat size={20} color={COLORS.accent} />, route: '/my-meals' },
                { label: 'AI Estimate', icon: <Bot size={20} color={COLORS.warning} />, route: '/ai-meal-estimator' },
                { label: 'Chatbot', icon: <BookOpen size={20} color={COLORS.textSecondary} />, route: '/chatbot' },
              ].map(item => (
                <AnimatedPressable
                  key={item.label}
                  onPress={() => {
                    console.log('[Home] Tool pressed:', item.label);
                    router.push(item.route as never);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  {item.icon}
                  <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' }}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
