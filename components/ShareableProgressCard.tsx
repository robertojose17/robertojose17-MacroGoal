
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
    const size = 280;
    const strokeWidth = 20;
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
        {/* SECTION 1 — TOP / HERO (PRIMARY FOCUS) */}
        {/* Consistency Score (ALWAYS ON TOP) */}
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

        {/* SECTION 2 — GOAL COMPLETION (% COMPLETE) */}
        {/* Weight Goal Progress (CRITICAL) - Only show if valid data exists */}
        {shouldShowProgressRing && (
          <View style={styles.goalSection}>
            <Text style={styles.sectionTitle}>Weight Goal Progress</Text>
            <View style={styles.progressRingContainer}>
              {renderProgressRing()}
              <View style={styles.progressRingCenter}>
                <Text style={styles.progressPercent}>
                  {safeWeightGoalProgress}%
                </Text>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>
            </View>
          </View>
        )}

        {/* If no progress ring, show "Progress Started" message */}
        {!shouldShowProgressRing && (
          <View style={styles.goalSection}>
            <Text style={styles.sectionTitle}>Weight Goal</Text>
            <View style={styles.progressStartedContainer}>
              <Text style={styles.progressStartedEmoji}>🎯</Text>
              <Text style={styles.progressStartedText}>Progress Started</Text>
              <Text style={styles.progressStartedSubtext}>Keep logging to track your journey</Text>
            </View>
          </View>
        )}

        {/* SECTION 3 — KEY STATS (PROOF) */}
        {/* Two metrics side by side */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📉</Text>
            <Text style={styles.statValue}>
              {safeWeightLost > 0 ? `–${safeWeightLost.toFixed(1)} lb` : '0 lb'}
            </Text>
            <Text style={styles.statLabel}>Weight Lost</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{safeDayStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* SECTION 4 — PROGRESS PHOTO */}
        {/* Existing progress photo system */}
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

        {/* SECTION 5 — MOTIVATIONAL LINE */}
        {/* Short human message */}
        <View style={styles.motivationalSection}>
          <Text style={styles.motivationalText}>{motivationalLine}</Text>
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
    padding: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // SECTION 1 — HERO (CONSISTENCY SCORE)
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  heroValue: {
    fontSize: 200,
    fontWeight: '900',
    lineHeight: 200,
    letterSpacing: -8,
  },
  heroLabel: {
    fontSize: 36,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 40,
    marginTop: 28,
  },
  statusText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // SECTION 2 — GOAL COMPLETION
  goalSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 48,
    letterSpacing: 0.5,
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
    fontSize: 88,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -3,
  },
  progressLabel: {
    fontSize: 28,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  progressStartedContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  progressStartedEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  progressStartedText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  progressStartedSubtext: {
    fontSize: 24,
    fontWeight: '500',
    color: '#6B7280',
  },

  // SECTION 3 — KEY STATS
  statsSection: {
    flexDirection: 'row',
    gap: 40,
    width: '100%',
    justifyContent: 'center',
    marginTop: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 56,
    alignItems: 'center',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  statIcon: {
    fontSize: 72,
    marginBottom: 28,
  },
  statValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },

  // SECTION 4 — PROGRESS PHOTO
  photoSection: {
    width: '100%',
    marginTop: 40,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: 380,
    height: 500,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },
  photoLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 20,
  },
  photoArrow: {
    paddingHorizontal: 28,
  },
  photoArrowText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#5B9AA8',
  },
  singlePhotoContainer: {
    alignItems: 'center',
  },
  singlePhoto: {
    width: 760,
    height: 500,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
    elevation: 5,
  },

  // SECTION 5 — MOTIVATIONAL LINE
  motivationalSection: {
    marginTop: 40,
    paddingHorizontal: 80,
  },
  motivationalText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 58,
  },

  // FOOTER — BRANDING
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 40,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  footerBrand: {
    fontSize: 40,
    fontWeight: '900',
    color: '#5B9AA8',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  footerTagline: {
    fontSize: 24,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
});
