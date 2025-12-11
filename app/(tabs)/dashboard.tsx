
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import MacroBar from '@/components/MacroBar';
import ProgressCircle from '@/components/ProgressCircle';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';
import ProgressCard from '@/components/ProgressCard';
import ConsistencyScore from '@/components/ConsistencyScore';
import PhotoProgressCard from '@/components/PhotoProgressCard';
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = 'today' | '7days' | '30days' | 'custom';

interface CheckIn {
  id: string;
  date: string;
  weight: number | null;
  steps: number | null;
  steps_goal: number | null;
  went_to_gym: boolean;
}

interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_fiber: number;
}

interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  
  const [nutritionRange, setNutritionRange] = useState<TimeRange>('today');
  
  const [nutritionCustomRange, setNutritionCustomRange] = useState<CustomDateRange | null>(null);
  
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  const [nutritionStats, setNutritionStats] = useState<any>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('[Dashboard] No user found');
        setLoading(false);
        return;
      }

      setUser(authUser);

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userData) {
        setUser({ ...authUser, ...userData });
      }

      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalData) {
        setGoal(goalData);
      } else {
        setGoal({
          daily_calories: 2000,
          protein_g: 150,
          carbs_g: 200,
          fats_g: 65,
          fiber_g: 30,
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (checkInsData && checkInsData.length > 0) {
        setTodayCheckIn(checkInsData[0]);
      } else {
        setTodayCheckIn(null);
      }

      await loadTodaySummary(authUser.id, today);
      await loadNutritionTrends(authUser.id);

    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      console.log('[Dashboard] Nutrition range changed, reloading trends');
      loadNutritionTrends(user.id);
    }
  }, [nutritionRange, nutritionCustomRange]);

  const loadTodaySummary = async (userId: string, date: string) => {
    try {
      const { data: mealsData } = await supabase
        .from('meals')
        .select(`
          meal_items (
            calories,
            protein,
            carbs,
            fats,
            fiber
          )
        `)
        .eq('user_id', userId)
        .eq('date', date);

      let totalCals = 0;
      let totalP = 0;
      let totalC = 0;
      let totalF = 0;
      let totalFib = 0;

      if (mealsData && mealsData.length > 0) {
        mealsData.forEach((meal: any) => {
          if (meal.meal_items) {
            meal.meal_items.forEach((item: any) => {
              totalCals += item.calories || 0;
              totalP += item.protein || 0;
              totalC += item.carbs || 0;
              totalF += item.fats || 0;
              totalFib += item.fiber || 0;
            });
          }
        });
      }

      setTodaySummary({
        date,
        total_calories: totalCals,
        total_protein: totalP,
        total_carbs: totalC,
        total_fats: totalF,
        total_fiber: totalFib,
      });
    } catch (error) {
      console.error('[Dashboard] Error loading today summary:', error);
    }
  };

  const loadNutritionTrends = async (userId: string) => {
    try {
      let startDate: Date;
      let endDate: Date;
      
      if (nutritionRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else if (nutritionRange === '7days') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (nutritionRange === '30days') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      } else if (nutritionRange === 'custom' && nutritionCustomRange) {
        startDate = new Date(nutritionCustomRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(nutritionCustomRange.endDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('[Dashboard] Loading nutrition trends from', startDateStr, 'to', endDateStr);
      console.log('[Dashboard] Start date object:', startDate.toISOString());
      console.log('[Dashboard] End date object:', endDate.toISOString());

      const { data: mealsData } = await supabase
        .from('meals')
        .select(`
          date,
          meal_items (
            calories,
            protein,
            carbs,
            fats,
            fiber
          )
        `)
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      console.log('[Dashboard] Meals data returned:', mealsData?.length || 0, 'meals');

      const daysWithData = new Set<string>();
      let totalCals = 0;
      let totalP = 0;
      let totalC = 0;
      let totalF = 0;
      let totalFib = 0;

      if (mealsData && mealsData.length > 0) {
        mealsData.forEach((meal: any) => {
          daysWithData.add(meal.date);
          if (meal.meal_items) {
            meal.meal_items.forEach((item: any) => {
              totalCals += item.calories || 0;
              totalP += item.protein || 0;
              totalC += item.carbs || 0;
              totalF += item.fats || 0;
              totalFib += item.fiber || 0;
            });
          }
        });
      }

      const daysCount = daysWithData.size;
      const avgCals = daysCount > 0 ? totalCals / daysCount : 0;
      const avgP = daysCount > 0 ? totalP / daysCount : 0;
      const avgC = daysCount > 0 ? totalC / daysCount : 0;
      const avgF = daysCount > 0 ? totalF / daysCount : 0;
      const avgFib = daysCount > 0 ? totalFib / daysCount : 0;

      const streak = calculateStreak(Array.from(daysWithData).sort());

      console.log('[Dashboard] Nutrition stats:', { daysCount, avgCals, streak, uniqueDays: Array.from(daysWithData) });

      setNutritionStats({
        streak,
        avgCalories: avgCals,
        avgProtein: avgP,
        avgCarbs: avgC,
        avgFats: avgF,
        avgFiber: avgFib,
      });
    } catch (error) {
      console.error('[Dashboard] Error loading nutrition trends:', error);
    }
  };

  const calculateStreak = (sortedDates: string[]): number => {
    if (sortedDates.length === 0) return 0;

    let currentStreak = 1;
    const today = new Date().toISOString().split('T')[0];
    
    const lastDate = sortedDates[sortedDates.length - 1];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate !== today && lastDate !== yesterdayStr) {
      return 0;
    }

    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i + 1]);
      const prevDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[Dashboard] Screen focused, loading data');
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleQuickCheckIn = (type: 'weight' | 'steps' | 'gym') => {
    setShowCheckInModal(false);
    router.push({
      pathname: '/check-in-form',
      params: { type },
    });
  };

  const handleCustomRangeSelect = () => {
    console.log('[Dashboard] Opening calendar date range picker for nutrition');
    setShowCalendarPicker(true);
  };

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    console.log('[Dashboard] Date range selected:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const customRange: CustomDateRange = { 
      startDate, 
      endDate 
    };
    
    setNutritionCustomRange(customRange);
    setNutritionRange('custom');
  };

  const handleCalendarClose = () => {
    console.log('[Dashboard] Calendar picker closed');
    setShowCalendarPicker(false);
    
    if (nutritionRange === 'custom' && !nutritionCustomRange) {
      setNutritionRange('today');
    }
  };

  const getCustomRangeLabel = (range: CustomDateRange | null) => {
    if (!range) return 'Custom';
    const start = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = range.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  // Helper function to get the average text based on selected range
  const getAverageText = () => {
    if (nutritionRange === 'today') {
      return null; // No text for Today
    } else if (nutritionRange === '7days') {
      return 'Average for last 7 days';
    } else if (nutritionRange === '30days') {
      return 'Average for last 30 days';
    } else if (nutritionRange === 'custom' && nutritionCustomRange) {
      // Calculate number of days in custom range
      const start = new Date(nutritionCustomRange.startDate);
      const end = new Date(nutritionCustomRange.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      return `Average for last ${diffDays} days`;
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const caloriesGoal = goal?.daily_calories || 2000;
  const proteinGoal = goal?.protein_g || 150;
  const carbsGoal = goal?.carbs_g || 200;
  const fatsGoal = goal?.fats_g || 65;
  const fiberGoal = goal?.fiber_g || 30;

  // Calculate nutrition trend values for display (matching Foods tab style)
  const nutritionCaloriesEaten = nutritionStats?.avgCalories || 0;
  const nutritionCaloriesRemaining = caloriesGoal - nutritionCaloriesEaten;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Dashboard
          </Text>
        </View>

        {/* Consistency Score - NEW COMPONENT AT THE TOP */}
        {user && <ConsistencyScore userId={user.id} isDark={isDark} />}

        {/* Nutrition Trends Card - RESTYLED TO MATCH FOODS TAB MOBILE LAYOUT */}
        <View style={[
          styles.card, 
          { 
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          }
        ]}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Nutrition Trends
          </Text>

          {/* Tab Selector - Matching Foods tab style */}
          <View style={styles.rangeSelector}>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                nutritionRange === 'today' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setNutritionRange('today')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: nutritionRange === 'today' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                nutritionRange === '7days' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setNutritionRange('7days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: nutritionRange === '7days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                Last 7 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                nutritionRange === '30days' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setNutritionRange('30days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: nutritionRange === '30days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                Last 30 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                nutritionRange === 'custom' && { backgroundColor: colors.primary },
              ]}
              onPress={handleCustomRangeSelect}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: nutritionRange === 'custom' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                {nutritionRange === 'custom' ? getCustomRangeLabel(nutritionCustomRange) : 'Custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {nutritionStats ? (
            <React.Fragment>
              {/* Streak Display */}
              {nutritionStats.streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={[styles.streakText, { color: isDark ? colors.textDark : colors.text }]}>
                    🔥 {nutritionStats.streak}-day streak
                  </Text>
                </View>
              )}

              {/* Main Content: Circular Ring + Macro Bars (Food Tab Style) */}
              <View style={styles.nutritionContent}>
                {/* Left: Circular Calories Ring */}
                <View style={styles.caloriesRingContainer}>
                  <ProgressCircle
                    current={nutritionCaloriesEaten}
                    target={caloriesGoal}
                    size={140}
                    strokeWidth={12}
                    color={nutritionCaloriesRemaining >= 0 ? colors.success : colors.error}
                    label="kcal"
                  />
                </View>

                {/* Right: Macro Bars */}
                <View style={styles.macrosContainer}>
                  {/* Protein Bar */}
                  <View style={styles.macroBarWrapper}>
                    <View style={styles.macroBarHeader}>
                      <Text style={[styles.macroBarLabel, { color: isDark ? colors.textDark : colors.text }]}>
                        Protein
                      </Text>
                      <Text style={[styles.macroBarValues, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round(nutritionStats.avgProtein)} / {proteinGoal}g
                      </Text>
                    </View>
                    <View style={[styles.macroBarBackground, { backgroundColor: isDark ? colors.borderDark : colors.border }]}>
                      <View
                        style={[
                          styles.macroBarFill,
                          {
                            width: `${Math.min((nutritionStats.avgProtein / proteinGoal) * 100, 100)}%`,
                            backgroundColor: colors.protein,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Carbs Bar */}
                  <View style={styles.macroBarWrapper}>
                    <View style={styles.macroBarHeader}>
                      <Text style={[styles.macroBarLabel, { color: isDark ? colors.textDark : colors.text }]}>
                        Carbs
                      </Text>
                      <Text style={[styles.macroBarValues, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round(nutritionStats.avgCarbs)} / {carbsGoal}g
                      </Text>
                    </View>
                    <View style={[styles.macroBarBackground, { backgroundColor: isDark ? colors.borderDark : colors.border }]}>
                      <View
                        style={[
                          styles.macroBarFill,
                          {
                            width: `${Math.min((nutritionStats.avgCarbs / carbsGoal) * 100, 100)}%`,
                            backgroundColor: colors.carbs,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Fats Bar */}
                  <View style={styles.macroBarWrapper}>
                    <View style={styles.macroBarHeader}>
                      <Text style={[styles.macroBarLabel, { color: isDark ? colors.textDark : colors.text }]}>
                        Fats
                      </Text>
                      <Text style={[styles.macroBarValues, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round(nutritionStats.avgFats)} / {fatsGoal}g
                      </Text>
                    </View>
                    <View style={[styles.macroBarBackground, { backgroundColor: isDark ? colors.borderDark : colors.border }]}>
                      <View
                        style={[
                          styles.macroBarFill,
                          {
                            width: `${Math.min((nutritionStats.avgFats / fatsGoal) * 100, 100)}%`,
                            backgroundColor: colors.fats,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Fiber Bar */}
                  <View style={styles.macroBarWrapper}>
                    <View style={styles.macroBarHeader}>
                      <Text style={[styles.macroBarLabel, { color: isDark ? colors.textDark : colors.text }]}>
                        Fiber
                      </Text>
                      <Text style={[styles.macroBarValues, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {Math.round(nutritionStats.avgFiber)} / {fiberGoal}g
                      </Text>
                    </View>
                    <View style={[styles.macroBarBackground, { backgroundColor: isDark ? colors.borderDark : colors.border }]}>
                      <View
                        style={[
                          styles.macroBarFill,
                          {
                            width: `${Math.min((nutritionStats.avgFiber / fiberGoal) * 100, 100)}%`,
                            backgroundColor: colors.fiber,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Average Text - Replaces "kcal remaining" */}
              {getAverageText() && (
                <View style={styles.averageTextContainer}>
                  <Text style={[styles.averageText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    {getAverageText()}
                  </Text>
                </View>
              )}
            </React.Fragment>
          ) : (
            <Text style={[styles.noDataText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              No nutrition data available for this period.
            </Text>
          )}
        </View>

        {/* Progress Card */}
        {user && <ProgressCard userId={user.id} isDark={isDark} />}

        {/* Photo Progress Card */}
        {user && <PhotoProgressCard userId={user.id} isDark={isDark} />}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={showCheckInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCheckInModal(false)}
        >
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: isDark ? colors.cardDark : colors.card,
              borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
            }
          ]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Quick Check-In
            </Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickCheckIn('weight')}
            >
              <IconSymbol
                ios_icon_name="scalemass"
                android_material_icon_name="monitor_weight"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.modalOptionText, { color: isDark ? colors.textDark : colors.text }]}>
                Log Weight
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickCheckIn('steps')}
            >
              <IconSymbol
                ios_icon_name="figure.walk"
                android_material_icon_name="directions_walk"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.modalOptionText, { color: isDark ? colors.textDark : colors.text }]}>
                Log Steps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleQuickCheckIn('gym')}
            >
              <IconSymbol
                ios_icon_name="dumbbell.fill"
                android_material_icon_name="fitness_center"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.modalOptionText, { color: isDark ? colors.textDark : colors.text }]}>
                Log Gym Session
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
              onPress={() => setShowCheckInModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: isDark ? colors.textDark : colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CalendarDateRangePicker
        visible={showCalendarPicker}
        onClose={handleCalendarClose}
        onSelectRange={handleDateRangeSelect}
        initialStartDate={nutritionCustomRange?.startDate || (() => {
          const date = new Date();
          date.setDate(date.getDate() - 7);
          return date;
        })()}
        initialEndDate={nutritionCustomRange?.endDate || new Date()}
        maxDate={new Date()}
        title="Select Date Range"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
  },
  rangeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  streakBadge: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  streakText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  nutritionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  caloriesRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  macrosContainer: {
    flex: 1,
    gap: spacing.md,
  },
  macroBarWrapper: {
    marginBottom: spacing.xs,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroBarLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroBarValues: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarBackground: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  averageTextContainer: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  averageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noDataText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  modalTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  modalOptionText: {
    ...typography.bodyBold,
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalCancelText: {
    ...typography.bodyBold,
  },
});
