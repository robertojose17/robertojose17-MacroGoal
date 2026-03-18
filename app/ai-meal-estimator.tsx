
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
  Linking,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
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
  const [permissionError, setPermissionError] = useState('');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseOpacityAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseOpacityAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoopRef.current.start();
  }, [pulseAnim, pulseOpacityAnim]);

  const stopPulse = useCallback(() => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }
    Animated.parallel([
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim, pulseOpacityAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    };
  }, []);

  const handleAnalyze = useCallback(async (descriptionOverride?: string) => {
    const description = descriptionOverride ?? mealDescription;
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    console.log('[AIMealEstimator] Analyze button pressed, description:', description);
    setIsAnalyzing(true);
    setResult(null);
    try {
      console.log('[AIMealEstimator] Sending request to meal-estimator-analyze');
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/meal-estimator-analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: description.trim() }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIMealEstimator] API error response:', response.status, errorText);
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setResult(data as MealEstimateResult);
      console.log('[AIMealEstimator] Analysis complete:', data);
    } catch (error: any) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', error?.message ?? 'Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [mealDescription]);

  const requestMicPermission = async (): Promise<boolean> => {
    console.log('[AIMealEstimator] Requesting microphone permission');
    try {
      const audioStatus = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[AIMealEstimator] Microphone permission status:', audioStatus.status, 'granted:', audioStatus.granted);
      if (!audioStatus.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Microphone access is required for voice input. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { console.log('[AIMealEstimator] Opening Settings'); Linking.openSettings(); } },
          ]
        );
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AIMealEstimator] Permission request error:', err);
      return false;
    }
  };

  const startListening = async () => {
    console.log('[AIMealEstimator] Mic button pressed — starting voice recording');

    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const granted = await requestMicPermission();
    if (!granted) return;

    try {
      setLiveTranscript('');
      setPermissionError('');
      setMicState('listening');
      startPulse();
      isRecordingRef.current = true;

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      console.log('[AIMealEstimator] Recording started successfully');

      // Auto-stop after 10 seconds
      autoStopTimer.current = setTimeout(() => {
        console.log('[AIMealEstimator] Auto-stopping recording after 10s timeout');
        if (isRecordingRef.current) {
          stopListening();
        }
      }, 10000);
    } catch (err) {
      console.error('[AIMealEstimator] Failed to start recording:', err);
      isRecordingRef.current = false;
      setMicState('idle');
      stopPulse();
      setPermissionError('Could not start recording. Please try again.');
    }
  };

  const stopListening = async () => {
    console.log('[AIMealEstimator] Stopping voice recording');
    isRecordingRef.current = false;

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
      console.log('[AIMealEstimator] Sending audio to Supabase for transcription, URI:', uri);

      // Send audio file to Supabase transcription endpoint
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('language', 'en-US');

      console.log('[AIMealEstimator] POST to meal-estimator-transcribe');
      const transcribeResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/meal-estimator-transcribe`,
        {
          method: 'POST',
          body: formData,
        }
      );

      let transcribedText = '';

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json();
        transcribedText = (transcribeData?.text ?? '').trim();
        console.log('[AIMealEstimator] Transcription result:', transcribedText);
      } else {
        const errText = await transcribeResponse.text();
        console.warn('[AIMealEstimator] Transcription endpoint error:', transcribeResponse.status, errText);
        // Transcription service unavailable — prompt user to type instead
        setLiveTranscript('');
        setMicState('idle');
        Alert.alert(
          'Voice Input',
          'Voice transcription is not available right now. Please type your meal description.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (transcribedText) {
        setMealDescription(transcribedText);
        setLiveTranscript('');
        setMicState('idle');
        console.log('[AIMealEstimator] Auto-triggering analysis with transcribed text:', transcribedText);
        handleAnalyze(transcribedText);
      } else {
        setLiveTranscript('');
        setMicState('idle');
        setPermissionError('No speech detected. Please try again or type your meal.');
      }
    } catch (err: any) {
      console.error('[AIMealEstimator] Recording/transcription error:', err);
      setLiveTranscript('');
      setMicState('idle');

      if (err?.message === 'NATIVE_MODULE_UNAVAILABLE') {
        Alert.alert(
          'Voice Input',
          'Voice transcription requires a native build. Please type your meal description instead.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Voice Input Error',
          'Could not process voice input. Please type your meal description.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleMicPress = () => {
    console.log('[AIMealEstimator] Mic button tapped, current micState:', micState);
    if (micState === 'idle') {
      startListening();
    } else if (micState === 'listening') {
      stopListening();
    }
    // Do nothing while processing
  };

  const micButtonDisabled = micState === 'processing' || isAnalyzing;

  const listeningLabelText = micState === 'listening'
    ? 'Tap to stop'
    : micState === 'processing'
    ? 'Processing...'
    : 'Voice input';

  const micIconName: 'mic' | 'mic-off' = micState === 'listening' ? 'mic-off' : 'mic';
  const micBgColor = micState === 'listening' ? '#FF3B30' : colors.primary;

  const showListeningFeedback = liveTranscript !== '' || micState === 'listening';
  const listeningFeedbackText = micState === 'listening' ? 'Listening...' : liveTranscript;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => {
            console.log('[AIMealEstimator] Back button pressed');
            router.back();
          }}
          style={styles.backButton}
        >
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1C1C1E' : '#F0F2F7' }]}>
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

        {/* Input row: text field + mic button side by side */}
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#F0F2F7',
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

          {/* Mic button — always visible */}
          <View style={styles.micContainer}>
            <TouchableOpacity
              onPress={handleMicPress}
              disabled={micButtonDisabled}
              style={styles.micButtonWrapper}
              activeOpacity={0.75}
              accessibilityLabel={micState === 'listening' ? 'Stop recording' : 'Start voice input'}
              accessibilityRole="button"
            >
              {/* Pulsing ring behind the button when listening */}
              <Animated.View
                style={[
                  styles.micPulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseOpacityAnim,
                    backgroundColor: '#FF3B30',
                  },
                ]}
              />
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
                  <Ionicons name={micIconName} size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <Text style={[styles.micLabel, micState === 'listening' && styles.micLabelActive]}>
              {listeningLabelText}
            </Text>
          </View>
        </View>

        {/* Listening feedback */}
        {showListeningFeedback && (
          <View style={[styles.transcriptBox, { backgroundColor: isDark ? '#1C1C1E' : '#F0F2F7' }]}>
            <Ionicons name="mic" size={14} color="#6B7280" style={{ marginTop: 2 }} />
            <Text style={styles.transcriptText}>
              {listeningFeedbackText}
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
            <Text style={[styles.errorText, { color: colors.error }]}>
              {permissionError}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.analyzeButton,
            { backgroundColor: colors.primary },
            (isAnalyzing || micState !== 'idle') && styles.analyzeButtonDisabled,
          ]}
          onPress={() => {
            console.log('[AIMealEstimator] Analyze Meal button pressed');
            handleAnalyze();
          }}
          disabled={isAnalyzing || micState !== 'idle'}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: isDark ? '#1C1C1E' : '#F0F2F7' }]}>
            {/* Meal name + confidence badge */}
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
                {result.meal_name}
              </Text>
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: CONFIDENCE_COLORS[result.confidence] + '22' },
                ]}
              >
                <View
                  style={[
                    styles.confidenceDot,
                    { backgroundColor: CONFIDENCE_COLORS[result.confidence] },
                  ]}
                />
                <Text
                  style={[
                    styles.confidenceText,
                    { color: CONFIDENCE_COLORS[result.confidence] },
                  ]}
                >
                  {CONFIDENCE_LABELS[result.confidence]}
                </Text>
              </View>
            </View>

            {/* Calories highlight */}
            <View style={[styles.caloriesBox, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.caloriesNumber, { color: colors.primary }]}>
                {result.calories}
              </Text>
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
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {result.notes}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCell({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = color + (isDark ? '30' : '20');
  const labelColor = isDark ? '#aaa' : '#555';
  const displayValue = value + unit;
  return (
    <View style={[styles.macroCell, { backgroundColor: bgColor }]}>
      <Text style={[styles.macroCellValue, { color }]}>{displayValue}</Text>
      <Text style={[styles.macroCellLabel, { color: labelColor }]}>{label}</Text>
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
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 60,
  },
  micButtonWrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPulseRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  micLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  micLabelActive: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  transcriptBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    flex: 1,
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
