
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
import * as SpeechRecognition from 'expo-speech-recognition';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Haptics from 'expo-haptics';

type MicState = 'idle' | 'listening' | 'processing';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

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
    try {
      // TODO: Backend Integration - Call the AI meal estimation API endpoint here
      await new Promise(resolve => setTimeout(resolve, 1500));

      setResult({
        calories: 450,
        protein: 25,
        carbs: 45,
        fats: 15,
        fiber: 5,
      });
      console.log('[AIMealEstimator] Analysis complete');
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', 'Failed to analyze meal');
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
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Estimated Nutrition
            </Text>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Calories</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>{result.calories} kcal</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>{result.protein}g</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>{result.carbs}g</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fats</Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>{result.fats}g</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  resultCard: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    fontSize: 16,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
