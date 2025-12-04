
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = '6weeks' | '6months' | '1year' | 'custom';

interface ProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface CheckInData {
  date: string;
  weight: number; // in kg from database
}

interface MealData {
  date: string;
  totalCalories: number;
}

interface ProfileData {
  startDate: string | null;
  startWeightLbs: number;
  goalWeightLbs: number;
  maintenanceCalories: number;
  dailyCaloriesGoal: number;
  weightLossRatePerWeekLbs: number;
}

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('6weeks');
  const [customRange, setCustomRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [mealData, setMealData] = useState<MealData[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('starting_weight, goal_weight, weight_unit, maintenance_calories')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      // Load active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('start_date, daily_calories, loss_rate_lbs_per_week')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) throw goalError;

      if (!userData || !goalData) {
        setError('Set your profile to see progress');
        setLoading(false);
        return;
      }

      // Convert weights to lbs if needed
      const weightUnit = userData.weight_unit || 'kg';
      const startWeightLbs = weightUnit === 'kg' 
        ? (userData.starting_weight || 0) * 2.20462 
        : (userData.starting_weight || 0);
      const goalWeightLbs = weightUnit === 'kg' 
        ? (userData.goal_weight || 0) * 2.20462 
        : (userData.goal_weight || 0);

      if (!startWeightLbs || !goalWeightLbs) {
        setError('Set your weight goal in Profile to see progress');
        setLoading(false);
        return;
      }

      setProfileData({
        startDate: goalData.start_date || null,
        startWeightLbs,
        goalWeightLbs,
        maintenanceCalories: userData.maintenance_calories || 2000,
        dailyCaloriesGoal: goalData.daily_calories || 2000,
        weightLossRatePerWeekLbs: goalData.loss_rate_lbs_per_week || 1.0,
      });

      // Load check-ins (weights are stored in kg)
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .order('date', { ascending: true });

      if (checkInsError) throw checkInsError;

      // Convert check-in weights to lbs
      const checkInsLbs: CheckInData[] = (checkInsData || []).map((ci: any) => ({
        date: ci.date,
        weight: ci.weight * 2.20462, // Convert kg to lbs
      }));

      setCheckIns(checkInsLbs);

      // Load meal data for calorie tracking
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`
          date,
          meal_items (
            calories
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (mealsError) throw mealsError;

      // Aggregate calories by date
      const caloriesByDate: { [key: string]: number } = {};
      (mealsData || []).forEach((meal: any) => {
        const date = meal.date;
        if (!caloriesByDate[date]) {
          caloriesByDate[date] = 0;
        }
        if (meal.meal_items) {
          meal.meal_items.forEach((item: any) => {
            caloriesByDate[date] += item.calories || 0;
          });
        }
      });

      const mealDataArray: MealData[] = Object.entries(caloriesByDate).map(([date, totalCalories]) => ({
        date,
        totalCalories,
      }));

      setMealData(mealDataArray);
      setLoading(false);
    } catch (err: any) {
      console.error('[ProgressCard] Error loading data:', err);
      setError(err.message || 'Failed to load progress data');
      setLoading(false);
    }
  };

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    let startDate = new Date();

    switch (timeRange) {
      case '6weeks':
        startDate.setDate(startDate.getDate() - 42);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customRange) {
          return customRange;
        }
        startDate.setDate(startDate.getDate() - 42);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  };

  const calculatePlannedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData) return [];

    const { startWeightLbs, goalWeightLbs, weightLossRatePerWeekLbs } = profileData;
    const planStartDate = profileData.startDate ? new Date(profileData.startDate) : startDate;

    // Calculate how many weeks to reach goal
    const totalWeightToLose = startWeightLbs - goalWeightLbs;
    const weeksToGoal = totalWeightToLose / weightLossRatePerWeekLbs;
    const daysToGoal = weeksToGoal * 7;

    const points: { date: Date; weight: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const daysSinceStart = Math.floor((currentDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let plannedWeight: number;
      if (daysSinceStart < 0) {
        plannedWeight = startWeightLbs;
      } else if (daysSinceStart >= daysToGoal) {
        plannedWeight = goalWeightLbs;
      } else {
        const progress = daysSinceStart / daysToGoal;
        plannedWeight = startWeightLbs - (totalWeightToLose * progress);
      }

      points.push({
        date: new Date(currentDate),
        weight: plannedWeight,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return points;
  };

  const calculateActualLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    return checkIns
      .filter(ci => {
        const ciDate = new Date(ci.date);
        return ciDate >= startDate && ciDate <= endDate;
      })
      .map(ci => ({
        date: new Date(ci.date),
        weight: ci.weight,
      }));
  };

  const calculateProjectedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData || checkIns.length === 0) return [];

    const actualPoints = calculateActualLine(startDate, endDate);
    if (actualPoints.length === 0) return [];

    // Start from the last actual point
    const lastActual = actualPoints[actualPoints.length - 1];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate real average daily deficit from meal data
    let realDailyDeficit = profileData.maintenanceCalories - profileData.dailyCaloriesGoal;

    const recentMealData = mealData.filter(md => {
      const mdDate = new Date(md.date);
      return mdDate >= startDate && mdDate <= today;
    });

    if (recentMealData.length >= 3) {
      const totalCaloriesEaten = recentMealData.reduce((sum, md) => sum + md.totalCalories, 0);
      const avgCaloriesEaten = totalCaloriesEaten / recentMealData.length;
      realDailyDeficit = profileData.maintenanceCalories - avgCaloriesEaten;
    }

    // Convert deficit to lbs per day (3500 kcal = 1 lb)
    const lbsPerDay = realDailyDeficit / 3500;

    const points: { date: Date; weight: number }[] = [];
    const currentDate = new Date(lastActual.date);
    let currentWeight = lastActual.weight;

    // Project forward from last actual point
    while (currentDate <= endDate) {
      points.push({
        date: new Date(currentDate),
        weight: currentWeight,
      });

      // Stop if we reach goal weight
      if (currentWeight <= profileData.goalWeightLbs) {
        break;
      }

      currentDate.setDate(currentDate.getDate() + 1);
      currentWeight -= lbsPerDay;
    }

    return points;
  };

  const prepareChartData = () => {
    const { startDate, endDate } = getDateRange();

    const plannedPoints = calculatePlannedLine(startDate, endDate);
    const actualPoints = calculateActualLine(startDate, endDate);
    const projectedPoints = calculateProjectedLine(startDate, endDate);

    // Sample points for display (to avoid overcrowding)
    const sampleInterval = Math.max(1, Math.floor(plannedPoints.length / 30));

    const sampledPlanned = plannedPoints.filter((_, i) => i % sampleInterval === 0);
    const labels = sampledPlanned.map(p => {
      const month = p.date.toLocaleDateString('en-US', { month: 'short' });
      const day = p.date.getDate();
      return `${month} ${day}`;
    });

    // Align all datasets to the same x-axis
    const allDates = sampledPlanned.map(p => p.date.getTime());
    
    const plannedWeights = sampledPlanned.map(p => p.weight);
    
    const actualWeights = allDates.map(timestamp => {
      const point = actualPoints.find(ap => {
        const apTime = ap.date.getTime();
        return Math.abs(apTime - timestamp) < 1000 * 60 * 60 * 24; // Within 1 day
      });
      return point ? point.weight : null;
    });

    const projectedWeights = allDates.map(timestamp => {
      const point = projectedPoints.find(pp => {
        const ppTime = pp.date.getTime();
        return Math.abs(ppTime - timestamp) < 1000 * 60 * 60 * 24; // Within 1 day
      });
      return point ? point.weight : null;
    });

    return {
      labels,
      datasets: [
        {
          data: plannedWeights,
          color: () => '#5CB97B', // Green
          strokeWidth: 2,
        },
        {
          data: actualWeights.map(w => w || 0), // Replace null with 0 for chart
          color: () => '#FFFFFF', // White
          strokeWidth: 2,
          withDots: true,
        },
        {
          data: projectedWeights.map(w => w || 0), // Replace null with 0 for chart
          color: () => '#FFD700', // Yellow
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        },
      ],
    };
  };

  const handleCustomRangeSelect = () => {
    setShowCalendarPicker(true);
  };

  const handleDateRangeSelect = (start: Date, end: Date) => {
    setCustomRange({ startDate: start, endDate: end });
    setTimeRange('custom');
  };

  const handleCalendarClose = () => {
    setShowCalendarPicker(false);
    if (timeRange === 'custom' && !customRange) {
      setTimeRange('6weeks');
    }
  };

  const getCustomRangeLabel = () => {
    if (!customRange) return 'Custom';
    const start = customRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = customRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        }
      ]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Progress
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        }
      ]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Progress
        </Text>
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={48}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <Text style={[styles.errorText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  const chartData = prepareChartData();
  const screenWidth = Dimensions.get('window').width;

  return (
    <React.Fragment>
      <View style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        }
      ]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Progress
        </Text>

        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          <TouchableOpacity
            style={[
              styles.rangeButton,
              timeRange === '6weeks' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange('6weeks')}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === '6weeks' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              6 weeks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rangeButton,
              timeRange === '6months' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange('6months')}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === '6months' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              6 months
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rangeButton,
              timeRange === '1year' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange('1year')}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === '1year' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              1 year
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
              {timeRange === 'custom' ? getCustomRangeLabel() : 'Custom'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#5CB97B' }]} />
            <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
              Planned
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#FFFFFF' }]} />
            <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
              Actual
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#FFD700' }]} />
            <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
              Projected
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={screenWidth - spacing.md * 4}
            height={220}
            chartConfig={{
              backgroundColor: isDark ? colors.cardDark : colors.card,
              backgroundGradientFrom: isDark ? colors.cardDark : colors.card,
              backgroundGradientTo: isDark ? colors.cardDark : colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(91, 154, 168, ${opacity})`,
              labelColor: (opacity = 1) => isDark 
                ? `rgba(241, 245, 249, ${opacity})` 
                : `rgba(43, 45, 66, ${opacity})`,
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
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
          />
        </View>

        {/* Y-axis label */}
        <Text style={[styles.yAxisLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          Weight (lbs)
        </Text>
      </View>

      <CalendarDateRangePicker
        visible={showCalendarPicker}
        onClose={handleCalendarClose}
        onSelectRange={handleDateRangeSelect}
        initialStartDate={customRange?.startDate || (() => {
          const date = new Date();
          date.setDate(date.getDate() - 42);
          return date;
        })()}
        initialEndDate={customRange?.endDate || new Date()}
        maxDate={new Date()}
        title="Select Date Range"
      />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
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
    fontSize: 11,
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
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  yAxisLabel: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
  },
});
