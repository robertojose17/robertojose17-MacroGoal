
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

interface ShareableProgressCardProps {
  consistencyScore: number;
  weightGoalProgress: number; // % complete (0-100)
  weightLost: number; // in lbs
  dayStreak: number;
  progressPhotoUrl?: string;
  beforePhotoUrl?: string;
  motivationalLine: string;
  onCapture?: (ref: React.RefObject<ViewShot>) => void;
}

export default function ShareableProgressCard({
  consistencyScore,
  weightGoalProgress,
  weightLost,
  dayStreak,
  progressPhotoUrl,
  beforePhotoUrl,
  motivationalLine,
  onCapture,
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  // Expose the ref to parent component
  React.useEffect(() => {
    if (onCapture && viewShotRef.current) {
      onCapture(viewShotRef);
    }
  }, [onCapture]);

  // DEFENSIVE GUARDS: Ensure all numeric values are valid
  const safeConsistencyScore = isNaN(consistencyScore) || !isFinite(consistencyScore) ? 0 : Math.max(0, Math.min(100, Math.round(consistencyScore)));
  const safeWeightGoalProgress = isNaN(weightGoalProgress) || !isFinite(weightGoalProgress) ? 0 : Math.max(0, Math.min(100, Math.round(weightGoalProgress)));
  const safeWeightLost = isNaN(weightLost) || !isFinite(weightLost) ? 0 : Math.max(0, weightLost);
  const safeDayStreak = isNaN(dayStreak) || !isFinite(dayStreak) ? 0 : Math.max(0, Math.round(dayStreak));

  console.log('[ShareableProgressCard] === RENDERING WITH VALUES ===');
  console.log('[ShareableProgressCard] Consistency Score:', safeConsistencyScore);
  console.log('[ShareableProgressCard] Weight Goal Progress:', safeWeightGoalProgress, '%');
  console.log('[ShareableProgressCard] Weight Lost:', safeWeightLost, 'lb');
  console.log('[ShareableProgressCard] Day Streak:', safeDayStreak);

  // Determine consistency status based on score
  const getConsistencyStatus = (score: number): string => {
    if (score >= 90) return 'Consistent';
    if (score >= 75) return 'On Track';
    if (score >= 50) return 'Building Momentum';
    return 'Getting Started';
  };

  const consistencyStatus = getConsistencyStatus(safeConsistencyScore);

  // Determine consistency color
  const getConsistencyColor = (score: number): string => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 75) return '#F59E0B'; // Amber
    return '#5B9AA8'; // Primary
  };

  const consistencyColor = getConsistencyColor(safeConsistencyScore);

  // Determine if we should show the weight goal progress ring
  // Show if progress > 0 OR if weight lost > 0
  const shouldShowProgressRing = safeWeightGoalProgress > 0 || safeWeightLost > 0;

  // Render progress ring for weight goal
  const renderProgressRing = () => {
    const size = 220;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = safeWeightGoalProgress / 100;
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
          stroke="#5B9AA8"
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
        {/* SECTION 1 — HERO (DOMINANT) */}
        {/* Consistency Score (PRIMARY SIGNAL) */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroValue, { color: consistencyColor }]}>
            {safeConsistencyScore}
          </Text>
          <Text style={styles.heroLabel}>Consistency Score</Text>
          <View style={[styles.statusBadge, { backgroundColor: consistencyColor + '20' }]}>
            <Text style={[styles.statusText, { color: consistencyColor }]}>
              {consistencyStatus}
            </Text>
          </View>
        </View>

        {/* SECTION 2 — GOAL PROGRESS (SECONDARY HERO) */}
        {/* Weight Goal Progress Ring */}
        {shouldShowProgressRing && (
          <View style={styles.goalSection}>
            <View style={styles.progressRingContainer}>
              {renderProgressRing()}
              <View style={styles.progressRingCenter}>
                <Text style={styles.progressPercent}>
                  {safeWeightGoalProgress}%
                </Text>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>
            </View>
            <Text style={styles.goalSectionSubtitle}>Weight Goal Progress</Text>
          </View>
        )}

        {/* If no progress ring, show "Progress Started" message */}
        {!shouldShowProgressRing && (
          <View style={styles.goalSection}>
            <View style={styles.progressStartedContainer}>
              <Text style={styles.progressStartedEmoji}>🎯</Text>
              <Text style={styles.progressStartedText}>Progress Started</Text>
            </View>
          </View>
        )}

        {/* SECTION 3 — PROOF STATS (CLEAN + BALANCED) */}
        {/* Weight Lost + Day Streak (Side by Side) */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📉</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>
                {safeWeightLost > 0 ? `–${safeWeightLost.toFixed(1)}` : '0'}
              </Text>
              <Text style={styles.statUnit}>lb</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{safeDayStreak}</Text>
              <Text style={styles.statUnit}>days</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4 — TRANSFORMATION (EMOTIONAL ANCHOR) */}
        {/* Before → Now photos */}
        {(progressPhotoUrl || beforePhotoUrl) && (
          <View style={styles.photoSection}>
            {beforePhotoUrl && progressPhotoUrl ? (
              // Before → Now
              <View style={styles.photoRow}>
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: beforePhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>Before</Text>
                </View>
                <View style={styles.photoArrow}>
                  <Text style={styles.photoArrowText}>→</Text>
                </View>
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: progressPhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>Now</Text>
                </View>
              </View>
            ) : (
              // Single photo
              <View style={styles.singlePhotoContainer}>
                <Image
                  source={{ uri: progressPhotoUrl || beforePhotoUrl }}
                  style={styles.singlePhoto}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        )}

        {/* SECTION 5 — SHARE HOOK (HUMAN) */}
        {/* Motivational line */}
        <View style={styles.motivationalSection}>
          <Text style={styles.motivationalText}>{motivationalLine}</Text>
        </View>

        {/* SECTION 6 — BRANDING (PROMOTION WITHOUT BEING SALESY) */}
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Macro Goal</Text>
          <Text style={styles.footerTagline}>Built with Macro Goal</Text>
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
    padding: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  
  // SECTION 1 — HERO (DOMINANT)
  // Consistency Score (PRIMARY SIGNAL)
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroValue: {
    fontSize: 240,
    fontWeight: '900',
    lineHeight: 240,
    letterSpacing: -12,
  },
  heroLabel: {
    fontSize: 40,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 40,
    marginTop: 20,
  },
  statusText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // SECTION 2 — GOAL PROGRESS (SECONDARY HERO)
  // Weight Goal Progress Ring
  goalSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    fontSize: 72,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -3,
  },
  progressLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  goalSectionSubtitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  progressStartedContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  progressStartedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  progressStartedText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6B7280',
  },

  // SECTION 3 — PROOF STATS (CLEAN + BALANCED)
  // Weight Lost + Day Streak (Side by Side)
  statsSection: {
    flexDirection: 'row',
    gap: 32,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  statIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -3,
    lineHeight: 76,
  },
  statUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // SECTION 4 — TRANSFORMATION (EMOTIONAL ANCHOR)
  // Before → Now photos
  photoSection: {
    width: '100%',
    marginBottom: 36,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: 420,
    height: 560,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 8px 28px rgba(0, 0, 0, 0.14)',
    elevation: 6,
  },
  photoLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 14,
  },
  photoArrow: {
    paddingHorizontal: 16,
  },
  photoArrowText: {
    fontSize: 40,
    fontWeight: '400',
    color: '#D1D5DB',
  },
  singlePhotoContainer: {
    alignItems: 'center',
  },
  singlePhoto: {
    width: 840,
    height: 560,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 8px 28px rgba(0, 0, 0, 0.14)',
    elevation: 6,
  },

  // SECTION 5 — SHARE HOOK (HUMAN)
  // Motivational line
  motivationalSection: {
    paddingHorizontal: 80,
    marginBottom: 40,
    marginTop: 8,
  },
  motivationalText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 56,
  },

  // SECTION 6 — BRANDING (PROMOTION WITHOUT BEING SALESY)
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 60,
    width: '100%',
  },
  footerBrand: {
    fontSize: 38,
    fontWeight: '900',
    color: '#5B9AA8',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  footerTagline: {
    fontSize: 19,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
});
