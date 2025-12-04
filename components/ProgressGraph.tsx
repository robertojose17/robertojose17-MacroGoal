
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

interface DataPoint {
  date: Date;
  weight: number;
}

const KG_TO_LB = 2.20462;

// Normalize weight - ensure no NaN or null values
const normalize = (w: any): number | null => {
  if (w === null || w === undefined || w === '') return null;
  const num = Number(w);
  return Number.isNaN(num) ? null : num;
};

export default function ProgressGraph({ userId, userProfile, goal }: ProgressGraphProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [plannedData, setPlannedData] = useState<DataPoint[]>([]);
  const [actualData, setActualData] = useState<DataPoint[]>([]);
  const [projectedData, setProjectedData] = useState<DataPoint[]>([]);

  useEffect(() => {
    loadProgressData();
  }, [timeRange, customRange, userId, userProfile, goal]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      console.log('[ProgressGraph] Loading progress data for range:', timeRange);
      console.log('[ProgressGraph] User profile:', userProfile);
      console.log('[ProgressGraph] Goal:', goal);

      // ===== VALIDATE REQUIRED DATA =====
      if (!userProfile) {
        console.log('[ProgressGraph] No user profile available');
        setPlannedData([]);
        setActualData([]);
        setProjectedData([]);
        setLoading(false);
        return;
      }

      // Get weight unit from profile (weight_unit field)
      const weightUnit = userProfile?.weight_unit || 'kg';
      console.log('[ProgressGraph] Weight unit from profile:', weightUnit);

      // Get profile data - all weights in the users table are stored in the user's preferred unit
      const currentWeight = normalize(userProfile?.current_weight);
      const targetWeight = normalize(userProfile?.goal_weight);
      const startingWeight = normalize(userProfile?.starting_weight);
      const maintenanceCalories = normalize(userProfile?.maintenance_calories) || 2500;
      
      console.log('[ProgressGraph] Profile weights:', {
        currentWeight,
        targetWeight,
        startingWeight,
        weightUnit,
        maintenanceCalories,
      });

      // Validate required data
      if (!currentWeight || !targetWeight) {
        console.log('[ProgressGraph] Missing required weight data - showing placeholder');
        setPlannedData([]);
        setActualData([]);
        setProjectedData([]);
        setLoading(false);
        return;
      }

      // Get goal data
      const dailyCalories = normalize(goal?.daily_calories) || 2000;
      const startDate = goal?.start_date ? new Date(goal.start_date) : new Date();
      startDate.setHours(0, 0, 0, 0);

      console.log('[ProgressGraph] Goal data:', {
        startDate: startDate.toISOString(),
        dailyCalories,
      });

      // Calculate daily deficit and weight loss per day
      const dailyDeficit = maintenanceCalories - dailyCalories;
      const caloriesPerUnit = weightUnit === 'lbs' ? 3500 : 7700; // 3500 cal per lb, 7700 cal per kg
      const weightLossPerDay = dailyDeficit / caloriesPerUnit;

      console.log('[ProgressGraph] Calculations:', {
        dailyDeficit: dailyDeficit + ' kcal',
        caloriesPerUnit,
        weightLossPerDay: weightLossPerDay + ' ' + weightUnit + '/day',
      });

      // Use starting weight if available, otherwise use current weight
      let effectiveStartingWeight = startingWeight || currentWeight;

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

      // Make sure display range starts at or after goal start date
      if (displayStartDate < startDate) {
        displayStartDate = new Date(startDate);
      }

      console.log('[ProgressGraph] Display range:', displayStartDate.toISOString(), 'to', displayEndDate.toISOString());

      // ===== BUILD PLANNED LINE (GREEN) =====
      const planned: DataPoint[] = [];
      let currentDate = new Date(displayStartDate);
      
      // Calculate how far into the future to project the planned line
      const weightDiff = effectiveStartingWeight - targetWeight;
      const daysToGoal = weightLossPerDay > 0 ? Math.ceil(weightDiff / weightLossPerDay) : 365;
      const goalEndDate = new Date(startDate);
      goalEndDate.setDate(goalEndDate.getDate() + daysToGoal);
      
      // Extend planned line to either goal end date or 30 days into future, whichever is later
      const futureExtension = new Date();
      futureExtension.setDate(futureExtension.getDate() + 30);
      const plannedEndDate = goalEndDate > futureExtension ? goalEndDate : futureExtension;

      while (currentDate <= plannedEndDate && currentDate <= new Date(displayEndDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        const daysSinceStart = Math.floor(
          (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        
        let plannedWeight = effectiveStartingWeight - (weightLossPerDay * daysSinceStart);
        
        // Don't go below target weight
        if (plannedWeight < targetWeight) {
          plannedWeight = targetWeight;
        }
        
        // Only add if within or slightly beyond display range
        if (currentDate >= displayStartDate) {
          planned.push({
            date: new Date(currentDate),
            weight: plannedWeight,
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[ProgressGraph] Built', planned.length, 'planned data points');

      // ===== LOAD ACTUAL CHECK-INS (WHITE) =====
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
      }

      console.log('[ProgressGraph] Loaded', checkIns?.length || 0, 'check-ins from database');

      // Convert check-ins to data points
      // IMPORTANT: Check-ins are stored in kg in the database
      const actual: DataPoint[] = [];
      if (checkIns && checkIns.length > 0) {
        checkIns.forEach((checkIn) => {
          const checkInDate = new Date(checkIn.date);
          checkInDate.setHours(0, 0, 0, 0);
          
          const weightInKg = normalize(checkIn.weight);
          if (weightInKg !== null) {
            // Convert from kg (database storage) to user's preferred unit
            let convertedWeight: number;
            if (weightUnit === 'lbs') {
              convertedWeight = weightInKg * KG_TO_LB;
            } else {
              convertedWeight = weightInKg;
            }
            
            console.log('[ProgressGraph] Check-in:', checkIn.date, 'DB:', weightInKg, 'kg', '→ Display:', convertedWeight, weightUnit);
            
            // Only include if within display range
            if (checkInDate >= displayStartDate && checkInDate <= displayEndDate) {
              actual.push({
                date: checkInDate,
                weight: convertedWeight,
              });
            }
          }
        });
      }

      console.log('[ProgressGraph] Built', actual.length, 'actual data points for display');

      // ===== BUILD PROJECTED LINE (YELLOW DASHED) =====
      const projected: DataPoint[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only project if we have actual data
      if (actual.length > 0) {
        // Get the last actual weight
        const lastActual = actual[actual.length - 1];
        let lastActualWeight = lastActual.weight;
        let lastActualDate = new Date(lastActual.date);

        // Load meals data to calculate real deficit
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

        console.log('[ProgressGraph] Loaded', mealsData?.length || 0, 'meals for projection');

        // Calculate daily calories by date
        const caloriesByDate = new Map<string, number>();
        if (mealsData) {
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
        }

        // Project from today forward
        let projectionDate = new Date(today);
        projectionDate.setDate(projectionDate.getDate() + 1); // Start from tomorrow
        let projectedWeight = lastActualWeight;

        // Project up to 60 days into the future or until target weight is reached
        const maxProjectionDays = 60;
        let daysProjected = 0;

        while (daysProjected < maxProjectionDays && projectedWeight > targetWeight) {
          const dateStr = projectionDate.toISOString().split('T')[0];
          
          // Determine which deficit to use
          let effectiveDeficitPerDay = weightLossPerDay; // Default to planned
          
          // Check if we have calorie data for recent days to estimate real deficit
          const recentDays = 7;
          let recentCaloriesTotal = 0;
          let recentCaloriesDays = 0;
          
          for (let i = 0; i < recentDays; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const checkDateStr = checkDate.toISOString().split('T')[0];
            
            if (caloriesByDate.has(checkDateStr)) {
              recentCaloriesTotal += caloriesByDate.get(checkDateStr)!;
              recentCaloriesDays++;
            }
          }
          
          if (recentCaloriesDays > 0) {
            // Use real deficit based on recent logged calories
            const avgDailyCalories = recentCaloriesTotal / recentCaloriesDays;
            const realDailyDeficit = maintenanceCalories - avgDailyCalories;
            effectiveDeficitPerDay = realDailyDeficit / caloriesPerUnit;
            
            if (daysProjected === 0) {
              console.log('[ProgressGraph] Using real deficit for projection:', realDailyDeficit, 'kcal/day =', effectiveDeficitPerDay, weightUnit + '/day');
            }
          }
          
          projectedWeight -= effectiveDeficitPerDay;
          
          // Don't project below target weight
          if (projectedWeight < targetWeight) {
            projectedWeight = targetWeight;
          }
          
          // Only add if within or slightly beyond display range
          if (projectionDate >= displayStartDate) {
            projected.push({
              date: new Date(projectionDate),
              weight: projectedWeight,
            });
          }
          
          projectionDate.setDate(projectionDate.getDate() + 1);
          daysProjected++;
        }

        console.log('[ProgressGraph] Built', projected.length, 'projected data points');
      }

      setPlannedData(planned);
      setActualData(actual);
      setProjectedData(projected);

    } catch (error) {
      console.error('[ProgressGraph] Error in loadProgressData:', error);
      setPlannedData([]);
      setActualData([]);
      setProjectedData([]);
    } finally {
      setLoading(false);
    }
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

    if (plannedData.length === 0 && actualData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Set your profile to see progress
          </Text>
          <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Complete your profile with start date, current weight, and goal weight.
          </Text>
        </View>
      );
    }

    // Get weight unit for display
    const weightUnit = userProfile?.weight_unit || 'kg';

    // Combine all data points to create a unified timeline
    const allDates = new Set<number>();
    plannedData.forEach(p => allDates.add(p.date.getTime()));
    actualData.forEach(a => allDates.add(a.date.getTime()));
    projectedData.forEach(p => allDates.add(p.date.getTime()));

    const sortedDates = Array.from(allDates).sort((a, b) => a - b);

    if (sortedDates.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Not enough data yet
          </Text>
        </View>
      );
    }

    // Create labels (show every Nth date to avoid crowding)
    const labelInterval = Math.max(1, Math.floor(sortedDates.length / 8));
    const labels = sortedDates.map((timestamp, index) => {
      if (index % labelInterval === 0 || index === sortedDates.length - 1) {
        const date = new Date(timestamp);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}`;
      }
      return '';
    });

    // Create data arrays aligned with sortedDates
    const plannedDataMap = new Map(plannedData.map(p => [p.date.getTime(), p.weight]));
    const actualDataMap = new Map(actualData.map(a => [a.date.getTime(), a.weight]));
    const projectedDataMap = new Map(projectedData.map(p => [p.date.getTime(), p.weight]));

    const plannedValues = sortedDates.map(timestamp => {
      const weight = plannedDataMap.get(timestamp);
      return weight !== undefined ? weight : NaN;
    });

    const actualValues = sortedDates.map(timestamp => {
      const weight = actualDataMap.get(timestamp);
      return weight !== undefined ? weight : NaN;
    });

    const projectedValues = sortedDates.map(timestamp => {
      const weight = projectedDataMap.get(timestamp);
      return weight !== undefined ? weight : NaN;
    });

    // Get all valid weight values to determine min/max
    const allWeights: number[] = [];
    [...plannedValues, ...actualValues, ...projectedValues].forEach(w => {
      if (!Number.isNaN(w)) allWeights.push(w);
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

    // Planned line (green solid)
    if (plannedValues.some(v => !Number.isNaN(v))) {
      datasets.push({
        data: plannedValues,
        color: () => '#5CB97B', // Green
        strokeWidth: 2,
        withDots: false,
      });
    }

    // Actual line (white with small dots)
    if (actualValues.some(v => !Number.isNaN(v))) {
      datasets.push({
        data: actualValues,
        color: () => '#FFFFFF', // White
        strokeWidth: 2,
        withDots: true,
      });
    }

    // Projected line (yellow dashed)
    if (projectedValues.some(v => !Number.isNaN(v))) {
      datasets.push({
        data: projectedValues,
        color: () => '#FFEA70', // Yellow
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        withDots: false,
      });
    }

    const screenWidth = Dimensions.get('window').width - (spacing.md * 2) - (spacing.lg * 2);
    const minChartWidth = Math.max(screenWidth, sortedDates.length * 40);

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
          width={minChartWidth}
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
            7 Days
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
            30 Days
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
