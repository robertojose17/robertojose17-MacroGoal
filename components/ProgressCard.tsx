
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = 'weekly' | 'monthly' | '6months' | 'custom';

interface ProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface CheckInData {
  date: string;
  weightLbs: number;
}

interface FoodLogData {
  date: string;
  totalCaloriesEaten: number;
}

interface ProfileData {
  startDate: string;
  startWeightLbs: number;
  currentWeightLbs: number;
  goalWeightLbs: number;
  plannedWeightLossRateLbsPerWeek: number | null;
  dailyCaloriesGoal: number;
  maintenanceCaloriesPerDay: number;
}

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [customRange, setCustomRange] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLogData[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Progress] Loading data for user:', userId);

      // Load user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('starting_weight, current_weight, goal_weight, weight_unit, maintenance_calories')
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

      console.log('[Progress] profile:', userData);
      console.log('[Progress] goal:', goalData);

      if (!userData || !goalData) {
        setError('Set your weight goal in Profile to see progress');
        setLoading(false);
        return;
      }

      // Get weight unit from profile
      const weightUnit = userData.weight_unit || 'kg';
      console.log('[Progress] weight_unit from profile:', weightUnit);

      // Convert weights to lbs if needed
      let startWeightLbs: number;
      let currentWeightLbs: number;
      let goalWeightLbs: number;

      if (weightUnit === 'lbs') {
        // Already in lbs, use directly
        startWeightLbs = userData.starting_weight || 0;
        currentWeightLbs = userData.current_weight || 0;
        goalWeightLbs = userData.goal_weight || 0;
      } else {
        // Convert from kg to lbs
        startWeightLbs = (userData.starting_weight || 0) * 2.20462;
        currentWeightLbs = (userData.current_weight || 0) * 2.20462;
        goalWeightLbs = (userData.goal_weight || 0) * 2.20462;
      }

      console.log('[Progress] startWeightLbs:', startWeightLbs);
      console.log('[Progress] currentWeightLbs:', currentWeightLbs);
      console.log('[Progress] goalWeightLbs:', goalWeightLbs);

      // Guard: Check if we have valid goal data
      const hasGoal = typeof goalWeightLbs === 'number' && !Number.isNaN(goalWeightLbs) && goalWeightLbs > 0;

      if (!hasGoal) {
        console.log('[Progress] Invalid goal weight');
        setError('Set your weight goal in Profile to see progress');
        setLoading(false);
        return;
      }

      // Use starting_weight as fallback if it exists
      const effectiveStartWeight = startWeightLbs > 0 ? startWeightLbs : currentWeightLbs;

      setProfileData({
        startDate: goalData.start_date || new Date().toISOString().split('T')[0],
        startWeightLbs: effectiveStartWeight,
        currentWeightLbs,
        goalWeightLbs,
        plannedWeightLossRateLbsPerWeek: goalData.loss_rate_lbs_per_week,
        dailyCaloriesGoal: goalData.daily_calories || 2000,
        maintenanceCaloriesPerDay: userData.maintenance_calories || 2000,
      });

      // Load check-ins
      // Note: check_ins.weight is stored in kg according to the schema
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .order('date', { ascending: true });

      if (checkInsError) throw checkInsError;

      // Convert check-in weights to lbs
      const checkInsLbs: CheckInData[] = (checkInsData || []).map((ci: any) => {
        // Check-ins are stored in kg, convert to lbs
        const weightInLbs = ci.weight * 2.20462;
        return {
          date: ci.date,
          weightLbs: weightInLbs,
        };
      });

      console.log('[Progress] Check-ins loaded:', checkInsLbs.length);
      setCheckIns(checkInsLbs);

      // Load food logs for calorie tracking
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

      const foodLogsArray: FoodLogData[] = Object.entries(caloriesByDate).map(([date, totalCaloriesEaten]) => ({
        date,
        totalCaloriesEaten,
      }));

      console.log('[Progress] Food logs loaded:', foodLogsArray.length);
      setFoodLogs(foodLogsArray);
      setLoading(false);
    } catch (err: any) {
      console.error('[Progress] Error loading data:', err);
      setError(err.message || 'Failed to load progress data');
      setLoading(false);
    }
  };

  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = new Date();

    switch (timeRange) {
      case 'weekly':
        // Show ~8-10 weeks around today
        startDate.setDate(startDate.getDate() - 70); // 10 weeks
        break;
      case 'monthly':
        // Show ~12 months
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case '6months':
        // Show ~6 months from startDate or today
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'custom':
        if (customRange) {
          return customRange;
        }
        startDate.setDate(startDate.getDate() - 70);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate: today };
  };

  const calculatePlannedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData) return [];

    const { startWeightLbs, goalWeightLbs, plannedWeightLossRateLbsPerWeek, dailyCaloriesGoal, maintenanceCaloriesPerDay } = profileData;
    const planStartDate = new Date(profileData.startDate);

    // Calculate plannedLossPerDay
    let plannedLossPerDay: number;
    if (plannedWeightLossRateLbsPerWeek) {
      plannedLossPerDay = plannedWeightLossRateLbsPerWeek / 7;
    } else {
      const dailyDeficit = maintenanceCaloriesPerDay - dailyCaloriesGoal;
      plannedLossPerDay = dailyDeficit / 3500;
    }

    console.log('[Progress] Planned loss per day:', plannedLossPerDay);

    const points: { date: Date; weight: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const daysSinceStart = Math.floor((currentDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let plannedWeight: number;
      if (daysSinceStart < 0) {
        plannedWeight = startWeightLbs;
      } else {
        plannedWeight = startWeightLbs - (plannedLossPerDay * daysSinceStart);
        // Clamp to goal weight
        plannedWeight = Math.max(goalWeightLbs, plannedWeight);
      }

      // Validate weight value
      if (!Number.isNaN(plannedWeight) && plannedWeight > 0) {
        points.push({
          date: new Date(currentDate),
          weight: plannedWeight,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[Progress] Planned line points:', points.length);
    return points;
  };

  const calculateActualLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    const planStartDate = new Date(profileData?.startDate || startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const actualPoints = checkIns
      .filter(ci => {
        const ciDate = new Date(ci.date);
        return ciDate >= planStartDate && ciDate >= startDate && ciDate <= endDate && ciDate <= today;
      })
      .map(ci => ({
        date: new Date(ci.date),
        weight: ci.weightLbs,
      }))
      .filter(point => !Number.isNaN(point.weight) && point.weight > 0);

    console.log('[Progress] Actual line points:', actualPoints.length);
    return actualPoints;
  };

  const calculateProjectedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData) return [];

    const { goalWeightLbs, maintenanceCaloriesPerDay, dailyCaloriesGoal, plannedWeightLossRateLbsPerWeek } = profileData;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Get last known weight
    const actualPoints = calculateActualLine(startDate, endDate);
    let lastKnown: { date: Date; weightLbs: number };

    if (actualPoints.length > 0) {
      const lastActual = actualPoints[actualPoints.length - 1];
      lastKnown = { date: lastActual.date, weightLbs: lastActual.weight };
    } else {
      // Use start date and start weight
      lastKnown = { date: new Date(profileData.startDate), weightLbs: profileData.startWeightLbs };
    }

    console.log('[Progress] Last known weight:', lastKnown);

    // Calculate actual average deficit from food logs
    const recentDays = 14; // Look at last 14 days
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - recentDays);

    const recentFoodLogs = foodLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= cutoffDate && logDate <= today;
    });

    let actualAverageDeficit: number;
    if (recentFoodLogs.length > 0) {
      const totalDeficit = recentFoodLogs.reduce((sum, log) => {
        return sum + (maintenanceCaloriesPerDay - log.totalCaloriesEaten);
      }, 0);
      actualAverageDeficit = totalDeficit / recentFoodLogs.length;
      console.log('[Progress] Actual average deficit from', recentFoodLogs.length, 'days:', actualAverageDeficit);
    } else {
      // Fallback to planned deficit
      const plannedLossPerDay = plannedWeightLossRateLbsPerWeek 
        ? plannedWeightLossRateLbsPerWeek / 7 
        : (maintenanceCaloriesPerDay - dailyCaloriesGoal) / 3500;
      actualAverageDeficit = plannedLossPerDay * 3500;
      console.log('[Progress] No food logs, using planned deficit:', actualAverageDeficit);
    }

    const actualLossPerDay = actualAverageDeficit / 3500;
    console.log('[Progress] Actual loss per day:', actualLossPerDay);

    // Calculate projected days to goal
    const remainingWeight = lastKnown.weightLbs - goalWeightLbs;
    if (remainingWeight <= 0 || actualLossPerDay <= 0) {
      console.log('[Progress] Already at goal or no loss rate');
      return [];
    }

    const projectedDaysToGoal = remainingWeight / actualLossPerDay;
    const projectedGoalDate = new Date(lastKnown.date);
    projectedGoalDate.setDate(projectedGoalDate.getDate() + projectedDaysToGoal);

    console.log('[Progress] Projected days to goal:', projectedDaysToGoal);
    console.log('[Progress] Projected goal date:', projectedGoalDate.toISOString().split('T')[0]);

    // Draw projected line from lastKnown to projectedGoalDate
    // Only for dates > today
    const points: { date: Date; weight: number }[] = [];
    const currentDate = new Date(Math.max(lastKnown.date.getTime(), today.getTime() + 1));
    currentDate.setHours(0, 0, 0, 0);
    let currentWeight = lastKnown.weightLbs;

    // If last known is in the future (shouldn't happen), skip
    if (currentDate > endDate) {
      return [];
    }

    while (currentDate <= endDate && currentDate <= projectedGoalDate) {
      const daysSinceLastKnown = Math.floor((currentDate.getTime() - lastKnown.date.getTime()) / (1000 * 60 * 60 * 24));
      currentWeight = lastKnown.weightLbs - (actualLossPerDay * daysSinceLastKnown);
      currentWeight = Math.max(goalWeightLbs, currentWeight);

      if (!Number.isNaN(currentWeight) && currentWeight > 0) {
        points.push({
          date: new Date(currentDate),
          weight: currentWeight,
        });
      }

      if (currentWeight <= goalWeightLbs) {
        break;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[Progress] Projected line points:', points.length);
    return points;
  };

  const prepareChartData = () => {
    const { startDate, endDate } = getDateRange();

    const plannedPoints = calculatePlannedLine(startDate, endDate);
    const actualPoints = calculateActualLine(startDate, endDate);
    const projectedPoints = calculateProjectedLine(startDate, endDate);

    console.log('[Progress] Chart data prepared:', {
      planned: plannedPoints.length,
      actual: actualPoints.length,
      projected: projectedPoints.length,
    });

    // Sample points for display based on time range
    let sampleInterval = 1;
    if (timeRange === 'weekly') {
      sampleInterval = 2; // Every 2 days
    } else if (timeRange === 'monthly') {
      sampleInterval = 7; // Weekly
    } else if (timeRange === '6months') {
      sampleInterval = 7; // Weekly
    } else {
      // Custom: adjust based on range
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 180) {
        sampleInterval = 7;
      } else if (daysDiff > 60) {
        sampleInterval = 3;
      } else {
        sampleInterval = 1;
      }
    }

    const sampledPlanned = plannedPoints.filter((_, i) => i % sampleInterval === 0);
    
    // Generate labels
    const labels = sampledPlanned.map((p, i) => {
      if (timeRange === 'weekly') {
        // Show week labels
        const weekNum = Math.floor(i / 3.5); // Approximate weeks
        return `W${weekNum}`;
      } else if (timeRange === 'monthly') {
        // Show month labels
        return p.date.toLocaleDateString('en-US', { month: 'short' });
      } else {
        // Show month/day
        const month = p.date.toLocaleDateString('en-US', { month: 'short' });
        const day = p.date.getDate();
        return `${month} ${day}`;
      }
    });

    // Align all datasets to the same x-axis
    const allDates = sampledPlanned.map(p => p.date.getTime());
    
    const plannedWeights = sampledPlanned.map(p => p.weight);
    
    // Map actual points to the sampled dates
    const actualWeights = allDates.map(timestamp => {
      const point = actualPoints.find(ap => {
        const apTime = ap.date.getTime();
        return Math.abs(apTime - timestamp) < 1000 * 60 * 60 * 24; // Within 1 day
      });
      return point ? point.weight : null;
    });

    // Map projected points to the sampled dates
    const projectedWeights = allDates.map(timestamp => {
      const point = projectedPoints.find(pp => {
        const ppTime = pp.date.getTime();
        return Math.abs(ppTime - timestamp) < 1000 * 60 * 60 * 24; // Within 1 day
      });
      return point ? point.weight : null;
    });

    // Filter out all-null datasets
    const datasets: any[] = [];

    // Always show planned
    datasets.push({
      data: plannedWeights,
      color: () => '#5CB97B', // Green
      strokeWidth: 2,
      withDots: false,
    });

    // Show actual if we have data
    const hasActualData = actualWeights.some(w => w !== null);
    if (hasActualData) {
      datasets.push({
        data: actualWeights.map(w => w || 0), // Replace null with 0 for chart
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    // Show projected if we have data
    const hasProjectedData = projectedWeights.some(w => w !== null);
    if (hasProjectedData) {
      datasets.push({
        data: projectedWeights.map(w => w || 0), // Replace null with 0 for chart
        color: () => '#FFD700', // Yellow
        strokeWidth: 2,
        withDots: false,
      });
    }

    return {
      labels,
      datasets,
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
      setTimeRange('weekly');
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
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Progress
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          <TouchableOpacity
            style={[
              styles.rangeButton,
              timeRange === 'weekly' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange('weekly')}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === 'weekly' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rangeButton,
              timeRange === 'monthly' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange('monthly')}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === 'monthly' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              Monthly
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
              timeRange === 'custom' && { backgroundColor: colors.primary },
            ]}
            onPress={handleCustomRangeSelect}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === 'custom' ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
              numberOfLines={1}
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
            <View style={[styles.legendLineDashed, { backgroundColor: '#FFD700' }]} />
            <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
              Projected
            </Text>
          </View>
        </View>

        {/* Chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={Math.max(screenWidth - spacing.md * 4, chartData.labels.length * 40)}
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
                  r: '3',
                  strokeWidth: '1',
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
        </ScrollView>

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
          date.setDate(date.getDate() - 70);
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
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
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
    gap: spacing.xs,
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
  legendLineDashed: {
    width: 20,
    height: 3,
    borderRadius: 2,
    opacity: 0.8,
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
