
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import CalendarDateRangePicker from '@/components/CalendarDateRangePicker';

interface ConsistencyScoreProps {
  userId: string;
  isDark: boolean;
}

interface ScoreBreakdown {
  dailyTracking: number;
  streakScore: number;
  proteinAccuracy: number;
  total: number;
  streakDays: number;
  hasLoggedToday: boolean;
  proteinLogged: number;
  proteinTarget: number;
}

export default function ConsistencyScore({ userId, isDark }: ConsistencyScoreProps) {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<ScoreBreakdown | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  
  // Date range state
  const [profileStartDate, setProfileStartDate] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [isCustomRange, setIsCustomRange] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfileStartDate();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && profileStartDate) {
      calculateConsistencyScore();
    }
  }, [userId, profileStartDate, customStartDate, customEndDate]);

  const loadProfileStartDate = async () => {
    try {
      console.log('[ConsistencyScore] Loading profile start date');
      
      // Fetch start_date from goals table (active goal)
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('start_date')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalError) {
        console.error('[ConsistencyScore] Error loading goal:', goalError);
      }

      if (goalData?.start_date) {
        console.log('[ConsistencyScore] Profile start date found:', goalData.start_date);
        setProfileStartDate(goalData.start_date);
      } else {
        // Fallback to today if no start_date
        const today = new Date().toISOString().split('T')[0];
        console.log('[ConsistencyScore] No start date found, using today:', today);
        setProfileStartDate(today);
      }
    } catch (error) {
      console.error('[ConsistencyScore] Error loading profile start date:', error);
      // Fallback to today
      const today = new Date().toISOString().split('T')[0];
      setProfileStartDate(today);
    }
  };

  const calculateConsistencyScore = async () => {
    try {
      setLoading(true);

      // Determine the date range to use
      const startDateStr = isCustomRange && customStartDate ? customStartDate : profileStartDate;
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const endDateStr = isCustomRange && customEndDate ? customEndDate : `${year}-${month}-${day}`;

      if (!startDateStr) {
        console.log('[ConsistencyScore] No start date available yet');
        setLoading(false);
        return;
      }

      console.log('[ConsistencyScore] ===== CALCULATING SCORE =====');
      console.log('[ConsistencyScore] Date range:', startDateStr, 'to', endDateStr);
      console.log('[ConsistencyScore] User ID:', userId);

      // 1. Get all meals in the date range
      const { data: allMeals, error: allMealsError } = await supabase
        .from('meals')
        .select(`
          id,
          date,
          meal_items (
            id,
            calories,
            protein
          )
        `)
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (allMealsError) {
        console.error('[ConsistencyScore] ❌ Error loading meals:', allMealsError);
      }

      console.log('[ConsistencyScore] Meals query returned:', allMeals?.length || 0, 'meals');
      console.log('[ConsistencyScore] Raw meals data:', JSON.stringify(allMeals, null, 2));

      // FIX: Check if there's any data - a day has tracking if it has at least ONE meal_item OR total calories > 0
      const daysWithData = new Set<string>();
      const dailyCalories: { [date: string]: number } = {};
      const dailyProtein: { [date: string]: number } = {};

      if (allMeals && allMeals.length > 0) {
        for (const meal of allMeals) {
          if (meal.meal_items && meal.meal_items.length > 0) {
            // Initialize daily totals if not exists
            if (!dailyCalories[meal.date]) {
              dailyCalories[meal.date] = 0;
            }
            if (!dailyProtein[meal.date]) {
              dailyProtein[meal.date] = 0;
            }

            // Process each meal item
            for (const item of meal.meal_items) {
              // FIX: Add day to tracking if there's ANY meal item (regardless of calories value)
              daysWithData.add(meal.date);
              
              // Safely parse calories and protein
              const itemCalories = parseFloat(String(item.calories || '0'));
              const itemProtein = parseFloat(String(item.protein || '0'));
              
              dailyCalories[meal.date] += itemCalories;
              dailyProtein[meal.date] += itemProtein;
            }
          }
        }
      }

      console.log('[ConsistencyScore] Days with data:', Array.from(daysWithData).sort());
      console.log('[ConsistencyScore] Daily calories:', dailyCalories);
      console.log('[ConsistencyScore] Daily protein:', dailyProtein);

      // Calculate total days in range
      const startDate = new Date(startDateStr + 'T00:00:00');
      const endDate = new Date(endDateStr + 'T00:00:00');
      const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Daily Tracking Score: (days_logged / total_days) * 40
      const daysLogged = daysWithData.size;
      const dailyTrackingScore = totalDays > 0 ? Math.round((daysLogged / totalDays) * 40) : 0;

      console.log('[ConsistencyScore] ===== DAILY TRACKING =====');
      console.log('[ConsistencyScore] Days logged:', daysLogged);
      console.log('[ConsistencyScore] Total days in range:', totalDays);
      console.log('[ConsistencyScore] Daily tracking score:', dailyTrackingScore, '/ 40');

      // 3. Calculate Streak Score
      const streakDays = await calculateStreakInRange(userId, startDateStr, endDateStr, Array.from(daysWithData).sort());
      
      // Streak Score (0-35 points) using exponential curve
      // Formula: 35 * (1 - e^(-0.1 * streak_days))
      const streakScore = 35 * (1 - Math.exp(-0.1 * streakDays));

      console.log('[ConsistencyScore] ===== STREAK =====');
      console.log('[ConsistencyScore] Streak days:', streakDays);
      console.log('[ConsistencyScore] Streak score:', Math.round(streakScore), '/ 35');

      // 4. Calculate Protein Accuracy Score
      // Calculate average protein per day
      const proteinDays = Object.keys(dailyProtein);
      const daysWithProteinData = proteinDays.length;
      const totalProtein = proteinDays.reduce((sum, date) => sum + dailyProtein[date], 0);
      const avgProteinLogged = daysWithProteinData > 0 ? totalProtein / daysWithProteinData : 0;

      // Get protein target from active goal (use latest active goal)
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('protein_g')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goalError) {
        console.error('[ConsistencyScore] Error loading goal:', goalError);
      }

      // FIX: Use a default protein target if none exists, but still award tracking points
      const proteinTarget = goalData?.protein_g || 150;

      // Protein Accuracy Score (0-25 points)
      // FIX: If no protein target, set protein score to 0 but don't fail the whole calculation
      const proteinAccuracyScore = proteinTarget > 0 ? calculateProteinAccuracyScore(avgProteinLogged, proteinTarget) : 0;

      console.log('[ConsistencyScore] ===== PROTEIN ACCURACY =====');
      console.log('[ConsistencyScore] Avg protein logged:', avgProteinLogged.toFixed(1), 'g');
      console.log('[ConsistencyScore] Protein target:', proteinTarget, 'g');
      console.log('[ConsistencyScore] Protein accuracy score:', proteinAccuracyScore, '/ 25');

      // Total Score (0-100)
      const totalScore = dailyTrackingScore + streakScore + proteinAccuracyScore;

      console.log('[ConsistencyScore] ===== TOTAL SCORE =====');
      console.log('[ConsistencyScore] Daily Tracking:', dailyTrackingScore, '/ 40');
      console.log('[ConsistencyScore] Streak:', Math.round(streakScore), '/ 35');
      console.log('[ConsistencyScore] Protein Accuracy:', proteinAccuracyScore, '/ 25');
      console.log('[ConsistencyScore] TOTAL:', Math.round(totalScore), '/ 100');

      setScoreData({
        dailyTracking: dailyTrackingScore,
        streakScore: Math.round(streakScore),
        proteinAccuracy: proteinAccuracyScore,
        total: Math.round(totalScore),
        streakDays,
        hasLoggedToday: daysWithData.has(endDateStr),
        proteinLogged: avgProteinLogged,
        proteinTarget,
      });

      setLoading(false);
    } catch (error) {
      console.error('[ConsistencyScore] ❌ Error calculating score:', error);
      setLoading(false);
    }
  };

  const calculateStreakInRange = async (
    userId: string,
    startDateStr: string,
    endDateStr: string,
    daysWithData: string[]
  ): Promise<number> => {
    try {
      if (daysWithData.length === 0) return 0;

      // Calculate the longest streak within the date range
      let currentStreak = 1;
      let maxStreak = 1;

      for (let i = 1; i < daysWithData.length; i++) {
        const prevDate = new Date(daysWithData[i - 1] + 'T00:00:00');
        const currDate = new Date(daysWithData[i] + 'T00:00:00');
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          // Streak broken
          currentStreak = 1;
        }
      }

      return maxStreak;
    } catch (error) {
      console.error('[ConsistencyScore] Error calculating streak in range:', error);
      return 0;
    }
  };

  const calculateProteinAccuracyScore = (proteinLogged: number, proteinTarget: number): number => {
    if (proteinTarget === 0) {
      return 0;
    }

    const percentage = (proteinLogged / proteinTarget) * 100;

    // Exact scoring as specified:
    // 95-105% → 25 pts
    // 80-94% → 20 pts
    // 60-79% → 15 pts
    // 40-59% → 10 pts
    // <40% → 0-5 pts (scaled)

    if (percentage >= 95 && percentage <= 105) {
      return 25;
    } else if (percentage >= 80 && percentage < 95) {
      return 20;
    } else if (percentage >= 60 && percentage < 80) {
      return 15;
    } else if (percentage >= 40 && percentage < 60) {
      return 10;
    } else if (percentage < 40) {
      // Scale from 0-5 based on how close to 40%
      return Math.round((percentage / 40) * 5);
    } else {
      // Over 105%, gradually reduce score
      // Scale down from 25 to 15 as percentage increases beyond 105%
      const excess = percentage - 105;
      const penalty = Math.min(10, excess / 5);
      return Math.max(15, Math.round(25 - penalty));
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) {
      return colors.success;
    } else if (score >= 60) {
      return colors.warning;
    } else {
      return colors.error;
    }
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) {
      return 'Excellent';
    } else if (score >= 80) {
      return 'Great';
    } else if (score >= 70) {
      return 'Good';
    } else if (score >= 60) {
      return 'Fair';
    } else {
      return 'Needs Work';
    }
  };

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    console.log('[ConsistencyScore] Custom date range selected:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    setCustomStartDate(startStr);
    setCustomEndDate(endStr);
    setIsCustomRange(true);
  };

  const handleResetToJourneyStart = () => {
    console.log('[ConsistencyScore] Resetting to journey start');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setIsCustomRange(false);
  };

  const getDateRangeText = () => {
    if (isCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const end = new Date(customEndDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${start} - ${end}`;
    } else if (profileStartDate) {
      const start = new Date(profileStartDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${start} - Today`;
    }
    return 'Loading...';
  };

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!scoreData) {
    return null;
  }

  const scoreColor = getScoreColor(scoreData.total);
  const scoreLabel = getScoreLabel(scoreData.total);

  return (
    <React.Fragment>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
        {/* Main Score Display - Tappable */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowDetails(!showDetails)}
          style={styles.mainScoreContainer}
        >
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {scoreData.total}
            </Text>
            <Text style={[styles.scoreLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {scoreLabel}
            </Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Consistency Score
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Your daily tracking performance
            </Text>
          </View>
          <IconSymbol
            ios_icon_name={showDetails ? "chevron.up" : "chevron.down"}
            android_material_icon_name={showDetails ? "expand_less" : "expand_more"}
            size={24}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Score Breakdown - Conditionally Rendered */}
        {showDetails && (
          <View style={styles.breakdownContainer}>
            {/* Daily Tracking */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Daily Tracking
                </Text>
                <Text style={[styles.breakdownScore, { color: scoreData.dailyTracking >= 30 ? colors.success : colors.warning }]}>
                  {scoreData.dailyTracking}/40
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(scoreData.dailyTracking / 40) * 100}%`,
                      backgroundColor: scoreData.dailyTracking >= 30 ? colors.success : colors.warning,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.breakdownHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Based on days logged in range
              </Text>
            </View>

            {/* Streak Score */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Streak Score
                </Text>
                <Text style={[styles.breakdownScore, { color: colors.primary }]}>
                  {scoreData.streakScore}/35
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(scoreData.streakScore / 35) * 100}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.breakdownHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {scoreData.streakDays} day{scoreData.streakDays !== 1 ? 's' : ''} longest streak
              </Text>
            </View>

            {/* Protein Accuracy */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Protein Accuracy
                </Text>
                <Text style={[styles.breakdownScore, { color: colors.protein }]}>
                  {scoreData.proteinAccuracy}/25
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(scoreData.proteinAccuracy / 25) * 100}%`,
                      backgroundColor: colors.protein,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.breakdownHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {Math.round(scoreData.proteinLogged)}g / {scoreData.proteinTarget}g avg ({Math.round((scoreData.proteinLogged / scoreData.proteinTarget) * 100)}%)
              </Text>
            </View>

            {/* Date Range Control */}
            <View style={styles.dateRangeSection}>
              <View style={styles.dateRangeHeader}>
                <Text style={[styles.dateRangeLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Date range
                </Text>
                <TouchableOpacity
                  style={[
                    styles.changeDateButton,
                    {
                      backgroundColor: isDark ? colors.backgroundDark : colors.background,
                      borderColor: isDark ? colors.borderDark : colors.border,
                    },
                  ]}
                  onPress={() => setShowCalendarPicker(true)}
                >
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar_today"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.changeDateButtonText, { color: colors.primary }]}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.dateRangeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {getDateRangeText()}
              </Text>
              {isCustomRange && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleResetToJourneyStart}
                >
                  <Text style={[styles.resetButtonText, { color: colors.primary }]}>
                    Reset to journey start
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Calendar Date Range Picker */}
      <CalendarDateRangePicker
        visible={showCalendarPicker}
        onClose={() => setShowCalendarPicker(false)}
        onSelectRange={handleDateRangeSelect}
        initialStartDate={
          isCustomRange && customStartDate
            ? new Date(customStartDate + 'T00:00:00')
            : profileStartDate
            ? new Date(profileStartDate + 'T00:00:00')
            : new Date()
        }
        initialEndDate={
          isCustomRange && customEndDate
            ? new Date(customEndDate + 'T00:00:00')
            : new Date()
        }
        maxDate={new Date()}
        minDate={profileStartDate ? new Date(profileStartDate + 'T00:00:00') : undefined}
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  mainScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background + '40',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },
  scoreValue: {
    ...typography.h1,
    fontSize: 32,
    fontWeight: '700',
  },
  scoreLabel: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
  },
  breakdownContainer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  breakdownItem: {
    gap: spacing.xs,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  breakdownScore: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  progressBar: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  breakdownHint: {
    ...typography.caption,
    fontSize: 11,
  },
  dateRangeSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
  },
  dateRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateRangeLabel: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  changeDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  changeDateButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRangeText: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  resetButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
