
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

interface ShareableProgressCardProps {
  userName: string;
  disciplineScore: number;
  dateRange: string;
  caloriesConsumed: number;
  caloriesGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fats: number;
  fatsGoal: number;
  fiber: number;
  fiberGoal: number;
  streakDays: number;
  proteinAccuracy: number;
  weightLost: number;
  leftPhotoUrl?: string;
  rightPhotoUrl?: string;
  leftPhotoDate?: string;
  rightPhotoDate?: string;
  onCapture?: (ref: React.RefObject<ViewShot>) => void;
}

export default function ShareableProgressCard({
  userName,
  disciplineScore,
  dateRange,
  caloriesConsumed,
  caloriesGoal,
  protein,
  proteinGoal,
  carbs,
  carbsGoal,
  fats,
  fatsGoal,
  fiber,
  fiberGoal,
  streakDays,
  proteinAccuracy,
  weightLost,
  leftPhotoUrl,
  rightPhotoUrl,
  leftPhotoDate,
  rightPhotoDate,
  onCapture,
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  // Expose the ref to parent component
  React.useEffect(() => {
    if (onCapture && viewShotRef.current) {
      onCapture(viewShotRef);
    }
  }, [onCapture]);

  // Determine hero metric (auto-select best signal)
  const getHeroMetric = () => {
    // Priority: Streak > Consistency > Calories
    if (streakDays >= 7) {
      return {
        value: streakDays,
        label: 'Day Streak',
        status: 'Consistent',
        color: '#10B981',
      };
    }
    if (disciplineScore >= 80) {
      return {
        value: disciplineScore,
        label: 'Consistency Score',
        status: 'On Track',
        color: '#10B981',
      };
    }
    const caloriePercent = Math.round((caloriesConsumed / caloriesGoal) * 100);
    return {
      value: caloriePercent,
      label: '% Goal Reached',
      status: caloriePercent >= 95 && caloriePercent <= 105 ? 'Dialed In' : 'On Track',
      color: caloriePercent >= 95 && caloriePercent <= 105 ? '#10B981' : '#F59E0B',
    };
  };

  const heroMetric = getHeroMetric();

  // Get motivational hook
  const getShareHook = () => {
    if (streakDays >= 14) return 'Still showing up 💪';
    if (disciplineScore >= 90) return 'One step closer 🔥';
    if (weightLost >= 5) return 'Progress over perfection';
    return 'Small wins add up';
  };

  const shareHook = getShareHook();

  // Calculate progress percentage for visual
  const progressPercent = Math.min(100, Math.round((caloriesConsumed / caloriesGoal) * 100));

  // Render streak dots (last 7 days)
  const renderStreakDots = () => {
    const dots = [];
    for (let i = 0; i < 7; i++) {
      const isActive = i < streakDays;
      dots.push(
        <View
          key={i}
          style={[
            styles.streakDot,
            {
              backgroundColor: isActive ? heroMetric.color : '#E5E7EB',
            },
          ]}
        />
      );
    }
    return dots;
  };

  // Render progress ring
  const renderProgressRing = () => {
    const size = 180;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = progressPercent / 100;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <Svg width={size} height={size} style={styles.progressRing}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={heroMetric.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    );
  };

  return (
    <ViewShot
      ref={viewShotRef}
      options={{
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      }}
      style={styles.captureWrapper}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB', '#F3F4F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* SECTION 1 — HEADER (IDENTITY) */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🏆</Text>
          </View>
          <Text style={styles.headerTitle}>Today&apos;s Progress</Text>
          <Text style={styles.headerSubtitle}>Showing up, one day at a time</Text>
        </View>

        {/* SECTION 2 — HERO METRIC (MAIN FLEX) */}
        <View style={styles.heroSection}>
          <View style={styles.heroMetricContainer}>
            <Text style={[styles.heroValue, { color: heroMetric.color }]}>
              {heroMetric.value}
            </Text>
            <Text style={styles.heroLabel}>{heroMetric.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: heroMetric.color + '20' }]}>
            <Text style={[styles.statusText, { color: heroMetric.color }]}>
              {heroMetric.status}
            </Text>
          </View>
        </View>

        {/* SECTION 3 — QUICK VISUAL (1-SECOND READ) */}
        <View style={styles.visualSection}>
          <View style={styles.progressRingContainer}>
            {renderProgressRing()}
            <View style={styles.progressRingCenter}>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4 — KEY RESULT / ACHIEVEMENT */}
        <View style={styles.achievementSection}>
          <View style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>📉</Text>
            <Text style={styles.achievementValue}>–{weightLost.toFixed(1)} lb</Text>
            <Text style={styles.achievementLabel}>since start</Text>
          </View>
          <View style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>🔥</Text>
            <Text style={styles.achievementValue}>{streakDays} days</Text>
            <Text style={styles.achievementLabel}>streak</Text>
          </View>
        </View>

        {/* SECTION 5 — EMOTIONAL PROOF (OPTIONAL) */}
        {weightLost > 0 && (
          <View style={styles.transformationSection}>
            <View style={styles.transformationCard}>
              <Text style={styles.transformationText}>
                Progress in motion
              </Text>
              <Text style={styles.transformationStat}>
                {weightLost.toFixed(1)} lb down and counting
              </Text>
            </View>
          </View>
        )}

        {/* SECTION 6 — SHARE HOOK (MOTIVATION) */}
        <View style={styles.shareHookSection}>
          <Text style={styles.shareHookText}>{shareHook}</Text>
        </View>

        {/* Streak dots visualization */}
        <View style={styles.streakDotsContainer}>
          {renderStreakDots()}
        </View>

        {/* FOOTER — BRANDING (SUBTLE) */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Macro Goal</Text>
          <Text style={styles.footerTagline}>Tracked with Macro Goal</Text>
        </View>
      </LinearGradient>
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  captureWrapper: {
    width: 1080,
    height: 1920,
    backgroundColor: '#FFFFFF',
  },
  card: {
    width: 1080,
    height: 1920,
    padding: 80,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // HEADER
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  iconEmoji: {
    fontSize: 44,
  },
  headerTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.3,
  },

  // HERO METRIC
  heroSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  heroMetricContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroValue: {
    fontSize: 140,
    fontWeight: '900',
    lineHeight: 140,
    letterSpacing: -4,
  },
  heroLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // VISUAL
  visualSection: {
    alignItems: 'center',
    marginVertical: 60,
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    // SVG styles handled inline
  },
  progressRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -1.5,
  },
  progressLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },

  // ACHIEVEMENT
  achievementSection: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
    justifyContent: 'center',
    marginTop: 40,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  achievementValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  achievementLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },

  // TRANSFORMATION
  transformationSection: {
    width: '100%',
    marginTop: 40,
  },
  transformationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  transformationText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  transformationStat: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
  },

  // SHARE HOOK
  shareHookSection: {
    marginTop: 60,
    paddingHorizontal: 40,
  },
  shareHookText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // STREAK DOTS
  streakDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 40,
  },
  streakDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    marginTop: 60,
    paddingTop: 40,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  footerBrand: {
    fontSize: 32,
    fontWeight: '900',
    color: '#5B9AA8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  footerTagline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
});
