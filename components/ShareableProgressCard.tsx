
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
import * as FileSystem from 'expo-file-system/legacy';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import ProgressCircle from '@/components/ProgressCircle';

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

      // Capture the view as an image
      const uri = await viewShotRef.current.capture();
      console.log('[ShareableCard] Captured image URI:', uri);

      if (Platform.OS === 'web') {
        // On web, download the image
        const link = document.createElement('a');
        link.href = uri;
        link.download = 'fitness-progress.png';
        link.click();
        Alert.alert('Success', 'Image downloaded!');
      } else {
        // On mobile, use Share API
        await Share.share({
          url: uri,
          message: `Check out my fitness progress! 💪 ${disciplineScore}/100 Daily Discipline Score`,
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
    if (score >= 90) return '#10B981'; // Emerald green
    if (score >= 80) return '#5CB97B'; // Success green
    if (score >= 70) return '#5B9AA8'; // Teal
    if (score >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const caloriesRemaining = caloriesGoal - caloriesConsumed;

  return (
    <View style={styles.container}>
      {/* The card to be captured */}
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
        <View style={styles.card}>
          {/* Logo in top-right corner */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/02b0be00-cc51-4a2d-b5ec-a2936df17daa.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* User Greeting */}
          <Text style={styles.greeting}>Hi, {userName}</Text>

          {/* Large Central Score */}
          <View style={styles.scoreSection}>
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getScoreColor(disciplineScore) },
              ]}
            >
              <Text style={[styles.scoreValue, { color: getScoreColor(disciplineScore) }]}>
                {disciplineScore}
              </Text>
              <Text style={styles.scoreLabel}>Daily Discipline</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </View>

          {/* Date Range Badge */}
          <View style={styles.dateRangeBadge}>
            <Text style={styles.dateRangeText}>{dateRange}</Text>
          </View>

          {/* Calories Ring + Macro Bars */}
          <View style={styles.nutritionSection}>
            {/* Calories Ring */}
            <View style={styles.caloriesRing}>
              <View style={styles.ringWrapper}>
                <ProgressCircle
                  current={caloriesConsumed}
                  target={caloriesGoal}
                  size={160}
                  strokeWidth={14}
                  color={caloriesRemaining >= 0 ? '#5CB97B' : '#EF4444'}
                  label="kcal"
                />
              </View>
              <Text style={styles.caloriesLabel}>
                {caloriesRemaining >= 0 ? `${caloriesRemaining} left` : `${Math.abs(caloriesRemaining)} over`}
              </Text>
            </View>

            {/* Macro Bars */}
            <View style={styles.macrosSection}>
              {/* Protein */}
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {Math.round(protein)} / {proteinGoal}g
                </Text>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((protein / proteinGoal) * 100, 100)}%`,
                        backgroundColor: '#EF4444',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Carbs */}
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {Math.round(carbs)} / {carbsGoal}g
                </Text>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((carbs / carbsGoal) * 100, 100)}%`,
                        backgroundColor: '#3B82F6',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fats */}
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fats</Text>
                <Text style={styles.macroValue}>
                  {Math.round(fats)} / {fatsGoal}g
                </Text>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((fats / fatsGoal) * 100, 100)}%`,
                        backgroundColor: '#F59E0B',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fiber */}
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fiber</Text>
                <Text style={styles.macroValue}>
                  {Math.round(fiber)} / {fiberGoal}g
                </Text>
                <View style={styles.macroBarBg}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((fiber / fiberGoal) * 100, 100)}%`,
                        backgroundColor: '#10B981',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Three Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>🔥 {streakDays}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{proteinAccuracy}%</Text>
              <Text style={styles.statLabel}>Protein Accuracy</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>-{weightLost} lbs</Text>
              <Text style={styles.statLabel}>Weight Lost</Text>
            </View>
          </View>

          {/* Photo Progress Section */}
          {leftPhotoUrl && rightPhotoUrl && (
            <View style={styles.photoSection}>
              <Text style={styles.photoTitle}>Photo Progress</Text>
              <View style={styles.photosRow}>
                {/* Left Photo */}
                <View style={styles.photoWrapper}>
                  <View style={styles.photoPlaceholder}>
                    <Image
                      source={{ uri: leftPhotoUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      blurRadius={8}
                    />
                    <View style={styles.photoOverlay} />
                  </View>
                  {leftPhotoDate && (
                    <Text style={styles.photoDate}>{leftPhotoDate}</Text>
                  )}
                </View>

                {/* Arrow */}
                <View style={styles.arrowWrapper}>
                  <Text style={styles.arrow}>→</Text>
                </View>

                {/* Right Photo */}
                <View style={styles.photoWrapper}>
                  <View style={styles.photoPlaceholder}>
                    <Image
                      source={{ uri: rightPhotoUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      blurRadius={8}
                    />
                    <View style={styles.photoOverlay} />
                  </View>
                  {rightPhotoDate && (
                    <Text style={styles.photoDate}>{rightPhotoDate}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Bottom Callout */}
          <View style={styles.calloutSection}>
            <Text style={styles.calloutText}>Track. Improve. Win.</Text>
            <Text style={styles.appName}>BuiltToWin App</Text>
          </View>
        </View>
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
    backgroundColor: '#FFFFFF',
    padding: 60,
    position: 'relative',
  },
  logoContainer: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F7F8FC',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  greeting: {
    fontSize: 42,
    fontWeight: '700',
    color: '#2B2D42',
    marginTop: 20,
    marginBottom: 30,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
    elevation: 5,
  },
  scoreValue: {
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 100,
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  dateRangeBadge: {
    alignSelf: 'center',
    backgroundColor: '#5B9AA8',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginBottom: 30,
    boxShadow: '0px 4px 12px rgba(91, 154, 168, 0.3)',
    elevation: 3,
  },
  dateRangeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nutritionSection: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 30,
    alignItems: 'center',
  },
  caloriesRing: {
    alignItems: 'center',
    gap: 12,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  macrosSection: {
    flex: 1,
    gap: 20,
  },
  macroRow: {
    gap: 8,
  },
  macroLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2D42',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  macroBarBg: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2B2D42',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  photoSection: {
    marginBottom: 30,
  },
  photoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2D42',
    marginBottom: 16,
    textAlign: 'center',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  photoWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  photoDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  arrowWrapper: {
    paddingHorizontal: 10,
  },
  arrow: {
    fontSize: 40,
    color: '#5B9AA8',
    fontWeight: '700',
  },
  calloutSection: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  calloutText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2B2D42',
    marginBottom: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5B9AA8',
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
