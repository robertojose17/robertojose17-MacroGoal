
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
  startDate: Date;
  startWeightLbs: number;
  goalWeightLbs: number;
  weeklyLossLbs: number;
}

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ProgressCard] Loading profile data for user:', userId);

      // Load user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('starting_weight, goal_weight, weight_unit')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('[ProgressCard] Error loading user data:', userError);
        throw userError;
      }

      // Load active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('start_date, loss_rate_lbs_per_week')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[ProgressCard] Error loading goal data:', goalError);
        throw goalError;
      }

      console.log('[ProgressCard] userData:', userData);
      console.log('[ProgressCard] goalData:', goalData);

      // Validate required data
      if (!userData || !goalData || !goalData.start_date) {
        console.log('[ProgressCard] Missing required profile data');
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      // Get weight unit from profile
      const weightUnit = userData.weight_unit || 'kg';
      console.log('[ProgressCard] weight_unit from profile:', weightUnit);

      // Convert weights to lbs if needed
      let startWeightLbs: number;
      let goalWeightLbs: number;

      if (weightUnit === 'lbs') {
        startWeightLbs = userData.starting_weight || 0;
        goalWeightLbs = userData.goal_weight || 0;
      } else {
        // Convert from kg to lbs
        startWeightLbs = (userData.starting_weight || 0) * 2.20462;
        goalWeightLbs = (userData.goal_weight || 0) * 2.20462;
      }

      console.log('[ProgressCard] startWeightLbs:', startWeightLbs);
      console.log('[ProgressCard] goalWeightLbs:', goalWeightLbs);

      // Get weekly loss rate (default to 1.0 if not set)
      const weeklyLossLbs = parseFloat(goalData.loss_rate_lbs_per_week) || 1.0;

      // Validate all required fields
      const hasValidData =
        typeof goalWeightLbs === 'number' &&
        !Number.isNaN(goalWeightLbs) &&
        goalWeightLbs > 0 &&
        typeof startWeightLbs === 'number' &&
        !Number.isNaN(startWeightLbs) &&
        startWeightLbs > 0 &&
        typeof weeklyLossLbs === 'number' &&
        !Number.isNaN(weeklyLossLbs) &&
        weeklyLossLbs > 0;

      if (!hasValidData) {
        console.log('[ProgressCard] Invalid weight or loss rate data');
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      const startDate = new Date(goalData.start_date);
      
      setProfileData({
        startDate,
        startWeightLbs,
        goalWeightLbs,
        weeklyLossLbs,
      });

      console.log('[ProgressCard] Profile data loaded successfully:', {
        startDate: startDate.toISOString().split('T')[0],
        startWeightLbs,
        goalWeightLbs,
        weeklyLossLbs,
      });

      setLoading(false);
    } catch (err: any) {
      console.error('[ProgressCard] Error loading profile data:', err);
      setError('Failed to load progress data');
      setLoading(false);
    }
  };

  // Calculate planned weight data points
  const plannedData = useMemo(() => {
    if (!profileData) {
      return null;
    }

    const { startDate, startWeightLbs, goalWeightLbs, weeklyLossLbs } = profileData;

    console.log('[ProgressCard] Computing planned line with:', {
      startDate: startDate.toISOString().split('T')[0],
      startWeightLbs,
      goalWeightLbs,
      weeklyLossLbs,
    });

    // Calculate total weight to lose (can be positive for loss, negative for gain)
    const totalToLose = startWeightLbs - goalWeightLbs;

    // Calculate weeks needed to reach goal
    const weeksNeeded = Math.abs(totalToLose / weeklyLossLbs);

    // Calculate goal date
    const daysToGoal = Math.round(weeksNeeded * 7);
    const goalDate = new Date(startDate);
    goalDate.setDate(goalDate.getDate() + daysToGoal);

    console.log('[ProgressCard] Planned timeline:', {
      totalToLose,
      weeksNeeded,
      daysToGoal,
      goalDate: goalDate.toISOString().split('T')[0],
    });

    // Generate daily data points from startDate to goalDate
    const dataPoints: { date: Date; weightLbs: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= goalDate) {
      const daysSinceStart = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Linear interpolation
      let plannedWeight: number;
      if (daysToGoal > 0) {
        const progress = daysSinceStart / daysToGoal;
        plannedWeight = startWeightLbs + (goalWeightLbs - startWeightLbs) * progress;
      } else {
        plannedWeight = goalWeightLbs;
      }

      dataPoints.push({
        date: new Date(currentDate),
        weightLbs: plannedWeight,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[ProgressCard] Generated', dataPoints.length, 'planned data points');
    console.log('[ProgressCard] First point:', {
      date: dataPoints[0].date.toISOString().split('T')[0],
      weight: dataPoints[0].weightLbs.toFixed(1),
    });
    console.log('[ProgressCard] Last point:', {
      date: dataPoints[dataPoints.length - 1].date.toISOString().split('T')[0],
      weight: dataPoints[dataPoints.length - 1].weightLbs.toFixed(1),
    });

    return dataPoints;
  }, [profileData]);

  // Prepare chart data for rendering with optimized X-axis labels
  const chartData = useMemo(() => {
    if (!profileData || !plannedData || plannedData.length === 0) {
      return null;
    }

    const { startWeightLbs, goalWeightLbs } = profileData;

    // Calculate Y-axis range with padding
    const minWeight = Math.min(startWeightLbs, goalWeightLbs);
    const maxWeight = Math.max(startWeightLbs, goalWeightLbs);

    const padding = 3;
    const yMin = Math.max(0, minWeight - padding);
    const yMax = maxWeight + padding;

    console.log('[ProgressCard] Y-axis range:', { yMin, yMax });

    // ========================================
    // NEW X-AXIS LABEL LOGIC
    // ========================================
    const totalPoints = plannedData.length;
    const maxXTicks = 6; // Maximum number of labels to show

    console.log('[ProgressCard] Total data points:', totalPoints);
    console.log('[ProgressCard] Max X ticks:', maxXTicks);

    // Determine which indices to show labels for
    let selectedIndices: number[];
    
    if (totalPoints <= maxXTicks) {
      // If we have fewer points than max ticks, show all
      selectedIndices = Array.from({ length: totalPoints }, (_, i) => i);
    } else {
      // Calculate step size to evenly distribute labels
      const step = Math.floor(totalPoints / (maxXTicks - 1));
      selectedIndices = [0]; // Always include first
      
      // Add intermediate labels
      for (let i = 1; i < maxXTicks - 1; i++) {
        selectedIndices.push(i * step);
      }
      
      // Always include last
      selectedIndices.push(totalPoints - 1);
    }

    console.log('[ProgressCard] Selected label indices:', selectedIndices);

    // Determine date format based on total range
    const totalDays = totalPoints;
    let labelFormat: 'MM/dd' | 'MM/yy';
    
    if (totalDays <= 60) {
      labelFormat = 'MM/dd';
    } else {
      labelFormat = 'MM/yy';
    }

    console.log('[ProgressCard] Using label format:', labelFormat);

    // Create labels array - empty strings for non-selected indices
    const labels = plannedData.map((point, index) => {
      if (selectedIndices.includes(index)) {
        const month = (point.date.getMonth() + 1).toString().padStart(2, '0');
        const day = point.date.getDate().toString().padStart(2, '0');
        const year = point.date.getFullYear().toString().slice(-2);

        if (labelFormat === 'MM/dd') {
          return `${month}/${day}`;
        } else {
          return `${month}/${year}`;
        }
      }
      return ''; // Empty string for non-selected indices
    });

    // Create dataset for planned line
    const datasets = [
      {
        data: plannedData.map(p => p.weightLbs),
        color: () => colors.success, // Green for planned
        strokeWidth: 2,
        withDots: false,
      },
    ];

    console.log('[ProgressCard] Chart data prepared:', {
      totalDays,
      labelFormat,
      selectedIndices: selectedIndices.length,
      visibleLabels: labels.filter(l => l !== '').length,
      dataPoints: plannedData.length,
      firstLabel: labels[selectedIndices[0]],
      lastLabel: labels[selectedIndices[selectedIndices.length - 1]],
    });

    return {
      labels,
      datasets,
      yMin,
      yMax,
    };
  }, [profileData, plannedData]);

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
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
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
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
          <Text
            style={[
              styles.errorText,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (!chartData) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Progress
        </Text>
        <View style={styles.errorContainer}>
          <Text
            style={[
              styles.errorText,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            Set your weight goal in Profile to see progress.
          </Text>
        </View>
      </View>
    );
  }

  // Fixed width - always use screen width minus padding
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing.md * 4;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Progress
        </Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
            Planned
          </Text>
        </View>
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
            color: (opacity = 1) => `rgba(92, 185, 123, ${opacity})`, // colors.success
            labelColor: (opacity = 1) =>
              isDark
                ? `rgba(241, 245, 249, ${opacity})`
                : `rgba(43, 45, 66, ${opacity})`,
            style: {
              borderRadius: borderRadius.md,
            },
            propsForDots: {
              r: '0', // No dots
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
      <Text
        style={[
          styles.yAxisLabel,
          { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
        ]}
      >
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
