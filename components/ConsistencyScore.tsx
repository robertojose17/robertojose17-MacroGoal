
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';

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

  useEffect(() => {
    if (userId) {
      calculateConsistencyScore();
    }
  }, [userId]);

  const calculateConsistencyScore = async () => {
    try {
      setLoading(true);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // 1. Check if user has logged at least one meal today
      const { data: todayMeals, error: todayMealsError } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId)
        .eq('date', today)
        .limit(1);

      if (todayMealsError) {
        console.error('[ConsistencyScore] Error checking today meals:', todayMealsError);
      }

      const hasLoggedToday = todayMeals && todayMeals.length > 0;

      // Daily Tracking Score (0-40 points)
      const dailyTrackingScore = hasLoggedToday ? 40 : 0;

      // 2. Calculate streak (consecutive days with at least one meal logged)
      const streakDays = await calculateStreak(userId);

      // Streak Score (0-35 points) using logarithmic curve
      // Formula: 35 * (1 - e^(-0.1 * streak_days))
      const streakScore = 35 * (1 - Math.exp(-0.1 * streakDays));

      // 3. Get today's protein intake
      const { data: todayMealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`
          meal_items (
            protein
          )
        `)
        .eq('user_id', userId)
        .eq('date', today);

      if (mealsError) {
        console.error('[ConsistencyScore] Error loading today meals:', mealsError);
      }

      let proteinLogged = 0;
      if (todayMealsData && todayMealsData.length > 0) {
        todayMealsData.forEach((meal: any) => {
          if (meal.meal_items) {
            meal.meal_items.forEach((item: any) => {
              proteinLogged += item.protein || 0;
            });
          }
        });
      }

      // Get protein target from active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('protein_g')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[ConsistencyScore] Error loading goal:', goalError);
      }

      const proteinTarget = goalData?.protein_g || 150;

      // Protein Accuracy Score (0-25 points)
      const proteinAccuracyScore = calculateProteinAccuracyScore(proteinLogged, proteinTarget);

      // Total Score
      const totalScore = dailyTrackingScore + streakScore + proteinAccuracyScore;

      console.log('[ConsistencyScore] Score breakdown:', {
        dailyTracking: dailyTrackingScore,
        streakScore: streakScore.toFixed(1),
        proteinAccuracy: proteinAccuracyScore,
        total: totalScore.toFixed(1),
        streakDays,
        hasLoggedToday,
        proteinLogged: proteinLogged.toFixed(1),
        proteinTarget,
      });

      setScoreData({
        dailyTracking: dailyTrackingScore,
        streakScore: Math.round(streakScore),
        proteinAccuracy: proteinAccuracyScore,
        total: Math.round(totalScore),
        streakDays,
        hasLoggedToday,
        proteinLogged,
        proteinTarget,
      });

      setLoading(false);
    } catch (error) {
      console.error('[ConsistencyScore] Error calculating score:', error);
      setLoading(false);
    }
  };

  const calculateStreak = async (userId: string): Promise<number> => {
    try {
      // Get all dates with at least one meal logged, ordered by date descending
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('[ConsistencyScore] Error loading meals for streak:', error);
        return 0;
      }

      if (!mealsData || mealsData.length === 0) {
        return 0;
      }

      // Get unique dates
      const uniqueDates = Array.from(new Set(mealsData.map((m: any) => m.date))).sort().reverse();

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Check if the most recent log is today or yesterday
      const lastDate = uniqueDates[0];
      if (lastDate !== today && lastDate !== yesterdayStr) {
        // Streak is broken
        return 0;
      }

      // Count consecutive days
      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i - 1]);
        const prevDate = new Date(uniqueDates[i]);
        const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('[ConsistencyScore] Error calculating streak:', error);
      return 0;
    }
  };

  const calculateProteinAccuracyScore = (proteinLogged: number, proteinTarget: number): number => {
    if (proteinTarget === 0) {
      return 0;
    }

    const percentage = (proteinLogged / proteinTarget) * 100;

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
      // Over 105%, scale down from 25 to 15 as percentage increases
      const excess = percentage - 105;
      const penalty = Math.min(10, excess / 5);
      return Math.max(15, 25 - penalty);
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
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        },
      ]}
    >
      {/* Main Score Display */}
      <View style={styles.mainScoreContainer}>
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
      </View>

      {/* Score Breakdown */}
      <View style={styles.breakdownContainer}>
        {/* Daily Tracking */}
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownHeader}>
            <Text style={[styles.breakdownLabel, { color: isDark ? colors.textDark : colors.text }]}>
              Daily Tracking
            </Text>
            <Text style={[styles.breakdownScore, { color: scoreData.dailyTracking === 40 ? colors.success : colors.error }]}>
              {scoreData.dailyTracking}/40
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(scoreData.dailyTracking / 40) * 100}%`,
                  backgroundColor: scoreData.dailyTracking === 40 ? colors.success : colors.error,
                },
              ]}
            />
          </View>
          <Text style={[styles.breakdownHint, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {scoreData.hasLoggedToday ? '✓ Logged today' : '✗ No meals logged today'}
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
            {scoreData.streakDays} day{scoreData.streakDays !== 1 ? 's' : ''} streak
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
            {Math.round(scoreData.proteinLogged)}g / {scoreData.proteinTarget}g ({Math.round((scoreData.proteinLogged / scoreData.proteinTarget) * 100)}%)
          </Text>
        </View>
      </View>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  mainScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
});
