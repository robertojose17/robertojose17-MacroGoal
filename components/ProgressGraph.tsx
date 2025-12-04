
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/app/integrations/supabase/client';
import CalendarDateRangePicker from './CalendarDateRangePicker';
import { calculateBMR, calculateTDEE } from '@/utils/calculations';

type TimeRange = '7days' | '30days' | 'custom';

interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

interface ProgressGraphProps {
  userId: string;
  userProfile: any;
  goal: any;
}

interface WeeklyData {
  weekLabel: string;
  weekStartDate: Date;
  actualWeight: number | null;
  plannedWeight: number | null;
  projectedWeight: number | null;
}

const KG_TO_LB = 2.20462;

// Normalize weight - ensure no NaN or null values
const normalize = (w: any): number | null => {
  if (w === null || w === undefined || w === '') return null;
  const num = Number(w);
  if (Number.isNaN(num)) return null;
  return num;
};

export default function ProgressGraph({ userId, userProfile, goal }: ProgressGraphProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    loadProgressData();
  }, [timeRange, customRange, userId]);

  const calculateMaintenanceCalories = (profile: any): number => {
    // Calculate maintenance calories from BMR and activity level
    const weight = normalize(profile?.current_weight);
    const height = normalize(profile?.height);
    const dob = profile?.date_of_birth;
    const sex = profile?.sex;
    const activityLevel = profile?.activity_level;

    if (!weight || !height || !dob || !sex || !activityLevel) {
      console.log('[ProgressGraph] Missing data for maintenance calories calculation, using default 2500');
      return 2500;
    }

    // Calculate age
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Weight is stored in user's preferred unit, but BMR calculation expects kg
    const weightUnit = profile?.weight_unit || 'kg';
    const weightInKg = weightUnit === 'lbs' ? weight / KG_TO_LB : weight;

    const bmr = calculateBMR(weightInKg, height, age, sex);
    const tdee = calculateTDEE(bmr, activityLevel);

    console.log('[ProgressGraph] Calculated maintenance calories:', tdee);
    return tdee;
  };

  const loadProgressData = async () => {
    try {
      setLoading(true);
      console.log('[ProgressGraph] Loading progress data for range:', timeRange);

      // Get weight unit from profile
      const weightUnit = userProfile?.weight_unit || 'kg';
      console.log('[ProgressGraph] Weight unit:', weightUnit);

      // Get profile data - all weights are stored in user's preferred unit
      const currentWeight = normalize(userProfile?.current_weight);
      const targetWeight = normalize(userProfile?.goal_weight) || normalize(goal?.target_weight);
      const startingWeight = normalize(userProfile?.starting_weight);
      
      console.log('[ProgressGraph] Profile weights:', {
        currentWeight,
        targetWeight,
        startingWeight,
        weightUnit,
      });

      // Get goal data
      const startDate = goal?.start_date ? new Date(goal.start_date) : new Date();
      
      // Calculate or get maintenance calories
      let maintenanceCalories = normalize(userProfile?.maintenance_calories);
      if (!maintenanceCalories) {
        maintenanceCalories = calculateMaintenanceCalories(userProfile);
      }
      
      const dailyCalories = normalize(goal?.daily_calories) || 2000;

      console.log('[ProgressGraph] Goal data:', {
        startDate: startDate.toISOString(),
        maintenanceCalories,
        dailyCalories,
      });

      // Determine date range for display
      let displayStartDate: Date;
      let displayEndDate: Date;

      if (timeRange === '7days') {
        displayEndDate = new Date();
        displayEndDate.setHours(23, 59, 59, 999);
        displayStartDate = new Date();
        displayStartDate.setDate(displayStartDate.getDate() - 6);
        displayStartDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '30days') {
        displayEndDate = new Date();
        displayEndDate.setHours(23, 59, 59, 999);
        displayStartDate = new Date();
        displayStartDate.setDate(displayStartDate.getDate() - 29);
        displayStartDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'custom' && customRange) {
        displayStartDate = new Date(customRange.startDate);
        displayStartDate.setHours(0, 0, 0, 0);
        displayEndDate = new Date(customRange.endDate);
        displayEndDate.setHours(23, 59, 59, 999);
      } else {
        displayEndDate = new Date();
        displayEndDate.setHours(23, 59, 59, 999);
        displayStartDate = new Date();
        displayStartDate.setDate(displayStartDate.getDate() - 29);
        displayStartDate.setHours(0, 0, 0, 0);
      }

      console.log('[ProgressGraph] Display range:', displayStartDate.toISOString(), 'to', displayEndDate.toISOString());

      // Load ALL check-ins since goal start date (not just display range)
      const goalStartDateStr = startDate.toISOString().split('T')[0];
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .gte('date', goalStartDateStr)
        .order('date', { ascending: true });

      if (error) {
        console.error('[ProgressGraph] Error loading check-ins:', error);
        setWeeklyData([]);
        setLoading(false);
        return;
      }

      console.log('[ProgressGraph] Loaded', checkIns?.length || 0, 'check-ins');

      // Load meals data for calorie deficit calculation
      const { data: mealsData } = await supabase
        .from('meals')
        .select(`
          date,
          meal_items (
            calories
          )
        `)
        .eq('user_id', userId)
        .gte('date', goalStartDateStr)
        .order('date', { ascending: true });

      console.log('[ProgressGraph] Loaded', mealsData?.length || 0, 'meals');

      // Calculate weekly data
      const weekly = calculateWeeklyData(
        displayStartDate,
        displayEndDate,
        startDate,
        checkIns || [],
        mealsData || [],
        currentWeight,
        targetWeight,
        startingWeight,
        maintenanceCalories,
        dailyCalories,
        weightUnit
      );

      console.log('[ProgressGraph] Calculated', weekly.length, 'weekly data points');
      setWeeklyData(weekly);
    } catch (error) {
      console.error('[ProgressGraph] Error in loadProgressData:', error);
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyData = (
    displayStartDate: Date,
    displayEndDate: Date,
    goalStartDate: Date,
    checkIns: any[],
    mealsData: any[],
    currentWeight: number | null,
    targetWeight: number | null,
    startingWeight: number | null,
    maintenanceCalories: number,
    dailyCalories: number,
    weightUnit: 'kg' | 'lbs'
  ): WeeklyData[] => {
    const weeks: WeeklyData[] = [];
    
    // Validate required data
    if (!currentWeight || !targetWeight) {
      console.log('[ProgressGraph] Missing required weight data');
      return [];
    }

    // Use starting weight if available, otherwise use first check-in or current weight
    let effectiveStartingWeight = startingWeight;
    if (!effectiveStartingWeight && checkIns.length > 0) {
      // Check-ins are stored in kg, convert if needed
      const firstCheckInWeight = normalize(checkIns[0].weight);
      if (firstCheckInWeight !== null) {
        effectiveStartingWeight = weightUnit === 'lbs' ? firstCheckInWeight * KG_TO_LB : firstCheckInWeight;
      }
    }
    if (!effectiveStartingWeight) {
      effectiveStartingWeight = currentWeight;
    }

    console.log('[ProgressGraph] Effective starting weight:', effectiveStartingWeight, weightUnit);

    // Calculate daily deficit and pounds per day
    const dailyDeficit = maintenanceCalories - dailyCalories;
    console.log('[ProgressGraph] Daily deficit:', dailyDeficit, 'kcal');

    // Convert deficit to weight loss per day
    // 1 lb fat ≈ 3500 kcal, 1 kg fat ≈ 7700 kcal
    const caloriesPerUnit = weightUnit === 'lbs' ? 3500 : 7700;
    const weightLossPerDay = dailyDeficit / caloriesPerUnit;
    console.log('[ProgressGraph] Weight loss per day:', weightLossPerDay, weightUnit);

    // Calculate days to goal
    const weightDiff = effectiveStartingWeight - targetWeight;
    const daysToGoal = weightLossPerDay === 0 ? null : weightDiff / weightLossPerDay;
    console.log('[ProgressGraph] Days to goal:', daysToGoal);

    // Group check-ins by week (7-day windows starting from goal start date)
    const checkInsByWeek = new Map<string, number[]>();
    checkIns.forEach((checkIn) => {
      const checkInDate = new Date(checkIn.date);
      const weekStart = getWeekStart(checkInDate, goalStartDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!checkInsByWeek.has(weekKey)) {
        checkInsByWeek.set(weekKey, []);
      }
      
      // Check-ins are stored in kg, convert to user's preferred unit
      const weight = normalize(checkIn.weight);
      if (weight !== null) {
        const convertedWeight = weightUnit === 'lbs' ? weight * KG_TO_LB : weight;
        checkInsByWeek.get(weekKey)!.push(convertedWeight);
      }
    });

    console.log('[ProgressGraph] Check-ins grouped by week:', checkInsByWeek.size, 'weeks');

    // Calculate total daily calories by date
    const caloriesByDate = new Map<string, number>();
    mealsData.forEach((meal: any) => {
      const mealDate = meal.date;
      
      if (!caloriesByDate.has(mealDate)) {
        caloriesByDate.set(mealDate, 0);
      }
      
      if (meal.meal_items) {
        const dayCalories = meal.meal_items.reduce((sum: number, item: any) => {
          const itemCals = normalize(item.calories);
          return sum + (itemCals || 0);
        }, 0);
        caloriesByDate.set(mealDate, caloriesByDate.get(mealDate)! + dayCalories);
      }
    });

    console.log('[ProgressGraph] Calories logged for', caloriesByDate.size, 'days');

    // Calculate average daily calories by week
    const caloriesByWeek = new Map<string, { total: number; days: number }>();
    caloriesByDate.forEach((calories, date) => {
      const dateObj = new Date(date);
      const weekStart = getWeekStart(dateObj, goalStartDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!caloriesByWeek.has(weekKey)) {
        caloriesByWeek.set(weekKey, { total: 0, days: 0 });
      }
      
      const weekData = caloriesByWeek.get(weekKey)!;
      weekData.total += calories;
      weekData.days += 1;
    });

    // Generate weekly data points
    let currentWeekStart = new Date(displayStartDate);
    currentWeekStart = getWeekStart(currentWeekStart, goalStartDate);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastActualWeight: number | null = null;
    let lastActualWeekStart: Date | null = null;

    while (currentWeekStart <= displayEndDate) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekLabel = formatWeekLabel(currentWeekStart);
      
      // Calculate days since goal start
      const daysSinceStart = Math.floor(
        (currentWeekStart.getTime() - goalStartDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      // ===== PLANNED WEIGHT (GREEN LINE) =====
      // Always calculate based on planned deficit
      let plannedWeight: number | null = null;
      if (daysToGoal !== null) {
        plannedWeight = effectiveStartingWeight - (weightLossPerDay * daysSinceStart);
        
        // Don't go below target weight
        if (plannedWeight < targetWeight) {
          plannedWeight = targetWeight;
        }
      }

      // ===== ACTUAL WEIGHT (WHITE LINE WITH DOTS) =====
      // Only show if we have real check-in data for this week
      let actualWeight: number | null = null;
      const weekWeights = checkInsByWeek.get(weekKey);
      if (weekWeights && weekWeights.length > 0 && currentWeekStart <= today) {
        // Calculate average of all check-ins in this week
        const sum = weekWeights.reduce((acc, w) => acc + w, 0);
        actualWeight = sum / weekWeights.length;
        lastActualWeight = actualWeight;
        lastActualWeekStart = new Date(currentWeekStart);
        
        console.log('[ProgressGraph] Week', weekKey, '- Actual weight:', actualWeight.toFixed(2), weightUnit, '(', weekWeights.length, 'check-ins)');
      }

      // ===== PROJECTED WEIGHT (YELLOW DASHED LINE) =====
      // Only show for future weeks after last actual data
      let projectedWeight: number | null = null;
      if (lastActualWeight !== null && lastActualWeekStart !== null && currentWeekStart > today) {
        // Calculate weeks since last actual data
        const weeksSinceLastActual = Math.floor(
          (currentWeekStart.getTime() - lastActualWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        // Determine which deficit to use
        let effectiveDeficitPerDay = weightLossPerDay; // Default to planned

        // Check if we have calorie data for the week containing last actual weight
        const lastActualWeekKey = lastActualWeekStart.toISOString().split('T')[0];
        const weekCalories = caloriesByWeek.get(lastActualWeekKey);
        
        if (weekCalories && weekCalories.days > 0) {
          // Use real deficit based on logged calories
          const avgDailyCalories = weekCalories.total / weekCalories.days;
          const realDailyDeficit = maintenanceCalories - avgDailyCalories;
          effectiveDeficitPerDay = realDailyDeficit / caloriesPerUnit;
          
          console.log('[ProgressGraph] Using real deficit for projection:', realDailyDeficit, 'kcal/day =', effectiveDeficitPerDay, weightUnit + '/day');
        } else {
          console.log('[ProgressGraph] Using planned deficit for projection:', dailyDeficit, 'kcal/day =', effectiveDeficitPerDay, weightUnit + '/day');
        }

        // Project from last actual weight
        projectedWeight = lastActualWeight - (effectiveDeficitPerDay * 7 * weeksSinceLastActual);
        
        // Don't project beyond target weight
        if (projectedWeight < targetWeight) {
          projectedWeight = targetWeight;
        }
      }

      // Only add weeks within display range
      if (currentWeekStart >= displayStartDate && currentWeekStart <= displayEndDate) {
        weeks.push({
          weekLabel,
          weekStartDate: new Date(currentWeekStart),
          actualWeight,
          plannedWeight,
          projectedWeight,
        });
      }

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  };

  const getWeekStart = (date: Date, goalStartDate: Date): Date => {
    // Calculate week start based on goal start date (not Sunday)
    const daysSinceGoalStart = Math.floor(
      (date.getTime() - goalStartDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weekNumber = Math.floor(daysSinceGoalStart / 7);
    const weekStart = new Date(goalStartDate);
    weekStart.setDate(weekStart.getDate() + (weekNumber * 7));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const formatWeekLabel = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const handleCustomRangeSelect = () => {
    console.log('[ProgressGraph] Opening calendar date range picker');
    setShowCalendarPicker(true);
  };

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    console.log('[ProgressGraph] Date range selected:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const customRange: CustomDateRange = { 
      startDate, 
      endDate 
    };
    
    setCustomRange(customRange);
    setTimeRange('custom');
  };

  const handleCalendarClose = () => {
    console.log('[ProgressGraph] Calendar picker closed');
    setShowCalendarPicker(false);
    
    if (timeRange === 'custom' && !customRange) {
      setTimeRange('30days');
    }
  };

  const getCustomRangeLabel = (range: CustomDateRange | null) => {
    if (!range) return 'Custom';
    const start = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = range.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const renderGraph = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Loading progress data...
          </Text>
        </View>
      );
    }

    if (weeklyData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Not enough data yet
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Start logging your weight in Check-Ins to see your progress.
          </Text>
        </View>
      );
    }

    // Get weight unit for display
    const weightUnit = userProfile?.weight_unit || 'kg';

    // Prepare data for chart
    const labels = weeklyData.map(w => w.weekLabel);
    
    // Get all valid weight values to determine min/max
    const allWeights: number[] = [];
    weeklyData.forEach(w => {
      const planned = normalize(w.plannedWeight);
      const actual = normalize(w.actualWeight);
      const projected = normalize(w.projectedWeight);
      
      if (planned !== null) allWeights.push(planned);
      if (actual !== null) allWeights.push(actual);
      if (projected !== null) allWeights.push(projected);
    });

    if (allWeights.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Not enough data yet
          </Text>
        </View>
      );
    }

    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const padding = (maxWeight - minWeight) * 0.1 || 5;

    // Prepare datasets
    const datasets: any[] = [];

    // Planned line (green solid) - always show
    const plannedData = weeklyData.map(w => {
      const val = normalize(w.plannedWeight);
      return val !== null ? val : NaN;
    });
    
    if (plannedData.some(v => !Number.isNaN(v))) {
      datasets.push({
        data: plannedData,
        color: () => '#5CB97B', // Green
        strokeWidth: 2,
        withDots: false,
      });
    }

    // Actual line (white with small circles) - only show weeks with data
    const actualData = weeklyData.map(w => {
      const val = normalize(w.actualWeight);
      return val !== null ? val : NaN;
    });
    
    const hasActualData = actualData.some(v => !Number.isNaN(v));
    if (hasActualData) {
      datasets.push({
        data: actualData,
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    // Projected line (yellow dashed) - only show future projection
    const projectedData = weeklyData.map(w => {
      const val = normalize(w.projectedWeight);
      return val !== null ? val : NaN;
    });
    
    const hasProjectedData = projectedData.some(v => !Number.isNaN(v));
    if (hasProjectedData) {
      datasets.push({
        data: projectedData,
        color: () => '#FFEA70', // Yellow
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        withDots: false,
      });
    }

    const screenWidth = Dimensions.get('window').width - (spacing.md * 2) - (spacing.lg * 2);
    const chartWidth = Math.max(screenWidth, labels.length * 60);

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScrollContent}
      >
        <LineChart
          data={{
            labels,
            datasets,
          }}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: isDark ? colors.cardDark : colors.card,
            backgroundGradientFrom: isDark ? colors.cardDark : colors.card,
            backgroundGradientTo: isDark ? colors.cardDark : colors.card,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => isDark ? `rgba(241, 245, 249, ${opacity})` : `rgba(43, 45, 66, ${opacity})`,
            style: {
              borderRadius: borderRadius.md,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '1',
              stroke: '#FFFFFF',
              fill: '#FFFFFF',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: isDark ? colors.borderDark : colors.border,
              strokeWidth: 1,
            },
          }}
          bezier={false}
          style={styles.chart}
          fromZero={false}
          yAxisSuffix={` ${weightUnit}`}
          yAxisInterval={1}
          segments={4}
        />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
      <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
        Progress
      </Text>

      {/* View Selector */}
      <View style={styles.rangeSelector}>
        <TouchableOpacity
          style={[
            styles.rangeButton,
            timeRange === '7days' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setTimeRange('7days')}
        >
          <Text
            style={[
              styles.rangeButtonText,
              { color: timeRange === '7days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
            ]}
          >
            Last 7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.rangeButton,
            timeRange === '30days' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setTimeRange('30days')}
        >
          <Text
            style={[
              styles.rangeButtonText,
              { color: timeRange === '30days' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
            ]}
          >
            Last 30 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.rangeButton,
            timeRange === 'custom' && { backgroundColor: colors.primary },
          ]}
          onPress={handleCustomRangeSelect}
        >
          <Text
            style={[
              styles.rangeButtonText,
              { color: timeRange === 'custom' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
            ]}
          >
            {timeRange === 'custom' ? getCustomRangeLabel(customRange) : 'Custom'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#5CB97B' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Planned
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCircle, { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Actual
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDashed, { backgroundColor: '#FFEA70' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Projected
          </Text>
        </View>
      </View>

      {/* Graph */}
      {renderGraph()}

      {/* Calendar Picker Modal */}
      <CalendarDateRangePicker
        visible={showCalendarPicker}
        onClose={handleCalendarClose}
        onSelectRange={handleDateRangeSelect}
        initialStartDate={customRange?.startDate || (() => {
          const date = new Date();
          date.setDate(date.getDate() - 30);
          return date;
        })()}
        initialEndDate={customRange?.endDate || new Date()}
        maxDate={new Date()}
        title="Select Date Range"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  legendCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendDashed: {
    width: 20,
    height: 3,
    borderRadius: 2,
    opacity: 0.8,
  },
  legendText: {
    ...typography.caption,
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    textAlign: 'center',
  },
  chartScrollContent: {
    paddingRight: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
});
