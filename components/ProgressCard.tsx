
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
import { supabase } from '@/app/integrations/supabase/client';

type TimeRange = '1W' | '1M' | '6M' | '1Y' | 'All';

interface ProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface CheckInData {
  date: string;
  weight: number;
}

interface ProfileData {
  startDate: string;
  startWeight: number;
  goalWeight: number;
  weeklyLossLbs: number;
}

export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);

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
        .select('starting_weight, current_weight, goal_weight, weight_unit')
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
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      // Get weight unit from profile
      const weightUnit = userData.weight_unit || 'kg';
      console.log('[Progress] weight_unit from profile:', weightUnit);

      // Convert weights to lbs if needed
      let startWeight: number;
      let goalWeight: number;

      if (weightUnit === 'lbs') {
        // Already in lbs, use directly
        startWeight = userData.starting_weight || userData.current_weight || 0;
        goalWeight = userData.goal_weight || 0;
      } else {
        // Convert from kg to lbs
        startWeight = (userData.starting_weight || userData.current_weight || 0) * 2.20462;
        goalWeight = (userData.goal_weight || 0) * 2.20462;
      }

      console.log('[Progress] startWeight (lbs):', startWeight);
      console.log('[Progress] goalWeight (lbs):', goalWeight);

      // Get weekly loss rate
      const weeklyLossLbs = parseFloat(goalData.loss_rate_lbs_per_week) || 1.0;

      // Guard: Check if we have valid goal data
      const hasGoal = 
        typeof goalWeight === 'number' && 
        !Number.isNaN(goalWeight) && 
        goalWeight > 0 &&
        typeof startWeight === 'number' &&
        !Number.isNaN(startWeight) &&
        startWeight > 0 &&
        typeof weeklyLossLbs === 'number' &&
        !Number.isNaN(weeklyLossLbs) &&
        weeklyLossLbs > 0;

      if (!hasGoal) {
        console.log('[Progress] Invalid goal weight or start weight or weekly loss rate');
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      setProfileData({
        startDate: goalData.start_date || new Date().toISOString().split('T')[0],
        startWeight,
        goalWeight,
        weeklyLossLbs,
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
        const weightInLbs = parseFloat(ci.weight) * 2.20462;
        return {
          date: ci.date,
          weight: weightInLbs,
        };
      }).filter(ci => !Number.isNaN(ci.weight) && ci.weight > 0);

      console.log('[Progress] Check-ins loaded:', checkInsLbs.length);
      console.log('[Progress] Check-ins data:', checkInsLbs);
      setCheckIns(checkInsLbs);

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

    if (!profileData) {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate: today };
    }

    const planStartDate = new Date(profileData.startDate);

    switch (timeRange) {
      case '1W':
        startDate.setDate(startDate.getDate() - 6); // 7 days total
        break;
      case '1M':
        startDate.setDate(startDate.getDate() - 29); // 30 days total
        break;
      case '6M':
        startDate.setDate(startDate.getDate() - 179); // 180 days total
        break;
      case '1Y':
        startDate.setDate(startDate.getDate() - 364); // 365 days total
        break;
      case 'All':
        startDate = new Date(planStartDate);
        break;
    }

    // Don't go before plan start date
    if (startDate < planStartDate) {
      startDate = new Date(planStartDate);
    }

    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate: today };
  };

  const prepareChartData = () => {
    if (!profileData) {
      return null;
    }

    const { startDate, endDate } = getDateRange();
    const { startWeight, goalWeight, weeklyLossLbs } = profileData;
    const planStartDate = new Date(profileData.startDate);

    console.log('[Progress] Preparing chart data for range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

    // Calculate planned goal date
    const totalToLose = Math.abs(startWeight - goalWeight);
    const weeksPlanned = totalToLose / weeklyLossLbs;
    const daysToGoal = weeksPlanned * 7;
    
    const goalDatePlanned = new Date(planStartDate);
    goalDatePlanned.setDate(goalDatePlanned.getDate() + daysToGoal);

    console.log('[Progress] Planned goal date:', goalDatePlanned.toISOString().split('T')[0], 'in', daysToGoal, 'days');

    // Generate all dates in the range
    const allDates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('[Progress] Total dates in range:', allDates.length);

    // Calculate planned weights for each date
    const plannedWeights: (number | null)[] = allDates.map(date => {
      const daysSinceStart = Math.floor((date.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceStart < 0) {
        return null; // Before plan start
      } else if (daysSinceStart >= daysToGoal) {
        return goalWeight; // After goal date
      } else {
        // Linear interpolation
        const progress = daysSinceStart / daysToGoal;
        return startWeight + (goalWeight - startWeight) * progress;
      }
    });

    // ===== FIX: Filter check-ins to ONLY those within the current view range =====
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const checkInsInRange = checkIns.filter(ci => {
      return ci.date >= startDateStr && ci.date <= endDateStr;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('[Progress] Check-ins in current view range:', checkInsInRange.length);
    console.log('[Progress] Check-ins in range:', checkInsInRange);

    // ===== FIX: Map actual check-ins to dates - ONLY real check-ins, no fake values =====
    const actualWeights: (number | null)[] = allDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const checkIn = checkInsInRange.find(ci => ci.date === dateStr);
      return checkIn ? checkIn.weight : null;
    });

    console.log('[Progress] Planned weights (first 5):', plannedWeights.slice(0, 5));
    console.log('[Progress] Actual weights (first 5):', actualWeights.slice(0, 5));
    console.log('[Progress] Planned weights (last 5):', plannedWeights.slice(-5));
    console.log('[Progress] Actual weights (last 5):', actualWeights.slice(-5));

    // ===== Calculate Y-axis range based on ALL relevant weights =====
    const allRelevantWeights: number[] = [];
    
    // Add start weight and goal weight
    allRelevantWeights.push(startWeight);
    allRelevantWeights.push(goalWeight);
    
    // Add all planned weights in the current view
    plannedWeights.forEach(w => { 
      if (w !== null && !Number.isNaN(w)) {
        allRelevantWeights.push(w);
      }
    });
    
    // Add all actual check-in weights in the current view
    actualWeights.forEach(w => { 
      if (w !== null && !Number.isNaN(w)) {
        allRelevantWeights.push(w);
      }
    });

    console.log('[Progress] All relevant weights collected:', allRelevantWeights.length);

    // Compute min and max
    const maxWeight = Math.max(...allRelevantWeights);
    const minWeight = Math.min(...allRelevantWeights);

    console.log('[Progress] Raw min/max:', minWeight, maxWeight);

    // Add padding (3-5 lbs)
    const padding = 3;
    let yMax = maxWeight + padding;
    let yMin = minWeight - padding;

    // Clamp yMin to never go below 0
    yMin = Math.max(0, yMin);

    console.log('[Progress] Y-axis range with padding:', yMin, 'to', yMax, 'lbs');

    // ===== Create datasets =====
    const datasets: any[] = [];

    // Planned line (green)
    const hasPlannedData = plannedWeights.some(w => w !== null && !Number.isNaN(w));
    if (hasPlannedData) {
      // For the chart library, we need continuous data
      // Fill nulls with the nearest valid value or yMin
      const plannedData = plannedWeights.map((w, i) => {
        if (w !== null && !Number.isNaN(w)) {
          return w;
        }
        // Find the nearest non-null value
        for (let j = i + 1; j < plannedWeights.length; j++) {
          if (plannedWeights[j] !== null && !Number.isNaN(plannedWeights[j]!)) {
            return plannedWeights[j]!;
          }
        }
        return yMin;
      });

      datasets.push({
        data: plannedData,
        color: () => '#4CAF50', // Green
        strokeWidth: 2,
        withDots: false,
      });
    }

    // ===== FIX: Actual line - based ONLY on real check-ins =====
    const actualCheckInsCount = checkInsInRange.length;
    console.log('[Progress] Actual check-ins count in range:', actualCheckInsCount);

    if (actualCheckInsCount === 0) {
      // No check-ins in range - show "No data yet" message
      console.log('[Progress] No check-ins in range, will show "No data yet" message');
    } else if (actualCheckInsCount === 1) {
      // Exactly 1 check-in - render a single dot
      console.log('[Progress] Exactly 1 check-in, rendering single dot');
      
      // Create a dataset with the single point
      // We need to provide data for all dates, but only the check-in date will have a dot
      const actualData = actualWeights.map(w => {
        if (w !== null && !Number.isNaN(w)) {
          return w;
        }
        // Use NaN for missing data so the chart library doesn't connect lines
        return NaN;
      });

      datasets.push({
        data: actualData,
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    } else if (actualCheckInsCount >= 2) {
      // 2 or more check-ins - draw a continuous line connecting them
      console.log('[Progress] 2+ check-ins, drawing continuous line');
      
      // Create a dataset that connects only the actual check-in points
      // For dates without check-ins, we use NaN so the line doesn't connect through gaps
      const actualData = actualWeights.map(w => {
        if (w !== null && !Number.isNaN(w)) {
          return w;
        }
        // Use NaN for missing data
        return NaN;
      });

      datasets.push({
        data: actualData,
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    console.log('[Progress] Datasets created:', datasets.length);
    console.log('[Progress] Has planned data:', hasPlannedData);
    console.log('[Progress] Actual check-ins in range:', actualCheckInsCount);

    // Sample dates for labels based on time range
    let sampleInterval = 1;
    if (timeRange === '1W') {
      sampleInterval = 1; // Every day
    } else if (timeRange === '1M') {
      sampleInterval = 3; // Every 3 days
    } else if (timeRange === '6M') {
      sampleInterval = 14; // Every 2 weeks
    } else if (timeRange === '1Y') {
      sampleInterval = 30; // Every month
    } else {
      // All: adjust based on total days
      const totalDays = allDates.length;
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

    const labels = allDates.map((date, i) => {
      if (i % sampleInterval === 0 || i === allDates.length - 1) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}`;
      }
      return '';
    });

    console.log('[Progress] Labels (sample):', labels.filter(l => l !== '').slice(0, 10));

    return {
      labels,
      datasets,
      yMin,
      yMax,
      actualCheckInsCount,
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

  if (!chartData || chartData.datasets.length === 0) {
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
        {(['1W', '1M', '6M', '1Y', 'All'] as TimeRange[]).map(range => (
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
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#FFFFFF' }]} />
          <Text style={[styles.legendText, { color: isDark ? colors.textDark : colors.text }]}>
            Actual
          </Text>
        </View>
      </View>

      {/* No data message for Actual line */}
      {chartData.actualCheckInsCount === 0 && (
        <View style={styles.noActualDataContainer}>
          <Text style={[styles.noActualDataText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No weight check-ins yet in this time range. Add check-ins to see your actual progress!
          </Text>
        </View>
      )}

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
  noActualDataContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  noActualDataText: {
    ...typography.caption,
    textAlign: 'center',
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
