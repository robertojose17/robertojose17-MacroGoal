
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Line, Path, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
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

    // Calculate total weight change needed
    const totalWeightChange = Math.abs(goalWeightLbs - startWeightLbs);
    
    // Calculate total weeks needed to reach goal
    const totalWeeks = totalWeightChange / weeklyLossLbs;
    
    // Calculate total days needed (inclusive of start and end date)
    const totalDays = Math.ceil(totalWeeks * 7);
    
    // Calculate the goal date
    const goalDate = new Date(startDate);
    goalDate.setDate(goalDate.getDate() + totalDays);

    console.log('[ProgressCard] Calculated goal date:', {
      totalWeightChange,
      totalWeeks: totalWeeks.toFixed(2),
      totalDays,
      goalDate: goalDate.toISOString().split('T')[0],
    });

    // Generate daily data points from start date to goal date (inclusive)
    const dataPoints: { date: Date; weightLbs: number }[] = [];

    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);

      // Linear interpolation: weight = startWeight + (goalWeight - startWeight) * (i / totalDays)
      const weight = startWeightLbs + (goalWeightLbs - startWeightLbs) * (i / totalDays);

      dataPoints.push({
        date: currentDate,
        weightLbs: weight,
      });
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

  // Prepare chart data with custom SVG rendering
  const chartConfig = useMemo(() => {
    if (!profileData || !plannedData || plannedData.length === 0) {
      return null;
    }

    const { startWeightLbs, goalWeightLbs } = profileData;

    // ========================================
    // CHART DIMENSIONS - INDEPENDENT CONTROL
    // ========================================
    const screenWidth = Dimensions.get('window').width;
    const cardPadding = spacing.lg * 2;
    
    // Y-axis configuration (left side)
    const yAxisWidth = 55; // Space for "189 lb" labels
    const yAxisLabelPadding = 8;
    
    // X-axis configuration (bottom)
    const xAxisHeight = 30;
    const xAxisLabelPadding = 8;
    
    // Top padding to prevent label cutoff
    const topPadding = 16; // Extra space at the top for the highest label
    
    // Chart area dimensions
    const chartAreaWidth = screenWidth - cardPadding - yAxisWidth - 20; // 20 for right padding
    const chartAreaHeight = 220;
    
    const totalWidth = screenWidth - cardPadding;
    const totalHeight = chartAreaHeight + xAxisHeight + topPadding;

    console.log('[ProgressCard] Chart dimensions:', {
      screenWidth,
      totalWidth,
      totalHeight,
      chartAreaWidth,
      chartAreaHeight,
      yAxisWidth,
      xAxisHeight,
      topPadding,
    });

    // ========================================
    // Y-AXIS CONFIGURATION (Weight in lbs)
    // ========================================
    const minWeight = Math.min(startWeightLbs, goalWeightLbs);
    const maxWeight = Math.max(startWeightLbs, goalWeightLbs);
    const weightPadding = 3;
    const yMin = Math.max(0, minWeight - weightPadding);
    const yMax = maxWeight + weightPadding;
    const yRange = yMax - yMin;

    // Generate Y-axis labels (6 evenly spaced ticks)
    const numYTicks = 6;
    const yTicks: { value: number; label: string; y: number }[] = [];
    
    for (let i = 0; i < numYTicks; i++) {
      const value = yMax - (yRange * i / (numYTicks - 1));
      const y = topPadding + (chartAreaHeight * i / (numYTicks - 1));
      yTicks.push({
        value,
        label: `${Math.round(value)} lb`,
        y,
      });
    }

    console.log('[ProgressCard] Y-axis ticks:', yTicks);

    // ========================================
    // X-AXIS CONFIGURATION (Dates in MM/DD format)
    // ========================================
    const totalPoints = plannedData.length;
    const numXTicks = 6; // Show 6 date labels

    // Select evenly distributed indices for X-axis labels
    const xTickIndices: number[] = [];
    if (totalPoints <= numXTicks) {
      // Show all points if we have fewer than max ticks
      for (let i = 0; i < totalPoints; i++) {
        xTickIndices.push(i);
      }
    } else {
      // Evenly distribute ticks
      for (let i = 0; i < numXTicks; i++) {
        const index = Math.round((totalPoints - 1) * i / (numXTicks - 1));
        xTickIndices.push(index);
      }
    }

    const xTicks: { index: number; label: string; x: number }[] = xTickIndices.map((index) => {
      const point = plannedData[index];
      const month = (point.date.getMonth() + 1).toString().padStart(2, '0');
      const day = point.date.getDate().toString().padStart(2, '0');
      const x = yAxisWidth + (chartAreaWidth * index / (totalPoints - 1));
      
      return {
        index,
        label: `${month}/${day}`,
        x,
      };
    });

    console.log('[ProgressCard] X-axis ticks:', xTicks);

    // ========================================
    // GENERATE LINE PATH
    // ========================================
    const pathPoints = plannedData.map((point, index) => {
      const x = yAxisWidth + (chartAreaWidth * index / (totalPoints - 1));
      const normalizedWeight = (point.weightLbs - yMin) / yRange;
      const y = topPadding + (chartAreaHeight * (1 - normalizedWeight));
      return { x, y };
    });

    // Create SVG path string
    let pathData = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      pathData += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }

    // Create filled area path (for gradient under the line)
    const chartBottom = topPadding + chartAreaHeight;
    let fillPathData = `M ${pathPoints[0].x} ${chartBottom}`;
    fillPathData += ` L ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      fillPathData += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    fillPathData += ` L ${pathPoints[pathPoints.length - 1].x} ${chartBottom}`;
    fillPathData += ' Z';

    console.log('[ProgressCard] Generated path with', pathPoints.length, 'points');

    return {
      totalWidth,
      totalHeight,
      chartAreaWidth,
      chartAreaHeight,
      yAxisWidth,
      xAxisHeight,
      topPadding,
      yTicks,
      xTicks,
      pathData,
      fillPathData,
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

  if (!chartConfig) {
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

  const labelColor = isDark ? colors.textDark : colors.text;
  const gridColor = isDark ? colors.borderDark : colors.border;
  const lineColor = colors.success;

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

      {/* Custom SVG Chart with Independent Axis Control */}
      <View style={styles.chartContainer}>
        <Svg width={chartConfig.totalWidth} height={chartConfig.totalHeight}>
          <Defs>
            <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines */}
          {chartConfig.yTicks.map((tick, index) => (
            <Line
              key={`grid-h-${index}`}
              x1={chartConfig.yAxisWidth}
              y1={tick.y}
              x2={chartConfig.yAxisWidth + chartConfig.chartAreaWidth}
              y2={tick.y}
              stroke={gridColor}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Filled area under the line */}
          <Path
            d={chartConfig.fillPathData}
            fill="url(#lineGradient)"
          />

          {/* Planned line */}
          <Path
            d={chartConfig.pathData}
            stroke={lineColor}
            strokeWidth="2.5"
            fill="none"
          />

          {/* Y-axis labels (Weight in lbs) - INDEPENDENT CONTROL */}
          {chartConfig.yTicks.map((tick, index) => (
            <SvgText
              key={`y-label-${index}`}
              x={chartConfig.yAxisWidth - 8}
              y={tick.y + 4}
              fontSize="11"
              fill={labelColor}
              textAnchor="end"
            >
              {tick.label}
            </SvgText>
          ))}

          {/* X-axis labels (Dates in MM/DD) - INDEPENDENT CONTROL */}
          {chartConfig.xTicks.map((tick, index) => (
            <SvgText
              key={`x-label-${index}`}
              x={tick.x}
              y={chartConfig.topPadding + chartConfig.chartAreaHeight + 20}
              fontSize="10"
              fill={labelColor}
              textAnchor="middle"
            >
              {tick.label}
            </SvgText>
          ))}
        </Svg>
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
    marginBottom: spacing.sm,
    overflow: 'visible',
    alignItems: 'center',
  },
  yAxisLabel: {
    ...typography.caption,
    textAlign: 'center',
    fontSize: 11,
    marginTop: spacing.xs,
  },
});
