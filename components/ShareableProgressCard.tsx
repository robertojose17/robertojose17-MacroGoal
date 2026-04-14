
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// react-native-view-shot requires a native build — lazy import so Expo Go doesn't hang
let ViewShot: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { ViewShot = require('react-native-view-shot').default; } catch {}
}
const CaptureWrapper: any = ViewShot || View;

const logoSource = require('@/assets/images/f2a2c236-6222-458c-89ac-a96bcb5eeff1.jpeg');

export interface ShareableProgressCardProps {
  beforePhoto?: string | null;
  afterPhoto?: string | null;
  beforeDate?: string | null;
  afterDate?: string | null;
  leaderboardPhrase?: string | null;
  onCapture?: (ref: React.RefObject<any>) => void;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ShareableProgressCard({
  beforePhoto,
  afterPhoto,
  beforeDate,
  afterDate,
  leaderboardPhrase,
  onCapture,
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<any>(null);

  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [bothLoaded, setBothLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasBothPhotos = !!beforePhoto && !!afterPhoto;
  const hasSinglePhoto = !hasBothPhotos && (!!beforePhoto || !!afterPhoto);
  const singlePhotoUrl = beforePhoto || afterPhoto;
  const singlePhotoLabel = beforePhoto ? (beforeDate || '') : (afterDate || 'Today');

  const resolvedBeforeLabel = beforeDate || '';
  const resolvedAfterLabel = afterDate || 'Today';
  const hasLeaderboard = !!leaderboardPhrase;

  // Track simultaneous loading for both photos
  useEffect(() => {
    if (hasBothPhotos) {
      if (beforeLoaded && afterLoaded && !bothLoaded) {
        setBothLoaded(true);
        console.log('[ShareableProgressCard] Both photos loaded — fading in');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }
    } else if (hasSinglePhoto) {
      if ((beforeLoaded || afterLoaded) && !bothLoaded) {
        setBothLoaded(true);
        console.log('[ShareableProgressCard] Single photo loaded — fading in');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [beforeLoaded, afterLoaded, hasBothPhotos, hasSinglePhoto, bothLoaded, fadeAnim]);

  useEffect(() => {
    if (onCapture && viewShotRef.current) {
      onCapture(viewShotRef);
    }
  }, [onCapture]);

  console.log('[ShareableProgressCard] Rendering', {
    hasBeforePhoto: !!beforePhoto,
    hasAfterPhoto: !!afterPhoto,
    leaderboardPhrase,
  });

  return (
    <CaptureWrapper
      ref={viewShotRef}
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={styles.captureWrapper}
    >
      {/* Dark background with subtle gradient overlay */}
      <LinearGradient
        colors={['#1E2240', '#1A1C2E', '#141624']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.card}
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.appName}>MACRO GOAL</Text>
          <View style={styles.headerRule} />
        </View>

        {/* ── PHOTOS SECTION ── */}
        {hasBothPhotos ? (
          <View style={styles.photosSection}>
            <Animated.View style={[styles.photoRow, { opacity: fadeAnim }]}>
              {/* Before photo */}
              <View style={styles.photoWrapper}>
                <Image
                  source={resolveImageSource(beforePhoto)}
                  style={styles.photo}
                  resizeMode="cover"
                  onLoad={() => {
                    console.log('[ShareableProgressCard] Before photo loaded');
                    setBeforeLoaded(true);
                  }}
                />
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>{resolvedBeforeLabel}</Text>
                </View>
              </View>

              {/* VS divider */}
              <View style={styles.vsDivider}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              {/* After photo */}
              <View style={styles.photoWrapper}>
                <Image
                  source={resolveImageSource(afterPhoto)}
                  style={styles.photo}
                  resizeMode="cover"
                  onLoad={() => {
                    console.log('[ShareableProgressCard] After photo loaded');
                    setAfterLoaded(true);
                  }}
                />
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>{resolvedAfterLabel}</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        ) : hasSinglePhoto ? (
          <View style={styles.singlePhotoSection}>
            <Animated.View style={[styles.singlePhotoWrapper, { opacity: fadeAnim }]}>
              <Image
                source={resolveImageSource(singlePhotoUrl)}
                style={styles.singlePhoto}
                resizeMode="cover"
                onLoad={() => {
                  console.log('[ShareableProgressCard] Single photo loaded');
                  setBeforeLoaded(true);
                }}
              />
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{singlePhotoLabel}</Text>
              </View>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.placeholderSection}>
            <Text style={styles.placeholderText}>
              Add progress photos to see your transformation
            </Text>
          </View>
        )}

        {/* ── LEADERBOARD BADGE ── */}
        {hasLeaderboard && (
          <View style={styles.leaderboardBadge}>
            <Text style={styles.leaderboardText}>{leaderboardPhrase}</Text>
          </View>
        )}

        {/* ── LOGO ── */}
        <View style={styles.logoPill}>
          <Image
            source={logoSource}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

      </LinearGradient>
    </CaptureWrapper>
  );
}

const styles = StyleSheet.create({
  captureWrapper: {
    width: 1080,
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    width: 1080,
    alignItems: 'center',
    paddingHorizontal: 72,
    paddingTop: 80,
    paddingBottom: 80,
  },

  // ── HEADER ──
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 56,
  },
  appName: {
    fontSize: 36,
    fontWeight: '600',
    color: '#5B9AA8',
    letterSpacing: 10,
    marginBottom: 24,
  },
  headerRule: {
    width: '100%',
    height: 1.5,
    backgroundColor: 'rgba(91,154,168,0.3)',
  },

  // ── BOTH PHOTOS ──
  photosSection: {
    width: '100%',
    marginBottom: 56,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoWrapper: {
    width: 456,
    height: 660,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(91,154,168,0.4)',
    shadowColor: '#5B9AA8',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    backgroundColor: '#1C1F2E',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  datePill: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 40,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  datePillText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // ── VS DIVIDER ──
  vsDivider: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1C2E',
    borderWidth: 2,
    borderColor: 'rgba(91,154,168,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vsText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5B9AA8',
  },

  // ── SINGLE PHOTO ──
  singlePhotoSection: {
    width: '100%',
    marginBottom: 56,
  },
  singlePhotoWrapper: {
    width: '100%',
    height: 660,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(91,154,168,0.4)',
    shadowColor: '#5B9AA8',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    backgroundColor: '#1C1F2E',
  },
  singlePhoto: {
    width: '100%',
    height: '100%',
  },

  // ── PLACEHOLDER ──
  placeholderSection: {
    width: '100%',
    height: 660,
    marginBottom: 56,
    borderRadius: 36,
    backgroundColor: '#1C1F2E',
    borderWidth: 3,
    borderColor: 'rgba(91,154,168,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 80,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 60,
  },

  // ── LEADERBOARD BADGE ──
  leaderboardBadge: {
    backgroundColor: 'rgba(91,154,168,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(91,154,168,0.4)',
    borderRadius: 100,
    paddingHorizontal: 56,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 56,
  },
  leaderboardText: {
    fontSize: 38,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 56,
  },

  // ── LOGO ──
  logoPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 60,
    paddingHorizontal: 48,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 84,
  },
});
