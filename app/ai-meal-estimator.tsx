
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import * as SpeechRecognition from '../modules/expo-speech-recognition';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';

type MicState = 'idle' | 'listening' | 'processing';

type MealEstimateResult = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  meal_name: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#34C759',
  medium: '#FF9500',
  low: '#FF3B30',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MealEstimateResult | null>(null);

  const [micState, setMicState] = useState<MicState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState('');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animation values
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startPulse = useCallback(() => {
    pulseScale.value = withRepeat(
      withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseScale, pulseOpacity]);

  const stopPulse = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = withTiming(1, { duration: 200 });
    pulseOpacity.value = withTiming(0.8, { duration: 200 });
  }, [pulseScale, pulseOpacity]);

  // Check speech recognition availability on mount
  useEffect(() => {
    SpeechRecognition.isAvailableAsync().then((available) => {
      console.log('[AIMealEstimator] Speech recognition available:', available);
      setSpeechAvailable(available);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    };
  }, []);

  const handleAnalyze = async (descriptionOverride?: string) => {
    const description = descriptionOverride ?? mealDescription;
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    console.log('[AIMealEstimator] Analyze button pressed, description:', description);
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/meal-estimator-analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: description.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to analyze meal');
      }

      setResult(data as MealEstimateResult);
      console.log('[AIMealEstimator] Analysis complete:', data);
    } catch (error: any) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', error?.message ?? 'Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    console.log('[AIMealEstimator] Requesting microphone permissions');
    try {
      const audioStatus = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[AIMealEstimator] Audio permission status:', audioStatus.status);
      if (!audioStatus.granted) {
        setPermissionError('Microphone access is needed for voice input. Please enable it in Settings.');
        return false;
      }

      const speechStatus = await SpeechRecognition.requestPermissionsAsync();
      console.log('[AIMealEstimator] Speech recognition permission granted:', speechStatus.granted);
      if (!speechStatus.granted) {
        setPermissionError('Microphone access is needed for voice input. Please enable it in Settings.');
        return false;
      }

      setPermissionError('');
      return true;
    } catch (err) {
      console.error('[AIMealEstimator] Permission request error:', err);
      setPermissionError('Could not request microphone permissions.');
      return false;
    }
  };

  const startListening = async () => {
    console.log('[AIMealEstimator] Mic button pressed — starting voice input');

    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const granted = await requestPermissions();
    if (!granted) return;

    try {
      setLiveTranscript('');
      setMicState('listening');
      startPulse();

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      console.log('[AIMealEstimator] Recording started');

      // Auto-stop after 10 seconds
      autoStopTimer.current = setTimeout(() => {
        console.log('[AIMealEstimator] Auto-stopping recording after timeout');
        stopListening();
      }, 10000);
    } catch (err) {
      console.error('[AIMealEstimator] Failed to start recording:', err);
      setMicState('idle');
      stopPulse();
      setPermissionError('Could not start recording. Please try again.');
    }
  };

  const stopListening = async () => {
    console.log('[AIMealEstimator] Stopping voice recording');

    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }

    stopPulse();
    setMicState('processing');

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      console.log('[AIMealEstimator] Recording stopped, URI:', uri);

      if (!uri) {
        throw new Error('No audio URI after recording');
      }

      setLiveTranscript('Transcribing...');
      console.log('[AIMealEstimator] Sending audio to speech recognition, URI:', uri);

      const transcription = await SpeechRecognition.transcribeAsync(uri, 'en-US');
      console.log('[AIMealEstimator] Transcription result:', transcription.text, 'confidence:', transcription.confidence);

      const transcribedText = transcription.text.trim();
      if (transcribedText) {
        setMealDescription(transcribedText);
        setLiveTranscript('');
        setMicState('idle');
        // Auto-trigger analysis
        console.log('[AIMealEstimator] Auto-triggering analysis with transcribed text:', transcribedText);
        handleAnalyze(transcribedText);
      } else {
        setLiveTranscript('');
        setMicState('idle');
        setPermissionError('No speech detected. Please try again.');
      }
    } catch (err: any) {
      console.error('[AIMealEstimator] Transcription error:', err);
      setLiveTranscript('');
      setMicState('idle');
      setPermissionError('Could not transcribe speech. Please try again or type your meal.');
    }
  };

  const handleMicPress = () => {
    if (micState === 'idle') {
      startListening();
    } else if (micState === 'listening') {
      stopListening();
    }
    // Do nothing while processing
  };

  const micButtonDisabled = micState === 'processing' || isAnalyzing;

  const listeningLabel = micState === 'listening' ? 'Tap to stop' : micState === 'processing' ? 'Processing...' : '';

  const micIconName = micState === 'listening' ? 'mic.slash.fill' : 'mic.fill';
  const micAndroidIcon = micState === 'listening' ? 'mic-off' : 'mic';

  const micBgColor = micState === 'listening' ? '#FF3B30' : micState === 'processing' ? colors.primary : colors.primary;

  const showMic = speechAvailable === true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => { console.log('[AIMealEstimator] Back button pressed'); router.back(); }} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          AI Meal Estimator
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundAlt ?? '#F0F2F7' }]}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Describe your meal and get instant nutrition estimates powered by AI
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>
          Describe your meal
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundAlt ?? '#F0F2F7',
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="e.g., Grilled chicken breast with rice and broccoli"
            placeholderTextColor={colors.textSecondary}
            value={mealDescription}
            onChangeText={(text) => {
              setMealDescription(text);
              if (permissionError) setPermissionError('');
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={micState === 'idle'}
          />

          {showMic && (
            <View style={styles.micContainer}>
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={micButtonDisabled}
                style={styles.micButtonWrapper}
                activeOpacity={0.8}
              >
                {micState === 'listening' && (
                  <Animated.View
                    style={[
                      styles.micPulseRing,
                      { backgroundColor: '#FF3B30' },
                      pulseStyle,
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.micButton,
                    { backgroundColor: micBgColor },
                    micButtonDisabled && styles.micButtonDisabled,
                  ]}
                >
                  {micState === 'processing' ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <IconSymbol
                      ios_icon_name={micIconName}
                      android_material_icon_name={micAndroidIcon}
                      size={22}
                      color="#fff"
                    />
                  )}
                </View>
              </TouchableOpacity>

              {listeningLabel !== '' && (
                <Text style={styles.micLabel}>{listeningLabel}</Text>
              )}
            </View>
          )}
        </View>

        {/* Live transcript preview */}
        {(liveTranscript !== '' || micState === 'listening') && (
          <View style={[styles.transcriptBox, { backgroundColor: colors.backgroundAlt ?? '#F0F2F7' }]}>
            <Text style={styles.transcriptText}>
              {micState === 'listening' ? 'Listening...' : liveTranscript}
            </Text>
          </View>
        )}

        {/* Permission / error message */}
        {permissionError !== '' && (
          <View style={styles.errorRow}>
            <IconSymbol
              ios_icon_name="exclamationmark.circle"
              android_material_icon_name="error-outline"
              size={16}
              color={colors.error}
            />
            <Text style={[styles.errorText, { color: colors.error }]}>{permissionError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.analyzeButton, (isAnalyzing || micState !== 'idle') && styles.analyzeButtonDisabled]}
          onPress={() => handleAnalyze()}
          disabled={isAnalyzing || micState !== 'idle'}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundAlt ?? '#F0F2F7' }]}>
            {/* Meal name + confidence badge */}
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
                {result.meal_name}
              </Text>
              <View style={[styles.confidenceBadge, { backgroundColor: CONFIDENCE_COLORS[result.confidence] + '22' }]}>
                <View style={[styles.confidenceDot, { backgroundColor: CONFIDENCE_COLORS[result.confidence] }]} />
                <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[result.confidence] }]}>
                  {CONFIDENCE_LABELS[result.confidence]}
                </Text>
              </View>
            </View>

            {/* Calories highlight */}
            <View style={[styles.caloriesBox, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.caloriesNumber, { color: colors.primary }]}>{result.calories}</Text>
              <Text style={[styles.caloriesUnit, { color: colors.primary }]}>kcal</Text>
            </View>

            {/* Macros grid */}
            <View style={styles.macrosGrid}>
              <MacroCell label="Protein" value={result.protein} unit="g" color="#FF6B6B" />
              <MacroCell label="Carbs" value={result.carbs} unit="g" color="#4ECDC4" />
              <MacroCell label="Fats" value={result.fats} unit="g" color="#FFE66D" />
              <MacroCell label="Fiber" value={result.fiber} unit="g" color="#A8E6CF" />
            </View>

            {/* Notes */}
            {result.notes ? (
              <View style={[styles.notesBox, { borderColor: colors.border }]}>
                <IconSymbol
                  ios_icon_name="lightbulb.fill"
                  android_material_icon_name="lightbulb-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{result.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCell({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <View style={[styles.macroCell, { backgroundColor: color + (isDark ? '30' : '20') }]}>
      <Text style={[styles.macroCellValue, { color }]}>{value}{unit}</Text>
      <Text style={[styles.macroCellLabel, { color: isDark ? '#aaa' : '#555' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 120,
  },
  micContainer: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    gap: spacing.xs,
  },
  micButtonWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  micLabel: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '500',
    textAlign: 'center',
  },
  transcriptBox: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#6B7280',
    lineHeight: 18,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Result card
  resultCard: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultHeader: {
    gap: spacing.xs,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  confidenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  caloriesBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  caloriesNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  caloriesUnit: {
    fontSize: 18,
    fontWeight: '500',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  macroCellValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  macroCellLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
