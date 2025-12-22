
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';

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

  // Generate weight goal progress text
  const getWeightGoalText = (): string => {
    if (safeWeightGoalProgress === 0) {
      return 'Journey started';
    }
    
    let progressPhrase = '';
    if (safeWeightGoalProgress >= 75) {
      progressPhrase = 'Almost there';
    } else if (safeWeightGoalProgress >= 50) {
      progressPhrase = 'Halfway there';
    } else if (safeWeightGoalProgress >= 25) {
      progressPhrase = 'Making progress';
    } else {
      progressPhrase = 'Getting started';
    }
    
    return `${safeWeightGoalProgress}% to my weight goal · ${progressPhrase}`;
  };

  const weightGoalText = getWeightGoalText();

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
        {/* SECTION 1 — HERO (PRIMARY) */}
        {/* Big number: Consistency Score */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroValue, { color: consistencyColor }]}>
            {safeConsistencyScore}
          </Text>
          <Text style={styles.heroHeadline}>Staying Consistent</Text>
          <View style={[styles.statusChip, { backgroundColor: consistencyColor + '20' }]}>
            <Text style={[styles.statusText, { color: consistencyColor }]}>
              {consistencyStatus}
            </Text>
          </View>
        </View>

        {/* SECTION 2 — SUPPORTING PROGRESS (SECONDARY) */}
        {/* Weight goal progress as TEXT */}
        <View style={styles.progressTextSection}>
          <Text style={styles.progressText}>{weightGoalText}</Text>
        </View>

        {/* SECTION 3 — RESULTS STRIP (NO CARDS) */}
        {/* Single horizontal line with stats */}
        <View style={styles.resultsStrip}>
          <Text style={styles.resultsText}>
            <Text style={styles.resultsBold}>–{safeWeightLost.toFixed(1)} lb</Text>
            <Text style={styles.resultsNormal}> lost</Text>
            <Text style={styles.resultsSeparator}> • </Text>
            <Text style={styles.resultsBold}>{safeDayStreak}-day</Text>
            <Text style={styles.resultsNormal}> streak </Text>
            <Text style={styles.resultsEmoji}>🔥</Text>
          </Text>
        </View>

        {/* SECTION 4 — TRANSFORMATION (KEEP, IMPORTANT) */}
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

        {/* SECTION 5 — SHARE COPY */}
        {/* One short, human line */}
        <View style={styles.shareCopySection}>
          <Text style={styles.shareCopyText}>This is what consistency looks like.</Text>
        </View>

        {/* SECTION 6 — BRANDING (SUBTLE PROMO) */}
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
    paddingTop: 120,
  },
  
  // SECTION 1 — HERO (PRIMARY)
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heroValue: {
    fontSize: 280,
    fontWeight: '900',
    lineHeight: 280,
    letterSpacing: -14,
  },
  heroHeadline: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  statusChip: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 32,
    marginTop: 24,
  },
  statusText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // SECTION 2 — SUPPORTING PROGRESS (SECONDARY)
  progressTextSection: {
    paddingHorizontal: 60,
    marginBottom: 40,
  },
  progressText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 44,
  },

  // SECTION 3 — RESULTS STRIP (NO CARDS)
  resultsStrip: {
    paddingHorizontal: 60,
    marginBottom: 56,
  },
  resultsText: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 48,
  },
  resultsBold: {
    fontWeight: '900',
    color: '#1F2937',
  },
  resultsNormal: {
    fontWeight: '500',
    color: '#6B7280',
  },
  resultsSeparator: {
    fontWeight: '400',
    color: '#D1D5DB',
  },
  resultsEmoji: {
    fontSize: 36,
  },

  // SECTION 4 — TRANSFORMATION (EMOTIONAL ANCHOR)
  photoSection: {
    width: '100%',
    marginBottom: 48,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photo: {
    width: 420,
    height: 560,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 8px 28px rgba(0, 0, 0, 0.12)',
    elevation: 6,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 12,
  },
  photoArrow: {
    paddingHorizontal: 16,
  },
  photoArrowText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#D1D5DB',
  },
  singlePhotoContainer: {
    alignItems: 'center',
  },
  singlePhoto: {
    width: 840,
    height: 560,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    boxShadow: '0px 8px 28px rgba(0, 0, 0, 0.12)',
    elevation: 6,
  },

  // SECTION 5 — SHARE COPY
  shareCopySection: {
    paddingHorizontal: 80,
    marginBottom: 48,
  },
  shareCopyText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 52,
  },

  // SECTION 6 — BRANDING (SUBTLE PROMO)
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 32,
    paddingBottom: 60,
    width: '100%',
  },
  footerBrand: {
    fontSize: 36,
    fontWeight: '900',
    color: '#5B9AA8',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  footerTagline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
});
