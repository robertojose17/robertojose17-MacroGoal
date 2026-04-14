
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';

// react-native-view-shot requires a native build — lazy import so Expo Go doesn't hang
let ViewShot: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { ViewShot = require('react-native-view-shot').default; } catch {}
}
const CaptureWrapper: any = ViewShot || View;

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
  leaderboardPhrase,
  onCapture,
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<any>(null);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);

  const hasLeaderboard = !!leaderboardPhrase;

  useEffect(() => {
    if (onCapture && viewShotRef.current) {
      onCapture(viewShotRef);
    }
  }, [onCapture]);

  return (
    <CaptureWrapper
      ref={viewShotRef}
      options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      style={styles.captureWrapper}
    >
      <View style={styles.card}>
        {/* ── PHOTOS ROW ── */}
        <View style={styles.photoRow}>
          <View style={styles.photoContainer}>
            {!beforeLoaded && (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              </View>
            )}
            <Image
              source={resolveImageSource(beforePhoto)}
              style={styles.photo}
              resizeMode="cover"
              onLoad={() => {
                console.log('[ShareableProgressCard] Before photo loaded');
                setBeforeLoaded(true);
              }}
            />
          </View>
          <View style={styles.photoContainer}>
            {!afterLoaded && (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              </View>
            )}
            <Image
              source={resolveImageSource(afterPhoto)}
              style={styles.photo}
              resizeMode="cover"
              onLoad={() => {
                console.log('[ShareableProgressCard] After photo loaded');
                setAfterLoaded(true);
              }}
            />
          </View>
        </View>

        {/* ── LEADERBOARD BADGE ── */}
        {hasLeaderboard && (
          <View style={styles.badgeContainer}>
            <View style={styles.leaderboardBadge}>
              <Text style={styles.leaderboardText}>{leaderboardPhrase}</Text>
            </View>
          </View>
        )}
      </View>
    </CaptureWrapper>
  );
}

const styles = StyleSheet.create({
  captureWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    overflow: 'hidden',
  },
  photoRow: {
    flexDirection: 'row',
    width: '100%',
    height: 320,
  },
  photoContainer: {
    width: '50%',
    height: '100%',
    backgroundColor: '#1A1A1A',
  },
  photoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    zIndex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  leaderboardBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  leaderboardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
