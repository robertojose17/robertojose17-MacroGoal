
import React, { useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = '7days' | '30days' | 'custom';

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
  
  // Separate time ranges for nutrition and progress
  const [nutritionRange, setNutritionRange] = useState<TimeRange>('7days');
  const [progressRange, setProgressRange] = useState<TimeRange>('7days');
  
  // Custom date ranges
  const [nutritionCustomRange, setNutritionCustomRange] = useState<CustomDateRange | null>(null);
  const [progressCustomRange, setProgressCustomRange] = useState<CustomDateRange | null>(null);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'nutrition' | 'progress'>('nutrition');
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  
  const [nutritionStats, setNutritionStats] = useState<any>(null);
  const [weightData, setWeightData] = useState<any[]>([]);
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

      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userData) {
        setUser({ ...authUser, ...userData });
      }

      // Load active goal
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

      // Load today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('date', today)
        .order('created_at', { ascending: false });

      // Get the latest check-in for today
      if (checkInsData && checkInsData.length > 0) {
        setTodayCheckIn(checkInsData[0]);
      } else {
        setTodayCheckIn(null);
      }

      // Load today's food diary summary
      await loadTodaySummary(authUser.id, today);

      // Load nutrition trends based on selected range
      await loadNutritionTrends(authUser.id);

      // Load weight progress data
      await loadWeightProgress(authUser.id);

    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [nutritionRange, nutritionCustomRange, progressRange, progressCustomRange]);

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
      const endDate = new Date();
      const startDate = new Date();
      
      if (nutritionRange === '7days') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (nutritionRange === '30days') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (nutritionRange === 'custom' && nutritionCustomRange) {
        startDate.setTime(nutritionCustomRange.startDate.getTime());
        endDate.setTime(nutritionCustomRange.endDate.getTime());
      }

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
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Calculate stats
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

      // Calculate streak
      const streak = calculateStreak(Array.from(daysWithData).sort());

      // Calculate days in year
      const currentYear = new Date().getFullYear();
      const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
      const daysInYear = isLeapYear ? 366 : 365;

      setNutritionStats({
        daysTracked: daysCount,
        daysInYear,
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
    
    // Check if today or yesterday is in the list
    const lastDate = sortedDates[sortedDates.length - 1];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate !== today && lastDate !== yesterdayStr) {
      return 0; // Streak broken
    }

    // Count consecutive days backwards
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

  const loadWeightProgress = async (userId: string) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (progressRange === '7days') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (progressRange === '30days') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (progressRange === 'custom' && progressCustomRange) {
        startDate.setTime(progressCustomRange.startDate.getTime());
        endDate.setTime(progressCustomRange.endDate.getTime());
      }

      // Load weight check-ins
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Load meals data for calorie calculations
      const { data: mealsData } = await supabase
        .from('meals')
        .select(`
          date,
          meal_items (
            calories
          )
        `)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Calculate daily calories
      const dailyCalories: Record<string, number> = {};
      if (mealsData && mealsData.length > 0) {
        mealsData.forEach((meal: any) => {
          if (!dailyCalories[meal.date]) {
            dailyCalories[meal.date] = 0;
          }
          if (meal.meal_items) {
            meal.meal_items.forEach((item: any) => {
              dailyCalories[meal.date] += item.calories || 0;
            });
          }
        });
      }

      // Calculate estimated weight
      const weightDataPoints: any[] = [];
      if (checkInsData && checkInsData.length > 0) {
        const startingWeight = checkInsData[0].weight;
        const units = user?.preferred_units || 'metric';
        const calsPerUnit = units === 'imperial' ? 3500 : 7700; // kcal per lb or kg

        let cumulativeDeficit = 0;
        const allDates = Object.keys(dailyCalories).sort();

        allDates.forEach((date) => {
          const dailyGoal = goal?.daily_calories || 2000;
          const dailyEaten = dailyCalories[date] || 0;
          const deficit = dailyGoal - dailyEaten;
          cumulativeDeficit += deficit;

          const estimatedWeightChange = cumulativeDeficit / calsPerUnit;
          const estimatedWeight = startingWeight - estimatedWeightChange;

          // Find actual weight for this date
          const actualCheckIn = checkInsData.find((ci: any) => ci.date === date);

          weightDataPoints.push({
            date,
            actualWeight: actualCheckIn?.weight || null,
            estimatedWeight,
          });
        });
      }

      setWeightData(weightDataPoints);
    } catch (error) {
      console.error('[Dashboard] Error loading weight progress:', error);
    }
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

  const formatWeight = (weight: number | null) => {
    if (!weight) return 'N/A';
    const units = user?.preferred_units || 'metric';
    if (units === 'imperial') {
      const lbs = Math.round(weight * 2.20462);
      return `${lbs} lbs`;
    }
    return `${Math.round(weight)} kg`;
  };

  // Handle custom date range selection
  const handleCustomRangeSelect = (mode: 'nutrition' | 'progress') => {
    setDatePickerMode(mode);
    setDatePickerType('start');
    setTempStartDate(new Date());
    setTempEndDate(new Date());
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      // User cancelled - revert to previous selection
      if (datePickerMode === 'nutrition') {
        if (nutritionRange === 'custom' && !nutritionCustomRange) {
          setNutritionRange('7days');
        }
      } else {
        if (progressRange === 'custom' && !progressCustomRange) {
          setProgressRange('7days');
        }
      }
      return;
    }

    if (selectedDate) {
      if (datePickerType === 'start') {
        setTempStartDate(selectedDate);
        // Move to end date picker
        setDatePickerType('end');
        if (Platform.OS === 'ios') {
          // On iOS, we'll show both pickers in the modal
        } else {
          // On Android, show the next picker
          setTimeout(() => setShowDatePicker(true), 100);
        }
      } else {
        setTempEndDate(selectedDate);
        
        // Validate date range
        if (selectedDate < tempStartDate) {
          Alert.alert('Invalid Range', 'End date must be after start date');
          return;
        }

        // Apply the custom range
        const customRange = { startDate: tempStartDate, endDate: selectedDate };
        
        if (datePickerMode === 'nutrition') {
          setNutritionCustomRange(customRange);
          setNutritionRange('custom');
        } else {
          setProgressCustomRange(customRange);
          setProgressRange('custom');
        }

        if (Platform.OS === 'android') {
          setShowDatePicker(false);
        }
      }
    }
  };

  const getCustomRangeLabel = (range: CustomDateRange | null) => {
    if (!range) return 'Custom';
    const start = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = range.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
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
  const caloriesEaten = todaySummary?.total_calories || 0;
  const caloriesRemaining = caloriesGoal - caloriesEaten;
  const caloriesProgress = Math.min((caloriesEaten / caloriesGoal) * 100, 100);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Dashboard
          </Text>
        </View>

        {/* Daily Summary Card */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Daily Summary
            </Text>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={() => setShowCheckInModal(true)}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Calories */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Goal
              </Text>
              <Text style={[styles.summaryValue, { color: isDark ? colors.textDark : colors.text }]}>
                {caloriesGoal}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Eaten
              </Text>
              <Text style={[styles.summaryValue, { color: colors.calories }]}>
                {Math.round(caloriesEaten)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Remaining
              </Text>
              <Text style={[styles.summaryValue, { color: caloriesRemaining >= 0 ? colors.success : colors.error }]}>
                {Math.round(caloriesRemaining)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${caloriesProgress}%`,
                  backgroundColor: caloriesRemaining >= 0 ? colors.success : colors.error
                }
              ]} 
            />
          </View>

          {/* Macros - Updated to match Home screen layout */}
          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.protein }]}>
                {Math.round(todaySummary?.total_protein || 0)} / {goal?.protein_g || 150}g
              </Text>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Protein
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.carbs }]}>
                {Math.round(todaySummary?.total_carbs || 0)} / {goal?.carbs_g || 200}g
              </Text>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Carbs
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.fats }]}>
                {Math.round(todaySummary?.total_fats || 0)} / {goal?.fats_g || 65}g
              </Text>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Fats
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: colors.fiber }]}>
                {Math.round(todaySummary?.total_fiber || 0)} / {goal?.fiber_g || 30}g
              </Text>
              <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Fiber
              </Text>
            </View>
          </View>

          {/* Workout & Steps */}
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <IconSymbol
                ios_icon_name={todayCheckIn?.went_to_gym ? 'checkmark.circle.fill' : 'xmark.circle'}
                android_material_icon_name={todayCheckIn?.went_to_gym ? 'check_circle' : 'cancel'}
                size={24}
                color={todayCheckIn?.went_to_gym ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.activityText, { color: isDark ? colors.textDark : colors.text }]}>
                Workout: {todayCheckIn?.went_to_gym ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.activityItem}>
              <IconSymbol
                ios_icon_name="figure.walk"
                android_material_icon_name="directions_walk"
                size={24}
                color={colors.info}
              />
              <Text style={[styles.activityText, { color: isDark ? colors.textDark : colors.text }]}>
                Steps: {todayCheckIn?.steps?.toLocaleString() || 0} / {todayCheckIn?.steps_goal?.toLocaleString() || 10000}
              </Text>
            </View>
          </View>
        </View>

        {/* Nutrition Trends */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Nutrition Trends
          </Text>

          {/* Time Range Selector */}
          <View style={styles.rangeSelector}>
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
              onPress={() => handleCustomRangeSelect('nutrition')}
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
              {/* Days Tracked */}
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Days with logged food:
                </Text>
                <Text style={[styles.statValue, { color: isDark ? colors.textDark : colors.text }]}>
                  Tracked: {nutritionStats.daysTracked} / {nutritionStats.daysInYear} days, {nutritionStats.streak}-day streak
                </Text>
              </View>

              {/* Average Macros */}
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Average macros per day:
                </Text>
                <View style={styles.macrosRow}>
                  <Text style={[styles.macroStat, { color: colors.protein }]}>
                    Protein: {Math.round(nutritionStats.avgProtein)}g
                  </Text>
                  <Text style={[styles.macroStat, { color: colors.carbs }]}>
                    Carbs: {Math.round(nutritionStats.avgCarbs)}g
                  </Text>
                  <Text style={[styles.macroStat, { color: colors.fats }]}>
                    Fats: {Math.round(nutritionStats.avgFats)}g
                  </Text>
                  <Text style={[styles.macroStat, { color: colors.fiber }]}>
                    Fiber: {Math.round(nutritionStats.avgFiber)}g
                  </Text>
                </View>
              </View>

              {/* Average Calories */}
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Average daily calories:
                </Text>
                <Text style={[styles.statValue, { color: colors.calories }]}>
                  {Math.round(nutritionStats.avgCalories)} kcal
                </Text>
              </View>
            </React.Fragment>
          ) : (
            <Text style={[styles.noDataText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              No nutrition data available for this period.
            </Text>
          )}
        </View>

        {/* Progress (Weight vs Estimated) */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Progress
          </Text>

          {/* Time Range Selector */}
          <View style={styles.rangeSelector}>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                progressRange === '7days' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setProgressRange('7days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: progressRange === '7days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                Last 7 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                progressRange === '30days' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setProgressRange('30days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: progressRange === '30days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                Last 30 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                progressRange === 'custom' && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleCustomRangeSelect('progress')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  { color: progressRange === 'custom' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
                ]}
              >
                {progressRange === 'custom' ? getCustomRangeLabel(progressCustomRange) : 'Custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {weightData.length > 0 ? (
            <View style={styles.chartContainer}>
              {/* Simple text-based chart representation */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
                    Actual Weight
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                  <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
                    Estimated Weight
                  </Text>
                </View>
              </View>

              {/* Data points */}
              <View style={styles.dataPointsContainer}>
                {weightData.slice(-5).map((point, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.dataPoint}>
                      <Text style={[styles.dataPointDate, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={styles.dataPointValues}>
                        {point.actualWeight && (
                          <Text style={[styles.dataPointValue, { color: colors.primary }]}>
                            Actual: {formatWeight(point.actualWeight)}
                          </Text>
                        )}
                        <Text style={[styles.dataPointValue, { color: colors.info }]}>
                          Est: {formatWeight(point.estimatedWeight)}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="show_chart"
                size={48}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
              <Text style={[styles.noDataText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Not enough data yet
              </Text>
              <Text style={[styles.noDataSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Log your weight and meals to see progress charts
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Quick Check-In Modal */}
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
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

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDatePicker(false);
            // Revert to previous selection if cancelled
            if (datePickerMode === 'nutrition') {
              if (nutritionRange === 'custom' && !nutritionCustomRange) {
                setNutritionRange('7days');
              }
            } else {
              if (progressRange === 'custom' && !progressCustomRange) {
                setProgressRange('7days');
              }
            }
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowDatePicker(false);
              // Revert to previous selection if cancelled
              if (datePickerMode === 'nutrition') {
                if (nutritionRange === 'custom' && !nutritionCustomRange) {
                  setNutritionRange('7days');
                }
              } else {
                if (progressRange === 'custom' && !progressCustomRange) {
                  setProgressRange('7days');
                }
              }
            }}
          >
            <View style={[styles.datePickerContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Select {datePickerType === 'start' ? 'Start' : 'End'} Date
              </Text>
              
              <DateTimePicker
                value={datePickerType === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                style={styles.datePicker}
              />

              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                    onPress={() => {
                      setShowDatePicker(false);
                      // Revert to previous selection
                      if (datePickerMode === 'nutrition') {
                        if (nutritionRange === 'custom' && !nutritionCustomRange) {
                          setNutritionRange('7days');
                        }
                      } else {
                        if (progressRange === 'custom' && !progressCustomRange) {
                          setProgressRange('7days');
                        }
                      }
                    }}
                  >
                    <Text style={[styles.datePickerButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (datePickerType === 'start') {
                        setDatePickerType('end');
                      } else {
                        // Validate and apply
                        if (tempEndDate < tempStartDate) {
                          Alert.alert('Invalid Range', 'End date must be after start date');
                          return;
                        }
                        const customRange = { startDate: tempStartDate, endDate: tempEndDate };
                        if (datePickerMode === 'nutrition') {
                          setNutritionCustomRange(customRange);
                          setNutritionRange('custom');
                        } else {
                          setProgressCustomRange(customRange);
                          setProgressRange('custom');
                        }
                        setShowDatePicker(false);
                      }
                    }}
                  >
                    <Text style={[styles.datePickerButtonText, { color: '#FFFFFF' }]}>
                      {datePickerType === 'start' ? 'Next' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
  },
  quickAddButton: {
    padding: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  macroItem: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  macroValue: {
    ...typography.bodyBold,
    fontSize: 14,
    marginBottom: 2,
  },
  macroLabel: {
    ...typography.caption,
  },
  activityRow: {
    gap: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activityText: {
    ...typography.body,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statRow: {
    marginBottom: spacing.md,
  },
  statLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.bodyBold,
  },
  macrosRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  macroStat: {
    ...typography.body,
    fontSize: 14,
  },
  noDataText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  noDataSubtext: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  chartContainer: {
    marginTop: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
  },
  dataPointsContainer: {
    gap: spacing.sm,
  },
  dataPoint: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dataPointDate: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  dataPointValues: {
    gap: spacing.xs,
  },
  dataPointValue: {
    ...typography.body,
    fontSize: 14,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  datePickerContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)',
    elevation: 5,
  },
  datePicker: {
    width: '100%',
    marginVertical: spacing.md,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  datePickerButtonText: {
    ...typography.bodyBold,
  },
});
