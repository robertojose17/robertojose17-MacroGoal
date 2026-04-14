
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// react-native-view-shot requires a native build — lazy import so Expo Go doesn't hang
let ViewShot: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { ViewShot = require('react-native-view-shot').default; } catch {}
}
// Fallback wrapper when ViewShot is unavailable (Expo Go / web)
const CaptureWrapper: any = ViewShot || View;

interface ShareableProgressCardProps {
  consistencyScore: number;
  weightGoalProgress: number;    // % complete (0-100)
  weightLost: number;            // in lbs
  dayStreak: number;
  trackedDays: number;           // e.g. 42
  totalDays: number;             // e.g. 50
  avgProteinAccuracy: number;    // % (0-100)
  leaderboardPhrase: string;     // e.g. "You're in the top 15% of Macro Goal users 🔥"
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  beforeDateLabel?: string;      // e.g. "Jan 5"
  afterDateLabel?: string;       // e.g. "Today"
  onCapture?: (ref: React.RefObject<any>) => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ShareableProgressCard({
  consistencyScore,
  weightGoalProgress,
  weightLost,
  dayStreak,
  trackedDays,
  totalDays,
  avgProteinAccuracy,
  leaderboardPhrase,
  beforePhotoUrl,
  afterPhotoUrl,
  beforeDateLabel,
  afterDateLabel,
  onCapture,
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<any>(null);

  React.useEffect(() => {
    if (onCapture && viewShotRef.current) {
      onCapture(viewShotRef);
    }
  }, [onCapture]);

  // Defensive guards for all numeric values
  const safeConsistency = isNaN(consistencyScore) || !isFinite(consistencyScore) ? 0 : Math.max(0, Math.min(100, Math.round(consistencyScore)));
  const safeWeightGoal = isNaN(weightGoalProgress) || !isFinite(weightGoalProgress) ? 0 : Math.max(0, Math.min(100, Math.round(weightGoalProgress)));
  const safeWeightLost = isNaN(weightLost) || !isFinite(weightLost) ? 0 : Math.max(0, weightLost);
  const safeDayStreak = isNaN(dayStreak) || !isFinite(dayStreak) ? 0 : Math.max(0, Math.round(dayStreak));
  const safeTrackedDays = isNaN(trackedDays) || !isFinite(trackedDays) ? 0 : Math.max(0, Math.round(trackedDays));
  const safeTotalDays = isNaN(totalDays) || !isFinite(totalDays) ? 1 : Math.max(1, Math.round(totalDays));
  const safeProteinAccuracy = isNaN(avgProteinAccuracy) || !isFinite(avgProteinAccuracy) ? 0 : Math.max(0, Math.min(100, Math.round(avgProteinAccuracy)));

  console.log('[ShareableProgressCard] Rendering with values:', {
    safeConsistency,
    safeWeightGoal,
    safeWeightLost,
    safeDayStreak,
    safeTrackedDays,
    safeTotalDays,
    safeProteinAccuracy,
    leaderboardPhrase,
    hasBeforePhoto: !!beforePhotoUrl,
    hasAfterPhoto: !!afterPhotoUrl,
  });

  const hasBothPhotos = !!beforePhotoUrl && !!afterPhotoUrl;
  const hasSinglePhoto = !hasBothPhotos && (!!beforePhotoUrl || !!afterPhotoUrl);
  const hasAnyPhoto = !!beforePhotoUrl || !!afterPhotoUrl;
  const singlePhotoUrl = beforePhotoUrl || afterPhotoUrl;
  const singlePhotoLabel = beforePhotoUrl ? (beforeDateLabel || '') : (afterDateLabel || 'Today');

  const weightLostDisplay = `-${safeWeightLost.toFixed(1)} lb`;
  const weightGoalDisplay = `${safeWeightGoal}%`;
  const trackedDaysDisplay = `${safeTrackedDays}/${safeTotalDays}`;
  const proteinDisplay = `${safeProteinAccuracy}%`;
  const streakDisplay = `${safeDayStreak}🔥`;

  return (
    <CaptureWrapper
      ref={viewShotRef}
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={styles.captureWrapper}
    >
      <View style={styles.card}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.appName}>MACRO GOAL</Text>
          <Text style={styles.tagline}>Track. Improve. Share.</Text>
        </View>

        {/* ── PHOTOS SECTION ── */}
        {hasAnyPhoto && (
          <View style={styles.photosSection}>
            {hasBothPhotos ? (
              <View style={styles.photoRow}>
                <View style={styles.photoContainer}>
                  <Image source={resolveImageSource(beforePhotoUrl)} style={styles.photo} resizeMode="cover" />
                  <Text style={styles.photoLabel}>{beforeDateLabel || ''}</Text>
                </View>
                <View style={styles.photoContainer}>
                  <Image source={resolveImageSource(afterPhotoUrl)} style={styles.photo} resizeMode="cover" />
                  <Text style={styles.photoLabel}>{afterDateLabel || 'Today'}</Text>
                </View>
              </View>
            ) : hasSinglePhoto ? (
              <View style={styles.singlePhotoContainer}>
                <Image source={resolveImageSource(singlePhotoUrl)} style={styles.singlePhoto} resizeMode="cover" />
                <Text style={styles.photoLabel}>{singlePhotoLabel}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── SIX METRIC CARDS ── */}
        <View style={styles.metricsGrid}>
          {/* Row 1 */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorTeal]}>{safeConsistency}</Text>
            <Text style={styles.metricLabel}>Consistency Score</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorOrange]}>{streakDisplay}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>

          {/* Row 2 */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorGreen]}>{weightLostDisplay}</Text>
            <Text style={styles.metricLabel}>Weight Lost</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorGreen]}>{weightGoalDisplay}</Text>
            <Text style={styles.metricLabel}>to Weight Goal</Text>
          </View>

          {/* Row 3 */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorTeal]}>{trackedDaysDisplay}</Text>
            <Text style={styles.metricLabel}>Days Tracked</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.colorPurple]}>{proteinDisplay}</Text>
            <Text style={styles.metricLabel}>Protein Accuracy</Text>
          </View>
        </View>

        {/* ── LEADERBOARD PHRASE ── */}
        <LinearGradient
          colors={['#5B9AA8', '#4A8A98']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leaderboardBadge}
        >
          <Text style={styles.leaderboardText}>{leaderboardPhrase}</Text>
        </LinearGradient>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerBuilt}>Built with Macro Goal</Text>
          <Text style={styles.footerUrl}>macrogoal.app</Text>
        </View>

      </View>
    </CaptureWrapper>
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 80,
    paddingBottom: 60,
  },

  // ── HEADER ──
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    paddingVertical: 48,
    marginBottom: 40,
  },
  appName: {
    fontSize: 52,
    fontWeight: '700',
    color: '#5B9AA8',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 12,
    letterSpacing: 1,
  },

  // ── PHOTOS ──
  photosSection: {
    width: '100%',
    marginBottom: 40,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  photoContainer: {
    alignItems: 'center',
    flex: 1,
  },
  photo: {
    width: 480,
    height: 640,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  singlePhotoContainer: {
    alignItems: 'center',
  },
  singlePhoto: {
    width: 840,
    height: 640,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  photoLabel: {
    fontSize: 24,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 16,
  },

  // ── METRICS GRID ──
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  metricCard: {
    width: 460,
    height: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  metricValue: {
    fontSize: 120,
    fontWeight: '700',
    lineHeight: 140,
  },
  metricLabel: {
    fontSize: 32,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Metric value colors
  colorTeal: { color: '#5B9AA8' },
  colorOrange: { color: '#FF8A5B' },
  colorGreen: { color: '#10B981' },
  colorPurple: { color: '#8B5CF6' },

  // ── LEADERBOARD ──
  leaderboardBadge: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 40,
  },
  leaderboardText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 56,
  },

  // ── FOOTER ──
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerBuilt: {
    fontSize: 24,
    fontWeight: '400',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  footerUrl: {
    fontSize: 22,
    fontWeight: '600',
    color: '#5B9AA8',
  },
});
