
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

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
}: ShareableProgressCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShare = async () => {
    try {
      setIsCapturing(true);
      console.log('[ShareableCard] Starting capture...');

      if (!viewShotRef.current) {
        Alert.alert('Error', 'Unable to capture card');
        setIsCapturing(false);
        return;
      }

      const uri = await viewShotRef.current.capture();
      console.log('[ShareableCard] Captured image URI:', uri);

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = 'fitness-progress.png';
        link.click();
        Alert.alert('Success', 'Image downloaded!');
      } else {
        await Share.share({
          url: uri,
          message: `Check out my fitness progress! 💪 ${disciplineScore}/100 Consistency Score`,
        });
      }

      setIsCapturing(false);
    } catch (error) {
      console.error('[ShareableCard] Error sharing:', error);
      Alert.alert('Error', 'Failed to share card');
      setIsCapturing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#5CB97B';
    if (score >= 70) return '#5B9AA8';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 1.0,
          width: 1080,
          height: 1080,
        }}
        style={styles.captureContainer}
      >
        <LinearGradient
          colors={['#FAFBFC', '#F0F2F7', '#E8EBF2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* App Logo - Top Right Corner */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/02b0be00-cc51-4a2d-b5ec-a2936df17daa.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* User's Name - Prominent at Top */}
          <Text style={styles.userName}>{userName}&apos;s Journey</Text>

          {/* Consistency Score - Big, Bold, Visually Powerful */}
          <View style={styles.scoreSection}>
            <View
              style={[
                styles.scoreCircle,
                { 
                  borderColor: getScoreColor(disciplineScore),
                  boxShadow: `0px 12px 32px ${getScoreColor(disciplineScore)}40`,
                },
              ]}
            >
              <Text style={[styles.scoreValue, { color: getScoreColor(disciplineScore) }]}>
                {disciplineScore}
              </Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <Text style={styles.scoreLabel}>Consistency Score</Text>
          </View>

          {/* Progress Metrics - Clean, Minimal */}
          <View style={styles.metricsSection}>
            <View style={styles.metricCard}>
              <Text style={styles.metricEmoji}>🔥</Text>
              <Text style={styles.metricValue}>{streakDays}</Text>
              <Text style={styles.metricLabel}>Day Streak</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricEmoji}>💪</Text>
              <Text style={styles.metricValue}>{proteinAccuracy}%</Text>
              <Text style={styles.metricLabel}>Protein Accuracy</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricEmoji}>⚖️</Text>
              <Text style={styles.metricValue}>-{weightLost.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>lbs Lost</Text>
            </View>
          </View>

          {/* Before & After Photos - Beautifully Framed */}
          {leftPhotoUrl && rightPhotoUrl && (
            <View style={styles.photoSection}>
              <Text style={styles.photoTitle}>Transformation</Text>
              <View style={styles.photosRow}>
                {/* Before Photo */}
                <View style={styles.photoWrapper}>
                  <View style={styles.photoFrame}>
                    <Image
                      source={{ uri: leftPhotoUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      blurRadius={10}
                    />
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoOverlayText}>BEFORE</Text>
                    </View>
                  </View>
                  {leftPhotoDate && (
                    <Text style={styles.photoDate}>{leftPhotoDate}</Text>
                  )}
                </View>

                {/* Arrow */}
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>

                {/* After Photo */}
                <View style={styles.photoWrapper}>
                  <View style={styles.photoFrame}>
                    <Image
                      source={{ uri: rightPhotoUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      blurRadius={10}
                    />
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoOverlayText}>AFTER</Text>
                    </View>
                  </View>
                  {rightPhotoDate && (
                    <Text style={styles.photoDate}>{rightPhotoDate}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Bottom Tagline - Subtle */}
          <View style={styles.taglineSection}>
            <Text style={styles.tagline}>Track. Improve. Win.</Text>
            <Text style={styles.appName}>BuiltToWin App</Text>
          </View>
        </LinearGradient>
      </ViewShot>

      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        disabled={isCapturing}
      >
        <IconSymbol
          ios_icon_name="square.and.arrow.up"
          android_material_icon_name="share"
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.shareButtonText}>
          {isCapturing ? 'Preparing...' : 'Share Progress Card'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  captureContainer: {
    width: 1080,
    height: 1080,
  },
  card: {
    width: 1080,
    height: 1080,
    padding: 70,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 70,
    height: 70,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1C2E',
    letterSpacing: -1,
    marginTop: 20,
    textAlign: 'center',
  },
  scoreSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 120,
    fontWeight: '900',
    lineHeight: 120,
    letterSpacing: -4,
  },
  scoreOutOf: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: -10,
  },
  scoreLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2B2D42',
    letterSpacing: 0.5,
  },
  metricsSection: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 30,
    width: '100%',
    justifyContent: 'center',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.06)',
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  metricEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1A1C2E',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  photoSection: {
    width: '100%',
    marginVertical: 20,
  },
  photoTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1C2E',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    justifyContent: 'center',
  },
  photoWrapper: {
    alignItems: 'center',
    gap: 14,
  },
  photoFrame: {
    width: 340,
    height: 450,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.12)',
    elevation: 6,
    borderWidth: 6,
    borderColor: '#FFFFFF',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  photoDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  arrowContainer: {
    paddingHorizontal: 10,
  },
  arrow: {
    fontSize: 50,
    color: '#5B9AA8',
    fontWeight: '700',
  },
  taglineSection: {
    alignItems: 'center',
    paddingTop: 30,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    width: '100%',
  },
  tagline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2B2D42',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#5B9AA8',
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    boxShadow: '0px 4px 12px rgba(91, 154, 168, 0.3)',
    elevation: 3,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
