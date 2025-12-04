
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
  desiredLossRateLbsPerWeek: number;
  dailyCaloriesTarget: number;
  maintenanceCalories: number;
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

      console.log('[Progress] userData:', userData);
      console.log('[Progress] goalData:', goalData);

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

      // Get desired loss rate (default to 1 lb/week if not set)
      const desiredLossRateLbsPerWeek = goalData.loss_rate_lbs_per_week || 1.0;

      setProfileData({
        startDate: goalData.start_date || new Date().toISOString().split('T')[0],
        startWeightLbs: effectiveStartWeight,
        currentWeightLbs,
        goalWeightLbs,
        desiredLossRateLbsPerWeek,
        dailyCaloriesTarget: goalData.daily_calories || 2000,
        maintenanceCalories: userData.maintenance_calories || 2500,
      });

      // Load check-ins (stored in kg, convert to lbs)
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
        // Show ~7-10 days ending at today
        startDate.setDate(startDate.getDate() - 9); // 10 days total
        break;
      case 'monthly':
        // Show ~30 days ending at today
        startDate.setDate(startDate.getDate() - 29); // 30 days total
        break;
      case '6months':
        // Show ~180 days ending at today
        startDate.setDate(startDate.getDate() - 179); // 180 days total
        break;
      case 'custom':
        if (customRange) {
          // Ensure start < end
          const start = new Date(customRange.startDate);
          const end = new Date(customRange.endDate);
          if (start > end) {
            return { startDate: end, endDate: start };
          }
          return { startDate: start, endDate: end };
        }
        startDate.setDate(startDate.getDate() - 9);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate: today };
  };

  // PLANNED LINE: Straight diagonal from (startDate, startWeightLbs) to (goalDate, goalWeightLbs)
  const calculatePlannedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData) return [];

    const { startWeightLbs, goalWeightLbs, desiredLossRateLbsPerWeek, dailyCaloriesTarget, maintenanceCalories } = profileData;
    const planStartDate = new Date(profileData.startDate);

    // Calculate planned daily deficit
    const plannedDailyDeficit = maintenanceCalories - dailyCaloriesTarget;
    
    // Calculate days to goal using the desired loss rate
    const totalWeightToLose = Math.abs(startWeightLbs - goalWeightLbs);
    const weeksToGoal = totalWeightToLose / desiredLossRateLbsPerWeek;
    const daysToGoal = weeksToGoal * 7;
    
    const goalDate = new Date(planStartDate);
    goalDate.setDate(goalDate.getDate() + daysToGoal);

    console.log('[Progress] Planned line calculation:', {
      startWeightLbs,
      goalWeightLbs,
      desiredLossRateLbsPerWeek,
      daysToGoal,
      goalDate: goalDate.toISOString().split('T')[0],
    });

    // Generate points using linear interpolation
    const points: { date: Date; weight: number }[] = [];
    const currentDate = new Date(Math.max(startDate.getTime(), planStartDate.getTime()));
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      // Calculate days from plan start
      const daysSinceStart = Math.floor((currentDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let plannedWeight: number;
      if (daysSinceStart < 0) {
        // Before plan start, use start weight
        plannedWeight = startWeightLbs;
      } else if (daysSinceStart >= daysToGoal) {
        // After goal date, use goal weight
        plannedWeight = goalWeightLbs;
      } else {
        // Linear interpolation between start and goal
        const progress = daysSinceStart / daysToGoal;
        plannedWeight = startWeightLbs + (goalWeightLbs - startWeightLbs) * progress;
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

    console.log('[Progress] Planned line points:', points.length, 'first:', points[0]?.weight, 'last:', points[points.length - 1]?.weight);
    return points;
  };

  // ACTUAL LINE: Solid white line through actual weightCheckIns up to the last check-in date
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

  // PROJECTED LINE: Yellow dashed line based on real and planned deficits
  const calculateProjectedLine = (startDate: Date, endDate: Date): { date: Date; weight: number }[] => {
    if (!profileData) return [];

    const { goalWeightLbs, maintenanceCalories, dailyCaloriesTarget, desiredLossRateLbsPerWeek } = profileData;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Get last known weight from check-ins
    const actualPoints = calculateActualLine(startDate, endDate);
    let lastKnown: { date: Date; weightLbs: number };

    if (actualPoints.length > 0) {
      const lastActual = actualPoints[actualPoints.length - 1];
      lastKnown = { date: lastActual.date, weightLbs: lastActual.weight };
    } else {
      // Use start date and start weight
      lastKnown = { date: new Date(profileData.startDate), weightLbs: profileData.startWeightLbs };
    }

    console.log('[Progress] Last known weight for projection:', lastKnown);

    // Calculate actual average deficit from food logs up to today
    const recentDays = 14; // Look at last 14 days
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - recentDays);

    const recentFoodLogs = foodLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= cutoffDate && logDate <= today;
    });

    let actualLossPerDay: number;
    if (recentFoodLogs.length > 0) {
      const totalDeficit = recentFoodLogs.reduce((sum, log) => {
        return sum + (maintenanceCalories - log.totalCaloriesEaten);
      }, 0);
      const actualAverageDeficit = totalDeficit / recentFoodLogs.length;
      actualLossPerDay = actualAverageDeficit / 3500; // 3500 calories per pound
      console.log('[Progress] Actual average deficit from', recentFoodLogs.length, 'days:', actualAverageDeficit, 'cal/day');
      console.log('[Progress] Actual loss per day:', actualLossPerDay, 'lbs/day');
    } else {
      // Fallback to planned deficit
      const plannedDailyDeficit = maintenanceCalories - dailyCaloriesTarget;
      actualLossPerDay = plannedDailyDeficit / 3500;
      console.log('[Progress] No food logs, using planned loss per day:', actualLossPerDay, 'lbs/day');
    }

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

    // Draw projected line from today (or last known date if in future) to projectedGoalDate
    // Only for dates > today
    const points: { date: Date; weight: number }[] = [];
    const projectionStartDate = new Date(Math.max(lastKnown.date.getTime(), today.getTime()));
    projectionStartDate.setDate(projectionStartDate.getDate() + 1); // Start from tomorrow
    projectionStartDate.setHours(0, 0, 0, 0);

    let currentDate = new Date(projectionStartDate);
    
    // If projection start is beyond our view range, skip
    if (currentDate > endDate) {
      return [];
    }

    while (currentDate <= endDate && currentDate <= projectedGoalDate) {
      const daysSinceLastKnown = Math.floor((currentDate.getTime() - lastKnown.date.getTime()) / (1000 * 60 * 60 * 24));
      let currentWeight = lastKnown.weightLbs - (actualLossPerDay * daysSinceLastKnown);
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

  const calculateYAxisRange = (plannedPoints: { date: Date; weight: number }[], actualPoints: { date: Date; weight: number }[], projectedPoints: { date: Date; weight: number }[]) => {
    if (!profileData) return { min: 0, max: 200 };

    const { goalWeightLbs, startWeightLbs } = profileData;
    const PADDING = 3; // 3 lbs padding on each side

    // Collect all weight values
    const allWeights: number[] = [];

    // Add goal weight
    allWeights.push(goalWeightLbs);

    // Add start weight
    allWeights.push(startWeightLbs);

    // Add all actual check-in weights
    actualPoints.forEach(point => {
      if (point.weight > 0 && !Number.isNaN(point.weight)) {
        allWeights.push(point.weight);
      }
    });

    // Add planned weights (for better range)
    plannedPoints.forEach(point => {
      if (point.weight > 0 && !Number.isNaN(point.weight)) {
        allWeights.push(point.weight);
      }
    });

    // Add projected weights
    projectedPoints.forEach(point => {
      if (point.weight > 0 && !Number.isNaN(point.weight)) {
        allWeights.push(point.weight);
      }
    });

    if (allWeights.length === 0) {
      return { min: goalWeightLbs - PADDING, max: startWeightLbs + PADDING };
    }

    // Calculate min and max
    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);

    // Apply padding
    const yMin = Math.floor(minWeight - PADDING);
    const yMax = Math.ceil(maxWeight + PADDING);

    console.log('[Progress] Y-axis range:', { yMin, yMax, minWeight, maxWeight });

    return { min: yMin, max: yMax };
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
      timeRange,
    });

    // Calculate Y-axis range (consistent across all zoom levels)
    const yAxisRange = calculateYAxisRange(plannedPoints, actualPoints, projectedPoints);

    // Generate a common X-axis based on the time range
    // This ensures all series use the same dates
    const allDates: Date[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[Progress] Total dates in range:', allDates.length);

    // Sample dates for display based on time range
    let sampleInterval = 1;
    let labelFormat: 'MM/dd' | 'MM/yy' | 'week' = 'MM/dd';

    if (timeRange === 'weekly') {
      sampleInterval = 1; // Show every day
      labelFormat = 'MM/dd';
    } else if (timeRange === 'monthly') {
      sampleInterval = 3; // Show every 3 days
      labelFormat = 'MM/dd';
    } else if (timeRange === '6months') {
      sampleInterval = 14; // Show every 2 weeks
      labelFormat = 'MM/dd';
    } else {
      // Custom: adjust based on range
      const daysDiff = allDates.length;
      if (daysDiff > 180) {
        sampleInterval = 14;
        labelFormat = 'MM/dd';
      } else if (daysDiff > 60) {
        sampleInterval = 7;
        labelFormat = 'MM/dd';
      } else if (daysDiff > 30) {
        sampleInterval = 3;
        labelFormat = 'MM/dd';
      } else {
        sampleInterval = 1;
        labelFormat = 'MM/dd';
      }
    }

    const sampledDates = allDates.filter((_, i) => i % sampleInterval === 0);
    
    // Generate labels from sampled dates
    const labels = sampledDates.map((date) => {
      if (labelFormat === 'week') {
        const weekNum = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return `W${weekNum}`;
      } else if (labelFormat === 'MM/yy') {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${month}/${year}`;
      } else {
        // MM/dd
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}`;
      }
    });

    console.log('[Progress] Sampled dates:', sampledDates.length, 'labels:', labels.slice(0, 5), '...');

    // Map planned points to sampled dates
    const plannedWeights = sampledDates.map(sampleDate => {
      const point = plannedPoints.find(p => {
        const pTime = p.date.getTime();
        const sTime = sampleDate.getTime();
        return Math.abs(pTime - sTime) < 1000 * 60 * 60 * 12; // Within 12 hours
      });
      return point ? point.weight : null;
    });

    // Map actual points to sampled dates
    const actualWeights = sampledDates.map(sampleDate => {
      const point = actualPoints.find(p => {
        const pTime = p.date.getTime();
        const sTime = sampleDate.getTime();
        return Math.abs(pTime - sTime) < 1000 * 60 * 60 * 12; // Within 12 hours
      });
      return point ? point.weight : null;
    });

    // Map projected points to sampled dates
    const projectedWeights = sampledDates.map(sampleDate => {
      const point = projectedPoints.find(p => {
        const pTime = p.date.getTime();
        const sTime = sampleDate.getTime();
        return Math.abs(pTime - sTime) < 1000 * 60 * 60 * 12; // Within 12 hours
      });
      return point ? point.weight : null;
    });

    console.log('[Progress] Planned weights sample:', plannedWeights.slice(0, 5));
    console.log('[Progress] Actual weights sample:', actualWeights.slice(0, 5));
    console.log('[Progress] Projected weights sample:', projectedWeights.slice(0, 5));

    // Filter out all-null datasets
    const datasets: any[] = [];

    // Always show planned
    const hasPlannedData = plannedWeights.some(w => w !== null && !Number.isNaN(w));
    if (hasPlannedData) {
      // Replace nulls with yMin to keep chart working
      datasets.push({
        data: plannedWeights.map(w => (w !== null && !Number.isNaN(w)) ? w : yAxisRange.min),
        color: () => '#5CB97B', // Green
        strokeWidth: 2,
        withDots: false,
      });
    }

    // Show actual if we have data
    const hasActualData = actualWeights.some(w => w !== null && !Number.isNaN(w));
    if (hasActualData) {
      datasets.push({
        data: actualWeights.map(w => (w !== null && !Number.isNaN(w)) ? w : yAxisRange.min),
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    // Show projected if we have data
    const hasProjectedData = projectedWeights.some(w => w !== null && !Number.isNaN(w));
    if (hasProjectedData) {
      datasets.push({
        data: projectedWeights.map(w => (w !== null && !Number.isNaN(w)) ? w : yAxisRange.min),
        color: () => '#FFD700', // Yellow
        strokeWidth: 2,
        withDots: false,
        strokeDasharray: [5, 5], // Dashed line
      });
    }

    console.log('[Progress] Datasets created:', datasets.length);

    return {
      labels,
      datasets,
      yAxisRange,
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

  // Calculate the number of segments for the Y-axis
  const yRange = chartData.yAxisRange.max - chartData.yAxisRange.min;
  const segments = Math.min(Math.max(Math.ceil(yRange / 5), 4), 8); // Between 4 and 8 segments

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
              width={Math.max(screenWidth - spacing.md * 4, chartData.labels.length * 50)}
              height={220}
              yAxisSuffix=" lb"
              yAxisInterval={1}
              segments={segments}
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
              yLabelsOffset={0}
              formatYLabel={(value) => {
                // Map the chart's internal values to our custom Y-axis range
                const numValue = parseFloat(value);
                if (Number.isNaN(numValue)) return '';
                
                const { min, max } = chartData.yAxisRange;
                
                // Get the actual data range
                const allDataValues = chartData.datasets.flatMap((d: any) => d.data.filter((v: number) => !Number.isNaN(v) && v > 0));
                if (allDataValues.length === 0) return '';
                
                const dataMin = Math.min(...allDataValues);
                const dataMax = Math.max(...allDataValues);
                
                if (dataMax === dataMin) return Math.round(min).toString();
                
                // Map the chart's value to our desired range
                const scaledValue = min + ((numValue - dataMin) / (dataMax - dataMin)) * (max - min);
                
                return Math.round(scaledValue).toString();
              }}
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
          date.setDate(date.getDate() - 9);
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
