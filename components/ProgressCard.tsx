
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

interface ProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface ProfileData {
  startDate: string;
  startWeightLbs: number;
  goalWeightLbs: number;
  weeklyLossLbs: number;
}

interface CheckIn {
  date: string;
  weight: number;
}

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

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
        .select('starting_weight, goal_weight, weight_unit')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;

      // Load active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('start_date, loss_rate_lbs_per_week')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) throw goalError;

      // Load ALL check-ins for this user
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .order('date', { ascending: true });

      if (checkInsError) throw checkInsError;

      console.log('[Progress] userData:', userData);
      console.log('[Progress] goalData:', goalData);
      console.log('[Progress] checkInsData:', checkInsData?.length || 0, 'check-ins');

      if (!userData || !goalData) {
        setError('Set your start weight, goal weight and weekly loss in Profile to see the planned line.');
        setLoading(false);
        return;
      }

      // Get weight unit from profile
      const weightUnit = userData.weight_unit || 'kg';
      console.log('[Progress] weight_unit from profile:', weightUnit);

      // Convert weights to lbs if needed
      let startWeightLbs: number;
      let goalWeightLbs: number;

      if (weightUnit === 'lbs') {
        // Already in lbs, use directly
        startWeightLbs = userData.starting_weight || 0;
        goalWeightLbs = userData.goal_weight || 0;
      } else {
        // Convert from kg to lbs
        startWeightLbs = (userData.starting_weight || 0) * 2.20462;
        goalWeightLbs = (userData.goal_weight || 0) * 2.20462;
      }

      console.log('[Progress] startWeightLbs:', startWeightLbs);
      console.log('[Progress] goalWeightLbs:', goalWeightLbs);

      // Get weekly loss rate
      const weeklyLossLbs = parseFloat(goalData.loss_rate_lbs_per_week) || 1.0;

      // Validate required data
      const hasValidData = 
        typeof goalWeightLbs === 'number' && 
        !Number.isNaN(goalWeightLbs) && 
        goalWeightLbs > 0 &&
        typeof startWeightLbs === 'number' &&
        !Number.isNaN(startWeightLbs) &&
        startWeightLbs > 0 &&
        typeof weeklyLossLbs === 'number' &&
        !Number.isNaN(weeklyLossLbs) &&
        weeklyLossLbs > 0 &&
        goalData.start_date;

      if (!hasValidData) {
        console.log('[Progress] Invalid or missing data');
        setError('Set your start weight, goal weight and weekly loss in Profile to see the planned line.');
        setLoading(false);
        return;
      }

      setProfileData({
        startDate: goalData.start_date,
        startWeightLbs,
        goalWeightLbs,
        weeklyLossLbs,
      });

      // Convert check-ins to lbs if needed
      const checkInsInLbs: CheckIn[] = (checkInsData || []).map(ci => ({
        date: ci.date,
        weight: weightUnit === 'lbs' ? ci.weight : ci.weight * 2.20462,
      }));

      setCheckIns(checkInsInLbs);

      console.log('[Progress] Profile data loaded successfully');
      setLoading(false);
    } catch (err: any) {
      console.error('[Progress] Error loading data:', err);
      setError(err.message || 'Failed to load progress data');
      setLoading(false);
    }
  };

  // Compute the complete date range: from first check-in (or start date) to today
  const dateRange = useMemo(() => {
    if (!profileData) {
      return null;
    }

    const planStartDate = new Date(profileData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;

    // If there are check-ins, use the earliest check-in date or plan start date, whichever is earlier
    if (checkIns.length > 0) {
      const firstCheckInDate = new Date(checkIns[0].date);
      startDate = firstCheckInDate < planStartDate ? firstCheckInDate : planStartDate;
    } else {
      // No check-ins, use plan start date
      startDate = planStartDate;
    }

    return { startDate, endDate: today };
  }, [profileData, checkIns]);

  // Compute planned line data points
  const plannedData = useMemo(() => {
    if (!profileData || !dateRange) {
      return null;
    }

    const { startDate, endDate } = dateRange;
    const { startWeightLbs, goalWeightLbs, weeklyLossLbs } = profileData;

    console.log('[Progress] Computing planned line with:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      startWeightLbs,
      goalWeightLbs,
      weeklyLossLbs,
    });

    // Calculate total weight to lose (can be positive or negative)
    const totalToLose = startWeightLbs - goalWeightLbs;
    
    // Calculate weeks needed
    const weeksPlanned = Math.abs(totalToLose / weeklyLossLbs);
    
    // Calculate goal date
    const planStartDate = new Date(profileData.startDate);
    const daysToGoal = Math.round(weeksPlanned * 7);
    const goalDatePlanned = new Date(planStartDate);
    goalDatePlanned.setDate(goalDatePlanned.getDate() + daysToGoal);

    console.log('[Progress] Planned timeline:', {
      totalToLose,
      weeksPlanned,
      daysToGoal,
      goalDatePlanned: goalDatePlanned.toISOString().split('T')[0],
    });

    // Generate daily data points from startDate to endDate (today)
    const dataPoints: { date: Date; weightLbs: number }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Linear interpolation
      let plannedWeight: number;
      if (daysToGoal > 0) {
        const progress = daysSinceStart / daysToGoal;
        plannedWeight = startWeightLbs + (goalWeightLbs - startWeightLbs) * progress;
        
        // Clamp to goal weight if we've passed the goal date
        if (currentDate > goalDatePlanned) {
          plannedWeight = goalWeightLbs;
        }
      } else {
        plannedWeight = goalWeightLbs;
      }
      
      dataPoints.push({
        date: new Date(currentDate),
        weightLbs: plannedWeight,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[Progress] Generated', dataPoints.length, 'planned data points');
    console.log('[Progress] First point:', dataPoints[0]);
    console.log('[Progress] Last point:', dataPoints[dataPoints.length - 1]);

    return dataPoints;
  }, [profileData, dateRange]);

  // Compute actual line data points from check-ins
  const actualData = useMemo(() => {
    if (!dateRange || checkIns.length === 0) {
      return null;
    }

    const { startDate, endDate } = dateRange;

    // Filter check-ins within the date range
    const filteredCheckIns = checkIns.filter(ci => {
      const ciDate = new Date(ci.date);
      return ciDate >= startDate && ciDate <= endDate;
    });

    if (filteredCheckIns.length === 0) {
      return null;
    }

    console.log('[Progress] Actual data points:', filteredCheckIns.length);

    return filteredCheckIns.map(ci => ({
      date: new Date(ci.date),
      weightLbs: ci.weight,
    }));
  }, [checkIns, dateRange]);

  // Prepare chart data for rendering
  const prepareChartData = () => {
    if (!profileData || !plannedData || plannedData.length === 0 || !dateRange) {
      return null;
    }

    const { startDate, endDate } = dateRange;
    
    console.log('[Progress] Visible range (complete history):', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    // Calculate Y-axis range based on all weights with padding
    const allWeights: number[] = [...plannedData.map(p => p.weightLbs)];
    
    if (actualData && actualData.length > 0) {
      allWeights.push(...actualData.map(a => a.weightLbs));
    }
    
    allWeights.push(profileData.goalWeightLbs, profileData.startWeightLbs);
    
    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    
    const padding = 3;
    const yMin = Math.max(0, minWeight - padding);
    const yMax = maxWeight + padding;

    console.log('[Progress] Y-axis range:', { yMin, yMax });

    // Determine optimal number of labels based on total days
    const totalDays = plannedData.length;
    let numLabels: number;
    let labelFormat: 'MM/dd' | 'MM/yy' | 'MMM';
    
    if (totalDays <= 14) {
      // 2 weeks or less: show every 1-2 days
      numLabels = Math.min(7, totalDays);
      labelFormat = 'MM/dd';
    } else if (totalDays <= 60) {
      // 2 months or less: show every 5-7 days
      numLabels = Math.min(10, Math.ceil(totalDays / 5));
      labelFormat = 'MM/dd';
    } else if (totalDays <= 180) {
      // 6 months or less: show every 2-3 weeks
      numLabels = Math.min(10, Math.ceil(totalDays / 14));
      labelFormat = 'MM/yy';
    } else {
      // More than 6 months: 8-10 labels evenly spaced
      numLabels = Math.min(10, Math.max(8, Math.ceil(totalDays / 30)));
      labelFormat = 'MM/yy';
    }

    // Calculate sampling interval to get desired number of labels
    const sampleInterval = Math.max(1, Math.floor(totalDays / numLabels));

    // Create labels with proper date formatting
    const labels = plannedData.map((point, i) => {
      // Show label at regular intervals and always show first and last
      if (i % sampleInterval === 0 || i === plannedData.length - 1) {
        const month = (point.date.getMonth() + 1).toString().padStart(2, '0');
        const day = point.date.getDate().toString().padStart(2, '0');
        const year = point.date.getFullYear().toString().slice(-2);
        
        if (labelFormat === 'MM/dd') {
          return `${month}/${day}`;
        } else if (labelFormat === 'MM/yy') {
          return `${month}/${year}`;
        } else {
          // MMM format
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return monthNames[point.date.getMonth()];
        }
      }
      return '';
    });

    // Create datasets
    const datasets: any[] = [
      {
        data: plannedData.map(p => p.weightLbs),
        color: () => '#4CAF50', // Green for planned
        strokeWidth: 2,
        withDots: false,
      },
    ];

    // Add actual data if available
    if (actualData && actualData.length > 0) {
      // Map actual data points to the same x-axis as planned data
      const actualWeights = plannedData.map(plannedPoint => {
        const matchingCheckIn = actualData.find(
          a => a.date.toISOString().split('T')[0] === plannedPoint.date.toISOString().split('T')[0]
        );
        return matchingCheckIn ? matchingCheckIn.weightLbs : null;
      });

      // Only add actual line if there are non-null values
      if (actualWeights.some(w => w !== null)) {
        datasets.push({
          data: actualWeights.map(w => w === null ? 0 : w), // Chart library needs numbers, we'll handle nulls with dots
          color: () => '#2196F3', // Blue for actual
          strokeWidth: 2,
          withDots: true,
        });
      }
    }

    console.log('[Progress] Chart data prepared:', {
      totalDays,
      numLabels,
      labelFormat,
      sampleInterval,
      visibleLabels: labels.filter(l => l !== '').length,
      dataPoints: plannedData.length,
      actualPoints: actualData?.length || 0,
    });

    return {
      labels,
      datasets,
      yMin,
      yMax,
    };
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

  if (!chartData) {
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
          <Text style={[styles.errorText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No data available. Start logging your weight to see progress!
          </Text>
        </View>
      </View>
    );
  }

  // Fixed width - always use screen width minus padding
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - (spacing.md * 4);

  return (
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

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
            Planned
          </Text>
        </View>
        {actualData && actualData.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#2196F3' }]} />
            <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
              Actual
            </Text>
          </View>
        )}
      </View>

      {/* Chart - Fixed width, no scrolling */}
      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: chartData.labels,
            datasets: chartData.datasets,
          }}
          width={chartWidth}
          height={220}
          yAxisSuffix=" lb"
          chartConfig={{
            backgroundColor: isDark ? colors.cardDark : colors.card,
            backgroundGradientFrom: isDark ? colors.cardDark : colors.card,
            backgroundGradientTo: isDark ? colors.cardDark : colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => isDark 
              ? `rgba(241, 245, 249, ${opacity})` 
              : `rgba(43, 45, 66, ${opacity})`,
            style: {
              borderRadius: borderRadius.md,
            },
            propsForDots: {
              r: '3',
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
          segments={5}
          yAxisInterval={1}
          formatYLabel={(value) => {
            const numValue = parseFloat(value);
            if (Number.isNaN(numValue)) return '';
            return Math.round(numValue).toString();
          }}
        />
      </View>

      {/* Y-axis label */}
      <Text style={[styles.yAxisLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
        Weight (lbs)
      </Text>
    </View>
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
