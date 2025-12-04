
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
      console.log('[ProgressGraph] ========================================');
      console.log('[ProgressGraph] Loading progress data for range:', timeRange);
      console.log('[ProgressGraph] User profile:', userProfile);
      console.log('[ProgressGraph] Goal:', goal);

      // ===== VALIDATE REQUIRED DATA =====
      if (!userProfile || !goal) {
        console.log('[ProgressGraph] Missing user profile or goal');
        setPlannedData([]);
        setActualData([]);
        setProjectedData([]);
        setLoading(false);
        return;
      }

      // Get profile data - weights in users table are stored in user's preferred unit
      const startWeight = normalize(userProfile?.starting_weight || userProfile?.current_weight);
      const targetWeight = normalize(userProfile?.goal_weight);
      const maintenanceCalories = normalize(userProfile?.maintenance_calories) || 2500;
      const dailyCaloriesGoal = normalize(goal?.daily_calories) || 2000;
      
      // Get start date from goal
      const startDateStr = goal?.start_date;
      if (!startDateStr) {
        console.log('[ProgressGraph] No start date in goal');
        setPlannedData([]);
        setActualData([]);
        setProjectedData([]);
        setLoading(false);
        return;
      }

      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);

      console.log('[ProgressGraph] 📊 Profile data:', {
        startWeight,
        targetWeight,
        maintenanceCalories,
        dailyCaloriesGoal,
        startDate: startDate.toISOString(),
      });

      // Validate required data
      if (!startWeight || !targetWeight) {
        console.log('[ProgressGraph] ❌ Missing required weight data');
        setPlannedData([]);
        setActualData([]);
        setProjectedData([]);
        setLoading(false);
        return;
      }

      // ===== CALCULATE PLANNED DEFICIT =====
      const plannedDeficit = maintenanceCalories - dailyCaloriesGoal;
      const lbsPerDay = plannedDeficit / 3500; // 3500 kcal = 1 lb
      
      console.log('[ProgressGraph] 📈 Calculations:', {
        plannedDeficit: plannedDeficit + ' kcal/day',
        lbsPerDay: lbsPerDay + ' lbs/day',
      });

      // ===== DETERMINE DATE RANGE FOR DISPLAY =====
      let displayStartDate: Date;
      let displayEndDate: Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (timeRange === '7days') {
        displayStartDate = new Date(today);
        displayStartDate.setDate(displayStartDate.getDate() - 7);
        displayEndDate = new Date(today);
        displayEndDate.setDate(displayEndDate.getDate() + 7);
      } else if (timeRange === '30days') {
        displayStartDate = new Date(today);
        displayStartDate.setDate(displayStartDate.getDate() - 30);
        displayEndDate = new Date(today);
        displayEndDate.setDate(displayEndDate.getDate() + 30);
      } else if (timeRange === 'custom' && customRange) {
        displayStartDate = new Date(customRange.startDate);
        displayEndDate = new Date(customRange.endDate);
      } else {
        displayStartDate = new Date(today);
        displayStartDate.setDate(displayStartDate.getDate() - 30);
        displayEndDate = new Date(today);
        displayEndDate.setDate(displayEndDate.getDate() + 30);
      }

      displayStartDate.setHours(0, 0, 0, 0);
      displayEndDate.setHours(23, 59, 59, 999);

      console.log('[ProgressGraph] 📅 Display range:', displayStartDate.toISOString(), 'to', displayEndDate.toISOString());

      // ===== BUILD PLANNED LINE (GREEN SOLID) =====
      const planned: DataPoint[] = [];
      
      // Calculate how many days to reach target
      const weightDiff = startWeight - targetWeight;
      const daysToGoal = lbsPerDay > 0 ? Math.ceil(weightDiff / lbsPerDay) : 365;
      const goalEndDate = new Date(startDate);
      goalEndDate.setDate(goalEndDate.getDate() + daysToGoal);
      
      console.log('[ProgressGraph] 🎯 Goal timeline:', {
        weightDiff: weightDiff + ' lbs',
        daysToGoal,
        goalEndDate: goalEndDate.toISOString(),
      });

      // Generate planned line from start date to goal end date (or display end, whichever is later)
      const plannedEndDate = goalEndDate > displayEndDate ? goalEndDate : displayEndDate;
      let currentDate = new Date(startDate);
      
      while (currentDate <= plannedEndDate) {
        const daysSinceStart = Math.floor(
          (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        
        let plannedWeight = startWeight - (lbsPerDay * daysSinceStart);
        
        // Don't go below target weight
        if (plannedWeight < targetWeight) {
          plannedWeight = targetWeight;
        }
        
        // Only add if within display range
        if (currentDate >= displayStartDate && currentDate <= displayEndDate) {
          planned.push({
            date: new Date(currentDate),
            weight: plannedWeight,
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[ProgressGraph] ✅ Built', planned.length, 'planned data points');

      // ===== LOAD ACTUAL CHECK-INS (WHITE SOLID) =====
      // Check-ins are stored in kg, need to convert to lbs for display
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', userId)
        .not('weight', 'is', null)
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (error) {
        console.error('[ProgressGraph] ❌ Error loading check-ins:', error);
      }

      console.log('[ProgressGraph] 📦 Loaded', checkIns?.length || 0, 'check-ins from database');

      const actual: DataPoint[] = [];
      if (checkIns && checkIns.length > 0) {
        checkIns.forEach((checkIn) => {
          const checkInDate = new Date(checkIn.date);
          checkInDate.setHours(0, 0, 0, 0);
          
          const weightInKg = normalize(checkIn.weight);
          if (weightInKg !== null) {
            // Convert from kg (database storage) to lbs (display)
            const weightInLbs = weightInKg * KG_TO_LB;
            
            console.log('[ProgressGraph] ⚖️  Check-in:', checkIn.date, 'DB:', weightInKg, 'kg', '→ Display:', weightInLbs.toFixed(1), 'lbs');
            
            // Only include if within display range
            if (checkInDate >= displayStartDate && checkInDate <= displayEndDate) {
              actual.push({
                date: checkInDate,
                weight: weightInLbs,
              });
            }
          }
        });
      }

      console.log('[ProgressGraph] ✅ Built', actual.length, 'actual data points for display');

      // ===== BUILD PROJECTED LINE (YELLOW DASHED) =====
      const projected: DataPoint[] = [];

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
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      console.log('[ProgressGraph] 🍽️  Loaded', mealsData?.length || 0, 'meals for projection');

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

      console.log('[ProgressGraph] 📊 Calorie data for', caloriesByDate.size, 'days');

      // Build projected line starting from start date
      let projectionDate = new Date(startDate);
      let projectedWeight = startWeight;
      let cumulativeRealDeficit = 0;

      // Project through past and future
      while (projectionDate <= displayEndDate) {
        const dateStr = projectionDate.toISOString().split('T')[0];
        
        // Determine which deficit to use for this day
        let effectiveDeficit = plannedDeficit; // Default to planned
        
        if (caloriesByDate.has(dateStr)) {
          // Use real deficit based on logged calories
          const loggedCalories = caloriesByDate.get(dateStr)!;
          effectiveDeficit = maintenanceCalories - loggedCalories;
        }
        
        // Accumulate deficit
        cumulativeRealDeficit += effectiveDeficit;
        
        // Convert cumulative deficit to weight change (3500 kcal = 1 lb)
        const weightChange = cumulativeRealDeficit / 3500;
        projectedWeight = startWeight - weightChange;
        
        // Don't go below target weight
        if (projectedWeight < targetWeight) {
          projectedWeight = targetWeight;
        }
        
        // Only add if within display range and on or after today
        if (projectionDate >= displayStartDate && projectionDate <= displayEndDate) {
          projected.push({
            date: new Date(projectionDate),
            weight: projectedWeight,
          });
        }
        
        projectionDate.setDate(projectionDate.getDate() + 1);
      }

      console.log('[ProgressGraph] ✅ Built', projected.length, 'projected data points');
      console.log('[ProgressGraph] ========================================');

      setPlannedData(planned);
      setActualData(actual);
      setProjectedData(projected);

    } catch (error) {
      console.error('[ProgressGraph] ❌ Error in loadProgressData:', error);
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

    if (plannedData.length === 0 && actualData.length === 0 && projectedData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Set your weight goal in Profile to see progress.
          </Text>
        </View>
      );
    }

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
          yAxisSuffix=" lbs"
          yAxisInterval={1}
          segments={4}
        />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
      <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
        Projected Goal Date
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
  chartScrollContent: {
    paddingRight: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
});
