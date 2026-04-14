
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

const logoSource = require('@/assets/images/f2a2c236-6222-458c-89ac-a96bcb5eeff1.jpeg');

interface ShareableProgressCardProps {
  consistencyScore: number;
  weightGoalProgress: number;
  weightLost: number;
  dayStreak: number;
  trackedDays: number;
  totalDays: number;
  avgProteinAccuracy: number;
  leaderboardPhrase: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  beforeDateLabel?: string;
  afterDateLabel?: string;
  onCapture?: (ref: React.RefObject<any>) => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ShareableProgressCard({
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

  console.log('[ShareableProgressCard] Rendering with values:', {
    leaderboardPhrase,
    hasBeforePhoto: !!beforePhotoUrl,
    hasAfterPhoto: !!afterPhotoUrl,
  });

  const hasBothPhotos = !!beforePhotoUrl && !!afterPhotoUrl;
  const hasSinglePhoto = !hasBothPhotos && (!!beforePhotoUrl || !!afterPhotoUrl);
  const hasAnyPhoto = !!beforePhotoUrl || !!afterPhotoUrl;
  const singlePhotoUrl = beforePhotoUrl || afterPhotoUrl;
  const singlePhotoLabel = beforePhotoUrl ? (beforeDateLabel || '') : (afterDateLabel || 'Today');

  const resolvedBeforeLabel = beforeDateLabel || '';
  const resolvedAfterLabel = afterDateLabel || 'Today';

  return (
    <CaptureWrapper
      ref={viewShotRef}
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={styles.captureWrapper}
    >
      <View style={styles.card}>

        {/* ── PHOTOS SECTION ── */}
        {hasAnyPhoto ? (
          <View style={styles.photosSection}>
            {hasBothPhotos ? (
              <View style={styles.photoRow}>
                <View style={styles.photoContainer}>
                  <Image
                    source={resolveImageSource(beforePhotoUrl)}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>{resolvedBeforeLabel}</Text>
                </View>
                <View style={styles.photoContainer}>
                  <Image
                    source={resolveImageSource(afterPhotoUrl)}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <Text style={styles.photoLabel}>{resolvedAfterLabel}</Text>
                </View>
              </View>
            ) : hasSinglePhoto ? (
              <View style={styles.singlePhotoContainer}>
                <Image
                  source={resolveImageSource(singlePhotoUrl)}
                  style={styles.singlePhoto}
                  resizeMode="cover"
                />
                <Text style={styles.photoLabel}>{singlePhotoLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.placeholderSection}>
            <Text style={styles.placeholderText}>
              Add progress photos to see your transformation
            </Text>
          </View>
        )}

        {/* ── LEADERBOARD BADGE ── */}
        <LinearGradient
          colors={['#5B9AA8', '#4A8A98']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leaderboardBadge}
        >
          <Text style={styles.leaderboardText}>{leaderboardPhrase}</Text>
        </LinearGradient>

        {/* ── LOGO ── */}
        <View style={styles.logoContainer}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

      </View>
    </CaptureWrapper>
  );
}

const styles = StyleSheet.create({
  captureWrapper: {
    width: 1080,
    height: 1920,
    backgroundColor: '#0F1117',
  },
  card: {
    width: 1080,
    height: 1920,
    backgroundColor: '#0F1117',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 80,
    paddingBottom: 80,
  },

  // ── PHOTOS ──
  photosSection: {
    width: '100%',
    flex: 1,
    marginBottom: 48,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    flex: 1,
  },
  photo: {
    width: 480,
    height: 1200,
    borderRadius: 24,
    backgroundColor: '#1C1F2A',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  singlePhotoContainer: {
    alignItems: 'center',
    flex: 1,
  },
  singlePhoto: {
    width: 984,
    height: 1200,
    borderRadius: 24,
    backgroundColor: '#1C1F2A',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoLabel: {
    fontSize: 28,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 20,
    opacity: 0.8,
  },

  // ── PLACEHOLDER ──
  placeholderSection: {
    width: '100%',
    flex: 1,
    marginBottom: 48,
    borderRadius: 24,
    backgroundColor: '#1C1F2A',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 80,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 60,
  },

  // ── LEADERBOARD ──
  leaderboardBadge: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 48,
  },
  leaderboardText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 60,
  },

  // ── LOGO ──
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 320,
    height: 120,
  },
});
