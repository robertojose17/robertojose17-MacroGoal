
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

export default function ProgressGraph({ userId, userProfile, goal }: ProgressGraphProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    loadProgressData();
  }, [timeRange, customRange, userId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      console.log('[ProgressGraph] Loading progress data for range:', timeRange);

      // Determine date range
      let startDate: Date;
      let endDate: Date;

      if (timeRange === '7days') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '30days') {
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'custom' && customRange) {
        startDate = new Date(customRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customRange.endDate);
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

      console.log('[ProgressGraph] Date range:', startDateStr, 'to', endDateStr);

      // Load check-ins data
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .not('weight', 'is', null)
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
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      console.log('[ProgressGraph] Loaded', mealsData?.length || 0, 'meals');

      // Calculate weekly data
      const weekly = calculateWeeklyData(
        startDate,
        endDate,
        checkIns || [],
        mealsData || [],
        userProfile,
        goal
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
    startDate: Date,
    endDate: Date,
    checkIns: any[],
    mealsData: any[],
    userProfile: any,
    goal: any
  ): WeeklyData[] => {
    const weeks: WeeklyData[] = [];
    
    // Get profile data
    const startingWeight = userProfile?.current_weight || 70; // kg
    const targetWeight = userProfile?.goal_weight || startingWeight - 10;
    const lossRateLbsPerWeek = goal?.loss_rate_lbs_per_week || 1.0;
    const goalStartDate = goal?.start_date ? new Date(goal.start_date) : startDate;
    const dailyCalorieGoal = goal?.daily_calories || 2000;

    // Calculate planned weekly deficit (kg per week)
    const plannedWeeklyDeficitKg = (lossRateLbsPerWeek * 0.453592); // Convert lbs to kg

    // Group check-ins by week
    const checkInsByWeek = new Map<string, number[]>();
    checkIns.forEach((checkIn) => {
      const checkInDate = new Date(checkIn.date);
      const weekStart = getWeekStart(checkInDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!checkInsByWeek.has(weekKey)) {
        checkInsByWeek.set(weekKey, []);
      }
      checkInsByWeek.get(weekKey)!.push(checkIn.weight);
    });

    // Calculate average daily calories by week
    const caloriesByWeek = new Map<string, { total: number; days: number }>();
    mealsData.forEach((meal: any) => {
      const mealDate = new Date(meal.date);
      const weekStart = getWeekStart(mealDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!caloriesByWeek.has(weekKey)) {
        caloriesByWeek.set(weekKey, { total: 0, days: 0 });
      }
      
      const weekData = caloriesByWeek.get(weekKey)!;
      if (meal.meal_items) {
        const dayCalories = meal.meal_items.reduce((sum: number, item: any) => sum + (item.calories || 0), 0);
        weekData.total += dayCalories;
        weekData.days += 1;
      }
    });

    // Generate weekly data points
    let currentWeekStart = new Date(startDate);
    currentWeekStart = getWeekStart(currentWeekStart);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastActualWeight: number | null = null;
    let lastActualWeekStart: Date | null = null;

    while (currentWeekStart <= endDate) {
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const weekLabel = formatWeekLabel(currentWeekStart);
      
      // Calculate weeks since goal start
      const weeksSinceStart = Math.floor(
        (currentWeekStart.getTime() - goalStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      // Planned weight (green line)
      const plannedWeight = startingWeight - (weeksSinceStart * plannedWeeklyDeficitKg);

      // Actual weight (white line with circles) - only if we have data
      let actualWeight: number | null = null;
      const weekWeights = checkInsByWeek.get(weekKey);
      if (weekWeights && weekWeights.length > 0) {
        actualWeight = weekWeights.reduce((sum, w) => sum + w, 0) / weekWeights.length;
        lastActualWeight = actualWeight;
        lastActualWeekStart = new Date(currentWeekStart);
      }

      // Projected weight (yellow dashed line) - only for future weeks after last actual data
      let projectedWeight: number | null = null;
      if (lastActualWeight !== null && lastActualWeekStart !== null && currentWeekStart > lastActualWeekStart) {
        // Calculate actual deficit based on logged calories
        const weekCalories = caloriesByWeek.get(weekKey);
        let actualDeficitPerWeek = plannedWeeklyDeficitKg; // Default to planned

        if (weekCalories && weekCalories.days > 0) {
          const avgDailyCalories = weekCalories.total / weekCalories.days;
          const dailyDeficit = dailyCalorieGoal - avgDailyCalories;
          // 1 kg fat ≈ 7700 kcal
          const weeklyDeficitKg = (dailyDeficit * 7) / 7700;
          actualDeficitPerWeek = weeklyDeficitKg;
        }

        const weeksSinceLastActual = Math.floor(
          (currentWeekStart.getTime() - lastActualWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        projectedWeight = lastActualWeight - (weeksSinceLastActual * actualDeficitPerWeek);
      }

      weeks.push({
        weekLabel,
        weekStartDate: new Date(currentWeekStart),
        actualWeight,
        plannedWeight,
        projectedWeight,
      });

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to Sunday
    const weekStart = new Date(d.setDate(diff));
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
      setTimeRange('7days');
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
            No weight data available for this period.
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Start logging your weight in Check-Ins to see your progress.
          </Text>
        </View>
      );
    }

    // Prepare data for chart
    const labels = weeklyData.map(w => w.weekLabel);
    
    // Get all weight values to determine min/max
    const allWeights: number[] = [];
    weeklyData.forEach(w => {
      if (w.plannedWeight !== null) allWeights.push(w.plannedWeight);
      if (w.actualWeight !== null) allWeights.push(w.actualWeight);
      if (w.projectedWeight !== null) allWeights.push(w.projectedWeight);
    });

    if (allWeights.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No weight data available.
          </Text>
        </View>
      );
    }

    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const padding = (maxWeight - minWeight) * 0.1 || 5;

    // Prepare datasets
    const datasets: any[] = [];

    // Planned line (green solid)
    const plannedData = weeklyData.map(w => w.plannedWeight || 0);
    datasets.push({
      data: plannedData,
      color: () => colors.success, // Green
      strokeWidth: 2,
    });

    // Actual line (white with circles)
    const actualData = weeklyData.map(w => w.actualWeight !== null ? w.actualWeight : null);
    const hasActualData = actualData.some(v => v !== null);
    if (hasActualData) {
      // Fill gaps with NaN to avoid connecting non-consecutive points
      const actualDataForChart = actualData.map(v => v === null ? NaN : v);
      datasets.push({
        data: actualDataForChart,
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    // Projected line (yellow dashed)
    const projectedData = weeklyData.map(w => w.projectedWeight !== null ? w.projectedWeight : null);
    const hasProjectedData = projectedData.some(v => v !== null);
    if (hasProjectedData) {
      const projectedDataForChart = projectedData.map(v => v === null ? NaN : v);
      datasets.push({
        data: projectedDataForChart,
        color: () => colors.warning, // Yellow
        strokeWidth: 2,
        strokeDashArray: [5, 5],
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
              r: '4',
              strokeWidth: '2',
              stroke: '#FFFFFF',
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
          yAxisSuffix=" kg"
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
          <View style={[styles.legendLine, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Planned
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#FFFFFF' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Actual
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.warning }]} />
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
          date.setDate(date.getDate() - 7);
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
