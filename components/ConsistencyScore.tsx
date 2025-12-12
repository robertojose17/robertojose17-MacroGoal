
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

  useEffect(() => {
    if (userId) {
      calculateConsistencyScore();
    }
  }, [userId]);

  const calculateConsistencyScore = async () => {
    try {
      setLoading(true);

      // Get today's date in user's local timezone (not UTC)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      console.log('[ConsistencyScore] Checking for today (local):', todayStr);
      console.log('[ConsistencyScore] Current time:', today.toISOString());

      // 1. Check if user has logged at least one meal item with calories > 0 today
      const { data: todayMeals, error: todayMealsError } = await supabase
        .from('meals')
        .select(`
          id,
          date,
          meal_items (
            id,
            calories
          )
        `)
        .eq('user_id', userId)
        .eq('date', todayStr);

      if (todayMealsError) {
        console.error('[ConsistencyScore] Error checking today meals:', todayMealsError);
      }

      // Check if there's at least one meal_item with calories > 0
      let hasLoggedToday = false;
      if (todayMeals && todayMeals.length > 0) {
        for (const meal of todayMeals) {
          if (meal.meal_items && meal.meal_items.length > 0) {
            for (const item of meal.meal_items) {
              if (item.calories && item.calories > 0) {
                hasLoggedToday = true;
                break;
              }
            }
            if (hasLoggedToday) break;
          }
        }
      }

      console.log('[ConsistencyScore] Has logged today:', hasLoggedToday, 'Meals found:', todayMeals?.length || 0);
      if (todayMeals && todayMeals.length > 0) {
        console.log('[ConsistencyScore] Today meals data:', JSON.stringify(todayMeals, null, 2));
      }

      // Daily Tracking Score (0-40 points)
      // Binary: 40 if logged today, 0 if not
      const dailyTrackingScore = hasLoggedToday ? 40 : 0;

      // 2. Calculate streak with decay logic
      const streakDays = await calculateStreakWithDecay(userId, todayStr, hasLoggedToday);

      // Streak Score (0-35 points) using exponential curve
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
        .eq('date', todayStr);

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

      // Total Score (0-100)
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

  const calculateStreakWithDecay = async (userId: string, today: string, hasLoggedToday: boolean): Promise<number> => {
    try {
      // Get or create user streak record
      const { data: streakData, error: streakError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (streakError && streakError.code !== 'PGRST116') {
        console.error('[ConsistencyScore] Error loading streak:', streakError);
        return 0;
      }

      let currentStreak = 0;
      let lastTrackedDate = null;

      if (streakData) {
        currentStreak = streakData.current_streak || 0;
        lastTrackedDate = streakData.last_tracked_date;
      }

      // Calculate days since last tracked
      let daysSinceLastTracked = 0;
      if (lastTrackedDate) {
        const lastDate = new Date(lastTrackedDate);
        const todayDate = new Date(today);
        daysSinceLastTracked = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      console.log('[ConsistencyScore] Streak calculation:', {
        currentStreak,
        lastTrackedDate,
        daysSinceLastTracked,
        hasLoggedToday,
      });

      // Apply decay logic
      if (lastTrackedDate && lastTrackedDate !== today) {
        if (daysSinceLastTracked === 1) {
          // Logged yesterday, continue or start streak
          if (hasLoggedToday) {
            currentStreak += 1;
          } else {
            // Missed today, no change yet (will decay tomorrow)
            // Keep current streak
          }
        } else if (daysSinceLastTracked === 2) {
          // Missed 1 day (yesterday), apply 30% decay
          currentStreak = Math.floor(currentStreak * 0.7);
          if (hasLoggedToday) {
            currentStreak += 1;
          }
        } else if (daysSinceLastTracked > 2) {
          // Missed more than 2 days, reset to 0
          currentStreak = 0;
          if (hasLoggedToday) {
            currentStreak = 1;
          }
        }
      } else if (!lastTrackedDate) {
        // First time tracking
        if (hasLoggedToday) {
          currentStreak = 1;
        }
      } else if (lastTrackedDate === today) {
        // Already tracked today, keep current streak
        // No change needed
      }

      // Update streak record
      if (hasLoggedToday && lastTrackedDate !== today) {
        const upsertData = {
          user_id: userId,
          current_streak: currentStreak,
          last_tracked_date: today,
          last_updated: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from('user_streaks')
          .upsert(upsertData, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('[ConsistencyScore] Error updating streak:', upsertError);
        } else {
          console.log('[ConsistencyScore] Streak updated:', upsertData);
        }
      }

      return currentStreak;
    } catch (error) {
      console.error('[ConsistencyScore] Error calculating streak with decay:', error);
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
      )}
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
});
