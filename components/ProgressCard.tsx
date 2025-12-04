
import React, { useState, useEffect, useMemo } from 'react';
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
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = '1W' | '1M' | '6M' | 'All';

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

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

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

      console.log('[Progress] userData:', userData);
      console.log('[Progress] goalData:', goalData);

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

      console.log('[Progress] Profile data loaded successfully');
      setLoading(false);
    } catch (err: any) {
      console.error('[Progress] Error loading data:', err);
      setError(err.message || 'Failed to load progress data');
      setLoading(false);
    }
  };

  // Compute planned line data points
  const plannedData = useMemo(() => {
    if (!profileData) {
      return null;
    }

    const { startDate, startWeightLbs, goalWeightLbs, weeklyLossLbs } = profileData;

    console.log('[Progress] Computing planned line with:', {
      startDate,
      startWeightLbs,
      goalWeightLbs,
      weeklyLossLbs,
    });

    // Calculate total weight to lose (can be positive or negative)
    const totalToLose = startWeightLbs - goalWeightLbs;
    
    // Calculate weeks needed
    const weeksPlanned = Math.abs(totalToLose / weeklyLossLbs);
    
    // Calculate goal date
    const planStartDate = new Date(startDate);
    const daysToGoal = Math.round(weeksPlanned * 7);
    const goalDatePlanned = new Date(planStartDate);
    goalDatePlanned.setDate(goalDatePlanned.getDate() + daysToGoal);

    console.log('[Progress] Planned timeline:', {
      totalToLose,
      weeksPlanned,
      daysToGoal,
      goalDatePlanned: goalDatePlanned.toISOString().split('T')[0],
    });

    // Generate daily data points from start to goal
    const dataPoints: { date: Date; weightLbs: number }[] = [];
    const currentDate = new Date(planStartDate);
    
    while (currentDate <= goalDatePlanned) {
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Linear interpolation
      const progress = daysToGoal > 0 ? daysSinceStart / daysToGoal : 0;
      const plannedWeight = startWeightLbs + (goalWeightLbs - startWeightLbs) * progress;
      
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
  }, [profileData]);

  // Get visible date range based on selected time range
  const getVisibleRange = (): { startDate: Date; endDate: Date } => {
    if (!profileData || !plannedData || plannedData.length === 0) {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: weekAgo, endDate: today };
    }

    const planStartDate = new Date(profileData.startDate);
    const planEndDate = plannedData[plannedData.length - 1].date;
    const today = new Date();

    let startDate: Date;
    let endDate = new Date(Math.max(today.getTime(), planEndDate.getTime()));

    switch (timeRange) {
      case '1W':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6); // 7 days total
        break;
      case '1M':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29); // 30 days total
        break;
      case '6M':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 179); // 180 days total
        break;
      case 'All':
        startDate = new Date(planStartDate);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
    }

    // Don't go before plan start
    if (startDate < planStartDate) {
      startDate = new Date(planStartDate);
    }

    return { startDate, endDate };
  };

  // Prepare chart data for rendering
  const prepareChartData = () => {
    if (!profileData || !plannedData || plannedData.length === 0) {
      return null;
    }

    const { startDate, endDate } = getVisibleRange();
    
    console.log('[Progress] Visible range:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    // Filter planned data to visible range
    const visiblePlannedData = plannedData.filter(
      point => point.date >= startDate && point.date <= endDate
    );

    if (visiblePlannedData.length === 0) {
      return null;
    }

    console.log('[Progress] Visible planned points:', visiblePlannedData.length);

    // Calculate Y-axis range
    const allWeights = visiblePlannedData.map(p => p.weightLbs);
    const minWeight = Math.min(...allWeights, profileData.goalWeightLbs);
    const maxWeight = Math.max(...allWeights, profileData.startWeightLbs);
    
    const padding = 3;
    const yMin = Math.max(0, minWeight - padding);
    const yMax = maxWeight + padding;

    console.log('[Progress] Y-axis range:', { yMin, yMax });

    // Determine label sampling interval
    let sampleInterval = 1;
    const totalDays = visiblePlannedData.length;
    
    if (timeRange === '1W') {
      sampleInterval = 1; // Every day
    } else if (timeRange === '1M') {
      sampleInterval = 3; // Every 3 days
    } else if (timeRange === '6M') {
      sampleInterval = 14; // Every 2 weeks
    } else {
      // All: adjust based on total days
      if (totalDays > 365) {
        sampleInterval = 30;
      } else if (totalDays > 180) {
        sampleInterval = 14;
      } else if (totalDays > 60) {
        sampleInterval = 7;
      } else if (totalDays > 30) {
        sampleInterval = 3;
      } else {
        sampleInterval = 1;
      }
    }

    // Create labels
    const labels = visiblePlannedData.map((point, i) => {
      if (i % sampleInterval === 0 || i === visiblePlannedData.length - 1) {
        const month = (point.date.getMonth() + 1).toString().padStart(2, '0');
        const day = point.date.getDate().toString().padStart(2, '0');
        return `${month}/${day}`;
      }
      return '';
    });

    // Create dataset
    const plannedWeights = visiblePlannedData.map(p => p.weightLbs);

    console.log('[Progress] Chart data prepared:', {
      labels: labels.filter(l => l !== '').length,
      dataPoints: plannedWeights.length,
      firstWeight: plannedWeights[0],
      lastWeight: plannedWeights[plannedWeights.length - 1],
    });

    return {
      labels,
      datasets: [
        {
          data: plannedWeights,
          color: () => '#4CAF50', // Green for planned
          strokeWidth: 2,
          withDots: false,
        },
      ],
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
            No data available for the selected time range.
          </Text>
        </View>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - spacing.md * 4, chartData.labels.length * 40);

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

      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {(['1W', '1M', '6M', 'All'] as TimeRange[]).map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              timeRange === range && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.rangeButtonText,
                { color: timeRange === range ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) },
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#4CAF50' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
            Planned
          </Text>
        </View>
      </View>

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                r: '0',
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
      </ScrollView>

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
