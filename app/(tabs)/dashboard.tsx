
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
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import MacroBar from '@/components/MacroBar';
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

interface WeightDataPoint {
  date: string;
  actualWeight: number | null;
  projectedWeight: number;
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
  const [progressRange, setProgressRange] = useState<TimeRange>('30days');
  
  // Custom date ranges
  const [nutritionCustomRange, setNutritionCustomRange] = useState<CustomDateRange | null>(null);
  const [progressCustomRange, setProgressCustomRange] = useState<CustomDateRange | null>(null);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'nutrition' | 'progress'>('nutrition');
  const [datePickerStep, setDatePickerStep] = useState<'start' | 'end'>('start');
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());
  
  const [nutritionStats, setNutritionStats] = useState<any>(null);
  const [weightData, setWeightData] = useState<WeightDataPoint[]>([]);
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
      await loadWeightProgress(authUser.id, userData?.preferred_units || 'metric', goalData);

    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload nutrition trends when range changes
  useEffect(() => {
    if (user) {
      console.log('[Dashboard] Nutrition range changed, reloading trends');
      loadNutritionTrends(user.id);
    }
  }, [nutritionRange, nutritionCustomRange]);

  // Reload weight progress when range changes
  useEffect(() => {
    if (user && goal) {
      console.log('[Dashboard] Progress range changed, reloading weight data');
      loadWeightProgress(user.id, user.preferred_units || 'metric', goal);
    }
  }, [progressRange, progressCustomRange]);

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

      console.log('[Dashboard] Loading nutrition trends from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

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

      console.log('[Dashboard] Nutrition stats:', { daysCount, avgCals, streak });

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

  const loadWeightProgress = async (userId: string, units: string, goalData: any) => {
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

      console.log('[Dashboard] Loading weight progress from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

      // Load ALL weight check-ins (not just in range) to find the first one
      const { data: allCheckInsData } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .order('date', { ascending: true });

      if (!allCheckInsData || allCheckInsData.length === 0) {
        console.log('[Dashboard] No weight check-ins found');
        setWeightData([]);
        return;
      }

      // Get the first weight check-in as the starting point
      const firstCheckIn = allCheckInsData[0];
      const startWeight = firstCheckIn.weight;
      const firstCheckInDate = new Date(firstCheckIn.date);

      console.log('[Dashboard] First check-in:', firstCheckIn);

      // Filter check-ins within the selected range
      const checkInsInRange = allCheckInsData.filter((ci: any) => {
        const ciDate = new Date(ci.date);
        return ciDate >= startDate && ciDate <= endDate;
      });

      // Load meals data for calorie calculations (from first check-in date to end date)
      const { data: mealsData } = await supabase
        .from('meals')
        .select(`
          date,
          meal_items (
            calories
          )
        `)
        .eq('user_id', userId)
        .gte('date', firstCheckIn.date)
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Calculate daily calories eaten
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

      console.log('[Dashboard] Daily calories:', Object.keys(dailyCalories).length, 'days');

      // Calculate projected weight for each day
      const calsPerUnit = units === 'imperial' ? 3500 : 7700; // kcal per lb or kg
      const dailyGoal = goalData?.daily_calories || 2000;

      let cumulativeBalance = 0;
      const weightDataPoints: WeightDataPoint[] = [];

      // Generate all dates from first check-in to end date
      const currentDate = new Date(firstCheckInDate);
      const endDateTime = endDate.getTime();

      while (currentDate.getTime() <= endDateTime) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Calculate daily balance
        const dailyEaten = dailyCalories[dateStr] || 0;
        const dailyBalance = dailyEaten - dailyGoal;
        cumulativeBalance += dailyBalance;

        // Calculate projected weight change
        const projectedWeightChange = cumulativeBalance / calsPerUnit;
        const projectedWeight = startWeight + projectedWeightChange;

        // Find actual weight for this date
        const actualCheckIn = allCheckInsData.find((ci: any) => ci.date === dateStr);

        // Only add data points within the selected range
        if (currentDate >= startDate) {
          weightDataPoints.push({
            date: dateStr,
            actualWeight: actualCheckIn?.weight || null,
            projectedWeight,
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[Dashboard] Weight data points:', weightDataPoints.length);
      setWeightData(weightDataPoints);
    } catch (error) {
      console.error('[Dashboard] Error loading weight progress:', error);
      setWeightData([]);
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
    // Weight is stored in kg in the database
    const units = user?.preferred_units || 'metric';
    if (units === 'imperial') {
      // Convert kg to lbs for display
      const lbs = Math.round(weight * 2.20462);
      return `${lbs} lbs`;
    }
    // Display in kg
    return `${Math.round(weight)} kg`;
  };

  // Handle custom date range selection
  const handleCustomRangeSelect = (mode: 'nutrition' | 'progress') => {
    console.log('[Dashboard] Opening custom date picker for', mode);
    setDatePickerMode(mode);
    setDatePickerStep('start');
    
    // Initialize with reasonable defaults
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    setTempStartDate(start);
    setTempEndDate(end);
    setShowDatePicker(true);
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    console.log('[Dashboard] Date picker change:', event.type, selectedDate);
    
    // Handle dismissal/cancellation
    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      setShowDatePicker(false);
      // Revert to previous selection if no custom range was set
      if (datePickerMode === 'nutrition' && nutritionRange === 'custom' && !nutritionCustomRange) {
        setNutritionRange('7days');
      } else if (datePickerMode === 'progress' && progressRange === 'custom' && !progressCustomRange) {
        setProgressRange('30days');
      }
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (datePickerStep === 'start') {
      // User selected start date
      setTempStartDate(selectedDate);
      
      if (Platform.OS === 'android') {
        // On Android, close this picker and open the next one
        setShowDatePicker(false);
        setDatePickerStep('end');
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setShowDatePicker(true);
        }, 300);
      } else {
        // On iOS, just move to the next step (modal stays open)
        setDatePickerStep('end');
      }
    } else {
      // User selected end date
      setTempEndDate(selectedDate);
      
      // Validate date range
      if (selectedDate < tempStartDate) {
        Alert.alert('Invalid Range', 'End date must be after start date');
        setShowDatePicker(false);
        // Revert selection
        if (datePickerMode === 'nutrition' && nutritionRange === 'custom' && !nutritionCustomRange) {
          setNutritionRange('7days');
        } else if (datePickerMode === 'progress' && progressRange === 'custom' && !progressCustomRange) {
          setProgressRange('30days');
        }
        return;
      }

      // Apply the custom range
      const customRange: CustomDateRange = { 
        startDate: tempStartDate, 
        endDate: selectedDate 
      };
      
      console.log('[Dashboard] Applying custom range:', customRange);
      
      if (datePickerMode === 'nutrition') {
        setNutritionCustomRange(customRange);
        setNutritionRange('custom');
      } else {
        setProgressCustomRange(customRange);
        setProgressRange('custom');
      }

      // Close the picker
      setShowDatePicker(false);
    }
  };

  const handleDatePickerCancel = () => {
    console.log('[Dashboard] Date picker cancelled');
    setShowDatePicker(false);
    
    // Revert to previous selection if no custom range was set
    if (datePickerMode === 'nutrition' && nutritionRange === 'custom' && !nutritionCustomRange) {
      setNutritionRange('7days');
    } else if (datePickerMode === 'progress' && progressRange === 'custom' && !progressCustomRange) {
      setProgressRange('30days');
    }
  };

  const handleDatePickerConfirm = () => {
    console.log('[Dashboard] Date picker confirmed');
    
    // Validate date range
    if (tempEndDate < tempStartDate) {
      Alert.alert('Invalid Range', 'End date must be after start date');
      return;
    }

    // Apply the custom range
    const customRange: CustomDateRange = { 
      startDate: tempStartDate, 
      endDate: tempEndDate 
    };
    
    console.log('[Dashboard] Applying custom range:', customRange);
    
    if (datePickerMode === 'nutrition') {
      setNutritionCustomRange(customRange);
      setNutritionRange('custom');
    } else {
      setProgressCustomRange(customRange);
      setProgressRange('custom');
    }

    setShowDatePicker(false);
  };

  const getCustomRangeLabel = (range: CustomDateRange | null) => {
    if (!range) return 'Custom';
    const start = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = range.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (weightData.length === 0) return null;

    const units = user?.preferred_units || 'metric';
    const conversionFactor = units === 'imperial' ? 2.20462 : 1;

    // Get labels (dates)
    const labels = weightData.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Get projected weights
    const projectedWeights = weightData.map(point => 
      point.projectedWeight * conversionFactor
    );

    // Get actual weights (only where available)
    const actualWeights = weightData.map(point => 
      point.actualWeight ? point.actualWeight * conversionFactor : null
    );

    // Find min and max for Y-axis
    const allWeights = [
      ...projectedWeights,
      ...actualWeights.filter((w): w is number => w !== null)
    ];
    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const padding = (maxWeight - minWeight) * 0.1 || 5;

    return {
      labels,
      datasets: [
        {
          data: projectedWeights,
          color: () => colors.info,
          strokeWidth: 2,
        },
        {
          data: actualWeights.map(w => w || 0), // Replace null with 0 for chart
          color: () => colors.primary,
          strokeWidth: 2,
          withDots: true,
        },
      ],
      legend: ['Projected', 'Actual'],
      minValue: minWeight - padding,
      maxValue: maxWeight + padding,
    };
  }, [weightData, user?.preferred_units]);

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

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - (spacing.md * 4);

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

          {/* Macros - Single Horizontal Row */}
          <View style={styles.macrosRow}>
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

              {/* Average Macros with Progress Bars */}
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Average macros per day:
                </Text>
                
                {/* Macro Bars */}
                <View style={styles.macroBarsContainer}>
                  <MacroBar
                    label="Protein"
                    current={nutritionStats.avgProtein}
                    target={goal?.protein_g || 150}
                    color={colors.protein}
                  />
                  <MacroBar
                    label="Carbs"
                    current={nutritionStats.avgCarbs}
                    target={goal?.carbs_g || 200}
                    color={colors.carbs}
                  />
                  <MacroBar
                    label="Fats"
                    current={nutritionStats.avgFats}
                    target={goal?.fats_g || 65}
                    color={colors.fats}
                  />
                  <MacroBar
                    label="Fiber"
                    current={nutritionStats.avgFiber}
                    target={goal?.fiber_g || 30}
                    color={colors.fiber}
                  />
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

        {/* Progress (Weight vs Projected) */}
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

          {chartData && weightData.length > 0 ? (
            <View style={styles.chartContainer}>
              {/* Legend */}
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
                    Projected Weight
                  </Text>
                </View>
              </View>

              {/* Line Chart */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: chartData.datasets,
                    legend: chartData.legend,
                  }}
                  width={Math.max(chartWidth, chartData.labels.length * 60)}
                  height={220}
                  chartConfig={{
                    backgroundColor: isDark ? colors.cardDark : colors.card,
                    backgroundGradientFrom: isDark ? colors.cardDark : colors.card,
                    backgroundGradientTo: isDark ? colors.cardDark : colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => isDark ? `rgba(241, 245, 249, ${opacity})` : `rgba(30, 41, 59, ${opacity})`,
                    labelColor: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                    style: {
                      borderRadius: borderRadius.md,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: isDark ? colors.borderDark : colors.border,
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={styles.chart}
                  fromZero={false}
                  segments={5}
                />
              </ScrollView>

              {/* Weight Unit Label */}
              <Text style={[styles.chartLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Weight in {user?.preferred_units === 'imperial' ? 'lbs' : 'kg'}
              </Text>
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

      {/* Date Picker Modal - Platform-specific rendering */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerStep === 'start' ? tempStartDate : tempEndDate}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
          maximumDate={new Date()}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={handleDatePickerCancel}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleDatePickerCancel}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.datePickerContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Select Date Range
                </Text>
                
                {/* Start Date Picker */}
                <View style={styles.datePickerSection}>
                  <Text style={[styles.datePickerLabel, { color: isDark ? colors.textDark : colors.text }]}>
                    Start Date
                  </Text>
                  <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setTempStartDate(date);
                    }}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                </View>

                {/* End Date Picker */}
                <View style={styles.datePickerSection}>
                  <Text style={[styles.datePickerLabel, { color: isDark ? colors.textDark : colors.text }]}>
                    End Date
                  </Text>
                  <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) setTempEndDate(date);
                    }}
                    maximumDate={new Date()}
                    minimumDate={tempStartDate}
                    style={styles.datePicker}
                  />
                </View>

                {/* Buttons */}
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                    onPress={handleDatePickerCancel}
                  >
                    <Text style={[styles.datePickerButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: colors.primary }]}
                    onPress={handleDatePickerConfirm}
                  >
                    <Text style={[styles.datePickerButtonText, { color: '#FFFFFF' }]}>
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
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
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    ...typography.bodyBold,
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center',
  },
  macroLabel: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
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
  macroBarsContainer: {
    marginTop: spacing.sm,
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
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  chartLabel: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  datePickerSection: {
    marginBottom: spacing.md,
  },
  datePickerLabel: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  datePicker: {
    width: '100%',
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
