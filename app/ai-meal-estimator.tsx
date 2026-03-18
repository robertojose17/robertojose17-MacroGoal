
import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import {
  requestPermissionsAsync as requestSpeechPermissionsAsync,
  isAvailableAsync as isSpeechAvailableAsync,
  transcribeAsync,
} from '@/modules/expo-speech-recognition/src';

// ─── Types ────────────────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_LABELS: Record<VoiceState, string> = {
  idle: 'Tap to speak',
  listening: 'Listening... tap to stop',
  processing: 'Processing...',
  error: 'Try again',
};

const VOICE_COLORS: Record<VoiceState, string> = {
  idle: colors.primary,
  listening: '#EF4444',
  processing: colors.primary,
  error: '#F59E0B',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  // Pulse animation for listening state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // expo-audio recorder (SDK 54 API)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Pulse animation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (voiceState === 'listening') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop.current?.stop();
    };
  }, [voiceState, pulseAnim]);

  // ── Analyze meal ─────────────────────────────────────────────────────────

  const handleAnalyze = async (description?: string) => {
    const text = (description ?? mealDescription).trim();
    if (!text) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    console.log('[AIMealEstimator] Analyze button pressed, description:', text);
    setIsAnalyzing(true);
    try {
      // Placeholder estimation — replace with real AI endpoint when available
      await new Promise(resolve => setTimeout(resolve, 1500));

      const estimated: NutritionResult = {
        calories: 450,
        protein: 25,
        carbs: 45,
        fats: 15,
        fiber: 5,
      };

      console.log('[AIMealEstimator] Estimation result:', estimated);
      setResult(estimated);
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', 'Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Voice: request permissions ───────────────────────────────────────────

  const requestPermissions = async (): Promise<boolean> => {
    console.log('[AIMealEstimator] Requesting microphone + speech recognition permissions...');
    try {
      // Request microphone permission via expo-audio
      const micStatus = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[AIMealEstimator] Microphone permission status:', micStatus.granted);
      if (!micStatus.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request speech recognition permission via native module
      const speechStatus = await requestSpeechPermissionsAsync();
      console.log('[AIMealEstimator] Speech recognition permission status:', speechStatus.granted);
      if (!speechStatus.granted) {
        Alert.alert(
          'Speech Recognition Permission Required',
          'Please enable speech recognition access in Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('[AIMealEstimator] Permission request error:', err);
      return false;
    }
  };

  // ── Voice: start recording ───────────────────────────────────────────────

  const startListening = async () => {
    console.log('[AIMealEstimator] Mic button pressed — starting voice input');

    // Check if Apple speech recognition is available on this device
    const available = await isSpeechAvailableAsync();
    console.log('[AIMealEstimator] Speech recognition available:', available);
    if (!available) {
      Alert.alert(
        'Not Available',
        'Speech recognition is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    const granted = await requestPermissions();
    if (!granted) return;

    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceState('listening');
      console.log('[AIMealEstimator] Recording started');
    } catch (err) {
      console.error('[AIMealEstimator] Failed to start recording:', err);
      setVoiceState('error');
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // ── Voice: stop recording & transcribe via Apple SFSpeechRecognizer ──────

  const stopListeningAndTranscribe = async () => {
    console.log('[AIMealEstimator] Stopping recording...');
    setVoiceState('processing');

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      console.log('[AIMealEstimator] Recording stopped, URI:', uri);

      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Transcribe using Apple's native SFSpeechRecognizer (on-device, no API key needed)
      console.log('[AIMealEstimator] Transcribing with Apple SFSpeechRecognizer...');
      const result = await transcribeAsync(uri, 'en-US');
      console.log('[AIMealEstimator] Transcription result:', result.text, '(confidence:', result.confidence, ')');

      const transcribedText = String(result.text ?? '').trim();

      if (!transcribedText) {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }

      // Fill the input field — do NOT auto-submit, user taps Analyze manually
      setMealDescription(transcribedText);
      setVoiceState('idle');
      console.log('[AIMealEstimator] Text field filled with transcription — awaiting user submit');
    } catch (err: any) {
      console.error('[AIMealEstimator] Voice transcription error:', err);
      setVoiceState('error');
      Alert.alert('Voice Input Error', err?.message ?? 'Could not process voice input. Please try again.');
    }
  };

  // ── Mic button handler ───────────────────────────────────────────────────

  const handleMicPress = () => {
    console.log('[AIMealEstimator] Mic button pressed, current voiceState:', voiceState);
    if (voiceState === 'listening') {
      stopListeningAndTranscribe();
    } else if (voiceState === 'idle' || voiceState === 'error') {
      startListening();
    }
    // Do nothing while processing
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const micIcon = voiceState === 'listening' ? 'mic-off' : 'mic';
  const micColor = VOICE_COLORS[voiceState];
  const voiceLabel = VOICE_LABELS[voiceState];
  const isMicDisabled = voiceState === 'processing';
  const bgColor = isDark ? '#1A1C2E' : colors.background;
  const cardBg = isDark ? '#252740' : colors.card;
  const textColor = isDark ? '#F1F5F9' : colors.text;
  const mutedColor = isDark ? '#A0A2B8' : '#6B7280';
  const borderColor = isDark ? '#3A3C52' : '#E5E7EB';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
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
            color={textColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>AI Meal Estimator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.infoText, { color: mutedColor }]}>
            Describe your meal by typing or using the microphone, then tap Analyze.
          </Text>
        </View>

        {/* Input label */}
        <Text style={[styles.label, { color: textColor }]}>Describe your meal</Text>

        {/* Input row: text field + mic button */}
        <View style={[styles.inputRow, { backgroundColor: cardBg, borderColor }]}>
          <TextInput
            style={[styles.textInput, { color: textColor }]}
            placeholder="e.g. Grilled chicken breast with rice and broccoli"
            placeholderTextColor={mutedColor}
            value={mealDescription}
            onChangeText={(t) => {
              setMealDescription(t);
            }}
            multiline
            textAlignVertical="top"
            editable={!isAnalyzing}
          />

          {/* Mic button */}
          <View style={styles.micColumn}>
            <TouchableOpacity
              onPress={handleMicPress}
              disabled={isMicDisabled}
              activeOpacity={0.75}
              style={styles.micButtonWrapper}
            >
              <Animated.View
                style={[
                  styles.micPulse,
                  {
                    backgroundColor: micColor + '28',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={[styles.micButton, { backgroundColor: micColor }]}>
                {voiceState === 'processing' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name={micIcon} size={22} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={[styles.micLabel, { color: mutedColor }]}>{voiceLabel}</Text>
          </View>
        </View>

        {/* Analyze button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            { backgroundColor: colors.primary },
            (isAnalyzing || !mealDescription.trim()) && styles.analyzeButtonDisabled,
          ]}
          onPress={() => handleAnalyze()}
          disabled={isAnalyzing || !mealDescription.trim()}
          activeOpacity={0.8}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
          )}
        </TouchableOpacity>

        {/* Result card */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.resultTitle, { color: textColor }]}>Estimated Nutrition</Text>

            <MacroRow label="Calories" value={`${result.calories} kcal`} color={colors.calories} labelColor={mutedColor} valueColor={textColor} />
            <MacroRow label="Protein" value={`${result.protein}g`} color={colors.protein} labelColor={mutedColor} valueColor={textColor} />
            <MacroRow label="Carbs" value={`${result.carbs}g`} color={colors.carbs} labelColor={mutedColor} valueColor={textColor} />
            <MacroRow label="Fats" value={`${result.fats}g`} color={colors.fats} labelColor={mutedColor} valueColor={textColor} />
            {result.fiber != null && (
              <MacroRow label="Fiber" value={`${result.fiber}g`} color={colors.fiber} labelColor={mutedColor} valueColor={textColor} />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface MacroRowProps {
  label: string;
  value: string;
  color: string;
  labelColor: string;
  valueColor: string;
}

function MacroRow({ label, value, color, labelColor, valueColor }: MacroRowProps) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.macroValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  // Input row: text area on left, mic column on right
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    minHeight: 120,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  micColumn: {
    width: 72,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  micButtonWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  micLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 4,
  },
  analyzeButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  macroLabel: {
    flex: 1,
    fontSize: 14,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
