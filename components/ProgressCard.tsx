
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Svg, { Line, Path, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';

interface ProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface ProfileData {
  startDate: Date;
  startWeightLbs: number;
  goalWeightLbs: number;
  weeklyLossLbs: number;
  maintenanceCalories: number;
  dailyCalories: number;
}

interface CalorieLog {
  date: Date;
  calories: number;
}

interface WeightCheckIn {
  date: Date;
  weightLbs: number;
}

// ─── Small reusable stat card ────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  bigText: string;
  subtitle?: string;
  subline?: string;
  bigColor?: string;
  fullWidth?: boolean;
  tintBg?: boolean;
  isDark: boolean;
  animValue?: Animated.Value;
}

function StatCard({
  label,
  bigText,
  subtitle,
  subline,
  bigColor,
  fullWidth,
  tintBg,
  isDark,
  animValue,
}: StatCardProps) {
  const bgColor = tintBg
    ? (isDark ? colors.primary + '22' : colors.primary + '15')
    : (isDark ? 'rgba(255,255,255,0.07)' : '#F8F8F8');

  const textColor = isDark ? colors.textDark : colors.text;
  const grayColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <View
      style={[
        statStyles.card,
        fullWidth && statStyles.fullWidth,
        {
          backgroundColor: bgColor,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
      ]}
    >
      <Text style={[statStyles.label, { color: grayColor }]}>{label}</Text>
      <Text style={[statStyles.bigNumber, { color: bigColor ?? textColor }]}>{bigText}</Text>
      {subtitle ? <Text style={[statStyles.subtitle, { color: grayColor }]}>{subtitle}</Text> : null}
      {subline ? <Text style={[statStyles.subline, { color: grayColor }]}>{subline}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    flex: 1,
  },
  fullWidth: {
    flex: 0,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  subline: {
    fontSize: 12,
    marginTop: 4,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProgressCard({ userId, isDark }: ProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>([]);
  const [actualWeightPoints, setActualWeightPoints] = useState<WeightCheckIn[]>([]);

  // ── View toggle ──────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<'graph' | 'stats'>('graph');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchView = useCallback((view: 'graph' | 'stats') => {
    if (view === activeView) return;
    console.log('[ProgressCard] Switching view to:', view);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setActiveView(view);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [activeView, fadeAnim]);

  // ── Graph dataset toggles ────────────────────────────────────────────────
  const [showPlannedLine, setShowPlannedLine] = useState(true);
  const [showCalorieProjectionLine, setShowCalorieProjectionLine] = useState(true);
  const [showActualWeightDots, setShowActualWeightDots] = useState(true);

  // ── Stats count-up animations ────────────────────────────────────────────
  const countUpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeView === 'stats') {
      countUpAnim.setValue(0);
      Animated.timing(countUpAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [activeView, countUpAnim]);

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ProgressCard] Loading profile data for user:', userId);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('starting_weight, goal_weight, weight_unit, maintenance_calories, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('[ProgressCard] Error loading user data:', userError);
        throw userError;
      }

      let goalData = null;

      const { data: activeGoalData, error: activeGoalError } = await supabase
        .from('goals')
        .select('start_date, loss_rate_lbs_per_week, daily_calories, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1);

      if (activeGoalError) {
        console.error('[ProgressCard] Error loading active goal data:', activeGoalError);
      } else {
        console.log('[ProgressCard] Active goal query returned:', activeGoalData?.length || 0, 'rows');
      }

      if (activeGoalData && activeGoalData.length > 0) {
        goalData = activeGoalData[0];
        console.log('[ProgressCard] Found active goal:', goalData);
      } else {
        console.log('[ProgressCard] No active goal found, falling back to most recent goal');
        const { data: recentGoalData, error: recentGoalError } = await supabase
          .from('goals')
          .select('start_date, loss_rate_lbs_per_week, daily_calories, is_active')
          .eq('user_id', userId)
          .order('start_date', { ascending: false })
          .limit(1);

        if (recentGoalError) {
          console.error('[ProgressCard] Error loading recent goal data:', recentGoalError);
        } else {
          console.log('[ProgressCard] Recent goal query returned:', recentGoalData?.length || 0, 'rows');
        }

        if (recentGoalData && recentGoalData.length > 0) {
          goalData = recentGoalData[0];
          console.log('[ProgressCard] Found most recent goal:', goalData);
        }
      }

      console.log('[ProgressCard] === RAW SUPABASE DATA ===');
      console.log('[ProgressCard] userData:', JSON.stringify(userData, null, 2));
      console.log('[ProgressCard] goalData:', JSON.stringify(goalData, null, 2));

      if (!userData) {
        console.log('[ProgressCard] No user data found');
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      const rawStartingWeight = userData.starting_weight;
      const rawGoalWeight = userData.goal_weight;
      const parsedStartingWeight = parseFloat(rawStartingWeight);
      const parsedGoalWeight = parseFloat(rawGoalWeight);

      console.log('[ProgressCard] parsedStartingWeight:', parsedStartingWeight);
      console.log('[ProgressCard] parsedGoalWeight:', parsedGoalWeight);

      if (!rawGoalWeight || isNaN(parsedGoalWeight) || parsedGoalWeight <= 0) {
        console.log('[ProgressCard] Goal weight is missing or invalid:', rawGoalWeight);
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      if (!rawStartingWeight || isNaN(parsedStartingWeight) || parsedStartingWeight <= 0) {
        console.log('[ProgressCard] Starting weight is missing or invalid:', rawStartingWeight);
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      const rawWeightUnit = userData.weight_unit;
      let normalizedWeightUnit = 'lbs';

      if (rawWeightUnit) {
        const unitLower = rawWeightUnit.toLowerCase().trim();
        if (['lb', 'lbs', 'pound', 'pounds'].includes(unitLower)) {
          normalizedWeightUnit = 'lbs';
        } else if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(unitLower)) {
          normalizedWeightUnit = 'kg';
        }
      }

      let startWeightLbs: number;
      let goalWeightLbs: number;

      if (normalizedWeightUnit === 'kg') {
        startWeightLbs = parsedStartingWeight * 2.20462;
        goalWeightLbs = parsedGoalWeight * 2.20462;
      } else {
        startWeightLbs = parsedStartingWeight;
        goalWeightLbs = parsedGoalWeight;
      }

      let startDate: Date;

      if (goalData && goalData.start_date) {
        startDate = new Date(goalData.start_date + 'T00:00:00');
      } else if (userData.created_at) {
        startDate = new Date(userData.created_at);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      const rawLossRate = goalData?.loss_rate_lbs_per_week;
      const weeklyLossLbs = parseFloat(rawLossRate) || 1.0;
      const maintenanceCalories = userData.maintenance_calories || 2000;
      const dailyCalories = goalData?.daily_calories || maintenanceCalories || 2000;

      const hasValidData =
        !isNaN(startWeightLbs) && startWeightLbs > 0 &&
        !isNaN(goalWeightLbs) && goalWeightLbs > 0 &&
        !isNaN(weeklyLossLbs) && weeklyLossLbs > 0;

      if (!hasValidData) {
        console.log('[ProgressCard] Invalid weight or loss rate data after conversion');
        setError('Set your weight goal in Profile to see progress.');
        setLoading(false);
        return;
      }

      setProfileData({
        startDate,
        startWeightLbs,
        goalWeightLbs,
        weeklyLossLbs,
        maintenanceCalories,
        dailyCalories,
      });

      console.log('[ProgressCard] Profile data loaded successfully');

      await loadCalorieLogs(userId, startDate);
      await loadWeightCheckIns(userId, startDate, normalizedWeightUnit);

      setLoading(false);
    } catch (err: any) {
      console.error('[ProgressCard] Error loading profile data:', err);
      setError('Failed to load progress data');
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfileData();
  }, [userId, loadProfileData]);

  const loadCalorieLogs = async (uid: string, startDate: Date) => {
    try {
      const today = new Date();
      const startDateStr = startDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      console.log('[ProgressCard] Loading calorie logs from', startDateStr, 'to', todayStr);

      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`date, meal_items ( calories )`)
        .eq('user_id', uid)
        .gte('date', startDateStr)
        .lte('date', todayStr);

      if (mealsError) {
        console.error('[ProgressCard] Error loading calorie logs:', mealsError);
        return;
      }

      console.log('[ProgressCard] Meals data returned:', mealsData?.length || 0, 'meals');

      const caloriesByDate: { [key: string]: number } = {};

      if (mealsData && mealsData.length > 0) {
        mealsData.forEach((meal: any) => {
          if (meal.meal_items) {
            meal.meal_items.forEach((item: any) => {
              if (!caloriesByDate[meal.date]) caloriesByDate[meal.date] = 0;
              caloriesByDate[meal.date] += item.calories || 0;
            });
          }
        });
      }

      const logs: CalorieLog[] = Object.entries(caloriesByDate).map(([dateStr, cals]) => ({
        date: new Date(dateStr + 'T00:00:00'),
        calories: cals,
      }));

      console.log('[ProgressCard] Calorie logs loaded:', logs.length, 'days with data');
      setCalorieLogs(logs);
    } catch (err: any) {
      console.error('[ProgressCard] Error loading calorie logs:', err);
    }
  };

  const loadWeightCheckIns = async (uid: string, startDate: Date, weightUnit: string) => {
    try {
      const today = new Date();
      const startDateStr = startDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      console.log('[ProgressCard] Loading weight check-ins from', startDateStr, 'to', todayStr);

      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('date, weight')
        .eq('user_id', uid)
        .gte('date', startDateStr)
        .lte('date', todayStr)
        .not('weight', 'is', null)
        .order('date', { ascending: true });

      if (checkInsError) {
        console.error('[ProgressCard] Error loading weight check-ins:', checkInsError);
        return;
      }

      console.log('[ProgressCard] Weight check-ins returned:', checkInsData?.length || 0, 'entries');

      if (!checkInsData || checkInsData.length === 0) {
        setActualWeightPoints([]);
        return;
      }

      const weightPoints: WeightCheckIn[] = checkInsData.map((checkIn: any) => ({
        date: new Date(checkIn.date + 'T00:00:00'),
        weightLbs: checkIn.weight * 2.20462,
      }));

      console.log('[ProgressCard] Weight check-ins loaded:', weightPoints.length, 'points');
      setActualWeightPoints(weightPoints);
    } catch (err: any) {
      console.error('[ProgressCard] Error loading weight check-ins:', err);
    }
  };

  // ── Planned line data ────────────────────────────────────────────────────
  const plannedData = useMemo(() => {
    if (!profileData) return null;

    const { startDate, startWeightLbs, goalWeightLbs, weeklyLossLbs } = profileData;
    const totalWeightChange = Math.abs(goalWeightLbs - startWeightLbs);
    const totalWeeks = totalWeightChange / weeklyLossLbs;
    const totalDays = Math.ceil(totalWeeks * 7);

    const dataPoints: { date: Date; weightLbs: number }[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const weight = startWeightLbs + (goalWeightLbs - startWeightLbs) * (i / totalDays);
      dataPoints.push({ date: currentDate, weightLbs: weight });
    }

    console.log('[ProgressCard] Generated', dataPoints.length, 'planned data points');
    return dataPoints;
  }, [profileData]);

  // ── Calorie projection data ──────────────────────────────────────────────
  const calorieProjectionData = useMemo(() => {
    if (!profileData || !plannedData || plannedData.length === 0) return null;

    const { weeklyLossLbs, dailyCalories } = profileData;
    const logsByDate: { [key: string]: number } = {};
    calorieLogs.forEach((log) => {
      logsByDate[log.date.toISOString().split('T')[0]] = log.calories;
    });

    const plannedDailyCalories = dailyCalories;
    let cumulativeDeviation = 0;
    const projectionPoints: { date: Date; weightLbs: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < plannedData.length; i++) {
      const plannedPoint = plannedData[i];
      const currentDate = new Date(plannedPoint.date);
      currentDate.setHours(0, 0, 0, 0);
      const dateStr = currentDate.toISOString().split('T')[0];

      if (currentDate <= today) {
        const actualCalories = logsByDate[dateStr];
        if (actualCalories !== undefined && actualCalories !== null) {
          const delta = actualCalories - plannedDailyCalories;
          cumulativeDeviation += delta / 3500;
        }
      }

      projectionPoints.push({
        date: currentDate,
        weightLbs: plannedPoint.weightLbs + cumulativeDeviation,
      });
    }

    console.log('[ProgressCard] Generated', projectionPoints.length, 'projection points, final deviation:', cumulativeDeviation.toFixed(4));
    return projectionPoints;
  }, [profileData, plannedData, calorieLogs]);

  // ── Chart config ─────────────────────────────────────────────────────────
  const chartConfig = useMemo(() => {
    if (!profileData || !plannedData || plannedData.length === 0) return null;

    const { startWeightLbs, goalWeightLbs } = profileData;
    const screenWidth = Dimensions.get('window').width;
    const cardPadding = spacing.lg * 2;
    const yAxisWidth = 55;
    const xAxisHeight = 30;
    const topPadding = 16;
    const chartAreaWidth = screenWidth - cardPadding - yAxisWidth - 20;
    const chartAreaHeight = 220;
    const totalWidth = screenWidth - cardPadding;
    const totalHeight = chartAreaHeight + xAxisHeight + topPadding;

    let minWeight = Math.min(startWeightLbs, goalWeightLbs);
    let maxWeight = Math.max(startWeightLbs, goalWeightLbs);

    if (calorieProjectionData && calorieProjectionData.length > 0) {
      const ws = calorieProjectionData.map(p => p.weightLbs);
      minWeight = Math.min(minWeight, ...ws);
      maxWeight = Math.max(maxWeight, ...ws);
    }

    if (actualWeightPoints && actualWeightPoints.length > 0) {
      const ws = actualWeightPoints.map(p => p.weightLbs);
      minWeight = Math.min(minWeight, ...ws);
      maxWeight = Math.max(maxWeight, ...ws);
    }

    const weightPadding = 3;
    const yMin = Math.max(0, minWeight - weightPadding);
    const yMax = maxWeight + weightPadding;
    const yRange = yMax - yMin;

    const numYTicks = 6;
    const yTicks: { value: number; label: string; y: number }[] = [];
    for (let i = 0; i < numYTicks; i++) {
      const value = yMax - (yRange * i / (numYTicks - 1));
      const y = topPadding + (chartAreaHeight * i / (numYTicks - 1));
      yTicks.push({ value, label: `${Math.round(value)} lb`, y });
    }

    const totalPoints = plannedData.length;
    const numXTicks = 6;
    const xTickIndices: number[] = [];
    if (totalPoints <= numXTicks) {
      for (let i = 0; i < totalPoints; i++) xTickIndices.push(i);
    } else {
      for (let i = 0; i < numXTicks; i++) {
        xTickIndices.push(Math.round((totalPoints - 1) * i / (numXTicks - 1)));
      }
    }

    const xTicks = xTickIndices.map((index) => {
      const point = plannedData[index];
      const month = (point.date.getMonth() + 1).toString().padStart(2, '0');
      const day = point.date.getDate().toString().padStart(2, '0');
      return { index, label: `${month}/${day}`, x: yAxisWidth + (chartAreaWidth * index / (totalPoints - 1)) };
    });

    const plannedPathPoints = plannedData.map((point, index) => ({
      x: yAxisWidth + (chartAreaWidth * index / (totalPoints - 1)),
      y: topPadding + (chartAreaHeight * (1 - (point.weightLbs - yMin) / yRange)),
    }));

    let plannedPathData = `M ${plannedPathPoints[0].x} ${plannedPathPoints[0].y}`;
    for (let i = 1; i < plannedPathPoints.length; i++) {
      plannedPathData += ` L ${plannedPathPoints[i].x} ${plannedPathPoints[i].y}`;
    }

    const chartBottom = topPadding + chartAreaHeight;
    let fillPathData = `M ${plannedPathPoints[0].x} ${chartBottom}`;
    fillPathData += ` L ${plannedPathPoints[0].x} ${plannedPathPoints[0].y}`;
    for (let i = 1; i < plannedPathPoints.length; i++) {
      fillPathData += ` L ${plannedPathPoints[i].x} ${plannedPathPoints[i].y}`;
    }
    fillPathData += ` L ${plannedPathPoints[plannedPathPoints.length - 1].x} ${chartBottom} Z`;

    let projectionPathData: string | null = null;
    if (calorieProjectionData && calorieProjectionData.length > 0) {
      const pts = calorieProjectionData.map((point, index) => ({
        x: yAxisWidth + (chartAreaWidth * index / (totalPoints - 1)),
        y: topPadding + (chartAreaHeight * (1 - (point.weightLbs - yMin) / yRange)),
      }));
      projectionPathData = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) projectionPathData += ` L ${pts[i].x} ${pts[i].y}`;
    }

    const actualWeightCircles: { x: number; y: number; weightLbs: number }[] = [];
    if (actualWeightPoints && actualWeightPoints.length > 0) {
      actualWeightPoints.forEach((point) => {
        let closestIndex = 0;
        let minDiff = Math.abs(point.date.getTime() - plannedData[0].date.getTime());
        for (let i = 1; i < plannedData.length; i++) {
          const diff = Math.abs(point.date.getTime() - plannedData[i].date.getTime());
          if (diff < minDiff) { minDiff = diff; closestIndex = i; }
        }
        actualWeightCircles.push({
          x: yAxisWidth + (chartAreaWidth * closestIndex / (totalPoints - 1)),
          y: topPadding + (chartAreaHeight * (1 - (point.weightLbs - yMin) / yRange)),
          weightLbs: point.weightLbs,
        });
      });
    }

    return {
      totalWidth, totalHeight, chartAreaWidth, chartAreaHeight,
      yAxisWidth, xAxisHeight, topPadding,
      yTicks, xTicks,
      pathData: plannedPathData, fillPathData, projectionPathData,
      actualWeightCircles, yMin, yMax,
    };
  }, [profileData, plannedData, calorieProjectionData, actualWeightPoints]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!profileData || !plannedData || plannedData.length === 0) return null;

    const { startWeightLbs, goalWeightLbs, startDate, dailyCalories } = profileData;
    const totalDays = plannedData.length - 1;

    // Weight lost
    const latestWeight = actualWeightPoints.length > 0
      ? actualWeightPoints[actualWeightPoints.length - 1].weightLbs
      : null;
    const weightLost = latestWeight !== null ? startWeightLbs - latestWeight : null;

    // Current pace (last 14 days of check-ins)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const recentPoints = actualWeightPoints.filter(p => p.date >= fourteenDaysAgo);
    let currentPaceLbsPerWeek: number | null = null;
    if (recentPoints.length >= 2) {
      const first = recentPoints[0];
      const last = recentPoints[recentPoints.length - 1];
      const daysDiff = (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24);
      const weeksDiff = daysDiff / 7;
      currentPaceLbsPerWeek = weeksDiff > 0 ? (first.weightLbs - last.weightLbs) / weeksDiff : null;
    }

    // Adherence
    const logsByDate: { [key: string]: number } = {};
    calorieLogs.forEach(log => {
      logsByDate[log.date.toISOString().split('T')[0]] = log.calories;
    });
    const trackedDays = calorieLogs.length;
    const adherentDays = calorieLogs.filter(log => {
      const lower = dailyCalories * 0.85;
      const upper = dailyCalories * 1.15;
      return log.calories >= lower && log.calories <= upper;
    }).length;
    const adherencePct = trackedDays > 0 ? Math.round((adherentDays / trackedDays) * 100) : null;

    // Cumulative calorie deviation → days ahead/behind
    let cumulativeCalDev = 0;
    calorieLogs.forEach(log => {
      cumulativeCalDev += log.calories - dailyCalories;
    });
    const daysDeviation = dailyCalories > 0 ? cumulativeCalDev / dailyCalories : 0;
    // positive = surplus = behind plan; negative = deficit = ahead of plan
    const daysAhead = -daysDeviation; // positive means ahead

    // Planned goal date
    const plannedGoalDate = new Date(startDate);
    plannedGoalDate.setDate(plannedGoalDate.getDate() + totalDays);

    // Projected goal date
    const projectedGoalDate = new Date(plannedGoalDate);
    projectedGoalDate.setDate(projectedGoalDate.getDate() - Math.round(daysAhead));

    // Status vs plan
    let vsStatus: 'ahead' | 'behind' | 'on-track';
    if (daysAhead > 1) vsStatus = 'ahead';
    else if (daysAhead < -1) vsStatus = 'behind';
    else vsStatus = 'on-track';

    // Graph status label (from calorie projection vs planned last point)
    let graphStatus: 'on-track' | 'ahead' | 'behind' = 'on-track';
    if (calorieProjectionData && calorieProjectionData.length > 0 && plannedData.length > 0) {
      const lastProjected = calorieProjectionData[calorieProjectionData.length - 1].weightLbs;
      const lastPlanned = plannedData[plannedData.length - 1].weightLbs;
      const diff = lastProjected - lastPlanned;
      if (diff > 0.5) graphStatus = 'behind';
      else if (diff < -0.5) graphStatus = 'ahead';
      else graphStatus = 'on-track';
    }

    // Days since start
    const daysSinceStart = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      latestWeight,
      weightLost,
      startWeightLbs,
      goalWeightLbs,
      currentPaceLbsPerWeek,
      adherencePct,
      adherentDays,
      trackedDays,
      daysAhead,
      vsStatus,
      plannedGoalDate,
      projectedGoalDate,
      graphStatus,
      daysSinceStart,
      daysDeviation: Math.abs(Math.round(daysAhead)),
    };
  }, [profileData, plannedData, actualWeightPoints, calorieLogs, calorieProjectionData]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>Progress</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>Progress</Text>
        <View style={styles.errorContainer}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={48} color={isDark ? colors.textSecondaryDark : colors.textSecondary} />
          <Text style={[styles.errorText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!chartConfig) {
    return (
      <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>Progress</Text>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>Set your weight goal in Profile to see progress.</Text>
        </View>
      </View>
    );
  }

  const labelColor = isDark ? colors.textDark : colors.text;
  const gridColor = isDark ? colors.borderDark : colors.border;
  const lineColor = colors.success;
  const projectionColor = colors.primary;
  const actualWeightColor = colors.warning;

  // ── Graph status badge ───────────────────────────────────────────────────
  const graphStatusConfig = stats ? {
    'on-track': { label: 'On track', bg: colors.success + '22', text: colors.success },
    'ahead': { label: 'Ahead of plan', bg: colors.primary + '22', text: colors.primary },
    'behind': { label: 'Behind plan', bg: colors.warning + '22', text: colors.warning },
  }[stats.graphStatus] : null;

  // ── Stats view computed strings ──────────────────────────────────────────
  const weightUnit = 'lb';

  const weightLostText = stats?.weightLost !== null && stats?.weightLost !== undefined
    ? `${stats.weightLost >= 0 ? '↓' : '↑'} ${Math.abs(stats.weightLost).toFixed(1)} ${weightUnit}`
    : '--';
  const weightLostColor = stats?.weightLost !== null && stats?.weightLost !== undefined
    ? (stats.weightLost >= 0 ? colors.success : colors.error)
    : (isDark ? colors.textDark : colors.text);
  const weightRangeText = stats?.latestWeight !== null && stats?.latestWeight !== undefined
    ? `${stats.startWeightLbs.toFixed(1)} → ${stats.latestWeight.toFixed(1)} ${weightUnit}`
    : '--';

  const paceText = stats?.currentPaceLbsPerWeek !== null && stats?.currentPaceLbsPerWeek !== undefined
    ? `${stats.currentPaceLbsPerWeek >= 0 ? '-' : '+'}${Math.abs(stats.currentPaceLbsPerWeek).toFixed(1)} ${weightUnit}/week`
    : 'Not enough data';
  const paceColor = stats?.currentPaceLbsPerWeek !== null && stats?.currentPaceLbsPerWeek !== undefined
    ? (stats.currentPaceLbsPerWeek > 0 ? colors.success : colors.warning)
    : (isDark ? colors.textDark : colors.text);

  const adherenceText = stats?.adherencePct !== null && stats?.adherencePct !== undefined
    ? `${stats.adherencePct}%`
    : '0%';
  const adherenceSubline = stats
    ? `${stats.adherentDays} / ${stats.trackedDays} days`
    : '--';

  const vsText = stats
    ? (stats.vsStatus === 'on-track'
        ? 'On track'
        : stats.vsStatus === 'ahead'
          ? `↑ ${stats.daysDeviation} days ahead`
          : `↓ ${stats.daysDeviation} days behind`)
    : '--';
  const vsColor = stats
    ? (stats.vsStatus === 'on-track'
        ? (isDark ? colors.textSecondaryDark : colors.textSecondary)
        : stats.vsStatus === 'ahead' ? colors.success : colors.error)
    : (isDark ? colors.textDark : colors.text);

  const projectedGoalText = stats ? formatDate(stats.projectedGoalDate) : '--';
  const plannedGoalText = stats ? `Original: ${formatDate(stats.plannedGoalDate)}` : '--';

  const calorieImpactText = stats
    ? (stats.vsStatus === 'ahead'
        ? `Your deficit moved your goal ${stats.daysDeviation} days earlier`
        : stats.vsStatus === 'behind'
          ? `Recent surplus delayed your goal by ${stats.daysDeviation} days`
          : "You're right on track with your plan")
    : '--';

  const narrativeText = stats
    ? (() => {
        const parts: string[] = [];
        if (stats.weightLost !== null) {
          const dir = stats.weightLost >= 0 ? 'lost' : 'gained';
          parts.push(`You've ${dir} ${Math.abs(stats.weightLost).toFixed(1)} lb in ${stats.daysSinceStart} days.`);
        }
        if (stats.vsStatus === 'ahead') {
          parts.push(`Your calorie deficit has put you ${stats.daysDeviation} days ahead of your plan.`);
        } else if (stats.vsStatus === 'behind') {
          parts.push(`A calorie surplus has put you ${stats.daysDeviation} days behind your plan.`);
        } else {
          parts.push("You're right on track with your calorie plan.");
        }
        if (stats.currentPaceLbsPerWeek !== null) {
          parts.push(`At this pace, you'll reach your goal by ${formatDate(stats.projectedGoalDate)}.`);
        }
        return parts.join(' ');
      })()
    : '';

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
      {/* ── Header ── */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Weight Progress
        </Text>

        {/* Segmented toggle */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              borderColor: isDark ? colors.borderDark : colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segment,
              activeView === 'graph' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => {
              console.log('[ProgressCard] Toggle pressed: graph');
              switchView('graph');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeView === 'graph' ? '#fff' : (isDark ? colors.textSecondaryDark : colors.textSecondary) },
              ]}
            >
              📈 Graph
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              activeView === 'stats' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => {
              console.log('[ProgressCard] Toggle pressed: stats');
              switchView('stats');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeView === 'stats' ? '#fff' : (isDark ? colors.textSecondaryDark : colors.textSecondary) },
              ]}
            >
              📊 Stats
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Animated content area ── */}
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ════════════════════════════════════════
            GRAPH VIEW
            ════════════════════════════════════════ */}
        {activeView === 'graph' && (
          <View>
            {/* Dataset toggle chips */}
            <View style={styles.togglesContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor: showPlannedLine ? colors.success + '20' : (isDark ? colors.cardDark : colors.card),
                    borderColor: showPlannedLine ? colors.success : (isDark ? colors.borderDark : colors.border),
                  },
                ]}
                onPress={() => {
                  console.log('[ProgressCard] Toggle planned line:', !showPlannedLine);
                  setShowPlannedLine(!showPlannedLine);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleChipText, { color: showPlannedLine ? colors.success : (isDark ? colors.textSecondaryDark : colors.textSecondary), fontWeight: showPlannedLine ? '600' : '400' }]}>
                  Planned
                </Text>
              </TouchableOpacity>

              {chartConfig.projectionPathData && (
                <TouchableOpacity
                  style={[
                    styles.toggleChip,
                    {
                      backgroundColor: showCalorieProjectionLine ? colors.primary + '20' : (isDark ? colors.cardDark : colors.card),
                      borderColor: showCalorieProjectionLine ? colors.primary : (isDark ? colors.borderDark : colors.border),
                    },
                  ]}
                  onPress={() => {
                    console.log('[ProgressCard] Toggle calorie projection:', !showCalorieProjectionLine);
                    setShowCalorieProjectionLine(!showCalorieProjectionLine);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleChipText, { color: showCalorieProjectionLine ? colors.primary : (isDark ? colors.textSecondaryDark : colors.textSecondary), fontWeight: showCalorieProjectionLine ? '600' : '400' }]}>
                    Calories
                  </Text>
                </TouchableOpacity>
              )}

              {chartConfig.actualWeightCircles && chartConfig.actualWeightCircles.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.toggleChip,
                    {
                      backgroundColor: showActualWeightDots ? colors.warning + '20' : (isDark ? colors.cardDark : colors.card),
                      borderColor: showActualWeightDots ? colors.warning : (isDark ? colors.borderDark : colors.border),
                    },
                  ]}
                  onPress={() => {
                    console.log('[ProgressCard] Toggle actual weight dots:', !showActualWeightDots);
                    setShowActualWeightDots(!showActualWeightDots);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.toggleChipText, { color: showActualWeightDots ? colors.warning : (isDark ? colors.textSecondaryDark : colors.textSecondary), fontWeight: showActualWeightDots ? '600' : '400' }]}>
                    Actual Weight
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SVG Chart */}
            <View style={styles.chartContainer}>
              <Svg width={chartConfig.totalWidth} height={chartConfig.totalHeight}>
                <Defs>
                  <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
                    <Stop offset="1" stopColor={lineColor} stopOpacity="0.05" />
                  </LinearGradient>
                </Defs>

                {chartConfig.yTicks.map((tick, index) => (
                  <Line key={`grid-h-${index}`} x1={chartConfig.yAxisWidth} y1={tick.y} x2={chartConfig.yAxisWidth + chartConfig.chartAreaWidth} y2={tick.y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />
                ))}

                {showPlannedLine && <Path d={chartConfig.fillPathData} fill="url(#lineGradient)" />}
                {showPlannedLine && <Path d={chartConfig.pathData} stroke={lineColor} strokeWidth="2.5" fill="none" />}
                {showCalorieProjectionLine && chartConfig.projectionPathData && (
                  <Path d={chartConfig.projectionPathData} stroke={projectionColor} strokeWidth="2" fill="none" />
                )}
                {showActualWeightDots && chartConfig.actualWeightCircles && chartConfig.actualWeightCircles.map((circle, index) => (
                  <Circle key={`actual-weight-${index}`} cx={circle.x} cy={circle.y} r="5" fill={actualWeightColor} stroke={isDark ? colors.cardDark : colors.card} strokeWidth="2" />
                ))}

                {chartConfig.yTicks.map((tick, index) => (
                  <SvgText key={`y-label-${index}`} x={chartConfig.yAxisWidth - 8} y={tick.y + 4} fontSize="11" fill={labelColor} textAnchor="end">{tick.label}</SvgText>
                ))}
                {chartConfig.xTicks.map((tick, index) => (
                  <SvgText key={`x-label-${index}`} x={tick.x} y={chartConfig.topPadding + chartConfig.chartAreaHeight + 20} fontSize="10" fill={labelColor} textAnchor="middle">{tick.label}</SvgText>
                ))}
              </Svg>
            </View>

            {/* Y-axis label */}
            <Text style={[styles.yAxisLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Weight (lbs)
            </Text>

            {/* Status badge */}
            {graphStatusConfig && (
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusBadge, { backgroundColor: graphStatusConfig.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: graphStatusConfig.text }]}>
                    {graphStatusConfig.label}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════
            STATS VIEW
            ════════════════════════════════════════ */}
        {activeView === 'stats' && (
          <View style={styles.statsContainer}>

            {/* Row 1: Weight Lost (full width) */}
            <StatCard
              label="WEIGHT LOST"
              bigText={weightLostText}
              subtitle="since start"
              subline={weightRangeText}
              bigColor={weightLostColor}
              fullWidth
              isDark={isDark}
            />

            {/* Row 2: Pace + Adherence */}
            <View style={styles.statsRow}>
              <StatCard
                label="CURRENT PACE"
                bigText={paceText}
                bigColor={paceColor}
                isDark={isDark}
              />
              <View style={styles.statsGap} />
              <StatCard
                label="ADHERENCE"
                bigText={adherenceText}
                subtitle="days on plan"
                subline={adherenceSubline}
                isDark={isDark}
              />
            </View>

            {/* Row 3: VS Plan + Goal Projection */}
            <View style={styles.statsRow}>
              <StatCard
                label="VS PLAN"
                bigText={vsText}
                bigColor={vsColor}
                isDark={isDark}
              />
              <View style={styles.statsGap} />
              <StatCard
                label="PROJECTED GOAL"
                bigText={projectedGoalText}
                subtitle={plannedGoalText}
                isDark={isDark}
              />
            </View>

            {/* Row 4: Calorie Impact (full width, tinted) */}
            <StatCard
              label="CALORIE IMPACT"
              bigText=""
              subtitle={calorieImpactText}
              fullWidth
              tintBg
              isDark={isDark}
            />

            {/* Narrative summary */}
            {narrativeText ? (
              <Text style={[styles.narrative, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {narrativeText}
              </Text>
            ) : null}
          </View>
        )}
      </Animated.View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
  },
  // ── Segmented control ──
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 2,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Graph dataset toggles ──
  togglesContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  toggleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  toggleChipText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  // ── Chart ──
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
  // ── Status badge ──
  statusBadgeRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Stats view ──
  statsContainer: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statsGap: {
    width: spacing.sm,
  },
  narrative: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    lineHeight: 20,
  },
  // ── Loading / error ──
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
});
