
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { useSpeechInput } from '@/hooks/useSpeechInput';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Accumulates confirmed (final) speech text so partial updates don't erase it
  const confirmedTextRef = useRef('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      console.log('[AIMealEstimator] Final transcript received:', text);
      const separator = confirmedTextRef.current ? ' ' : '';
      const next = confirmedTextRef.current + separator + text;
      confirmedTextRef.current = next;
      setMealDescription(next);
    } else {
      console.log('[AIMealEstimator] Interim transcript:', text);
      const separator = confirmedTextRef.current ? ' ' : '';
      setMealDescription(confirmedTextRef.current + separator + text);
    }
  }, []);

  const speech = useSpeechInput(handleTranscript);

  // Pulse animation while recording
  useEffect(() => {
    if (speech.isListening) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [speech.isListening, pulseAnim]);

  const handleMicPress = useCallback(async () => {
    if (speech.isListening) {
      console.log('[AIMealEstimator] Mic button pressed — stopping recording');
      await speech.stopListening();
    } else {
      console.log('[AIMealEstimator] Mic button pressed — starting recording');
      // Reset confirmed text accumulator so new recording appends cleanly
      confirmedTextRef.current = mealDescription;
      await speech.startListening();
    }
  }, [speech, mealDescription]);

  const handleAnalyze = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }
    console.log('[AIMealEstimator] Analyze button pressed, description:', mealDescription);
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

  const isProcessing = speech.state === 'processing';
  const micIconName = speech.isListening ? 'mic-off' : 'mic';
  const micColor = speech.isListening ? '#EF4444' : colors.primary;
  const listeningLabel = speech.isListening ? 'Listening…' : isProcessing ? 'Processing…' : null;

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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundAlt ?? colors.card }]}>
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

        {/* Input + mic button row */}
        <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundAlt ?? colors.card, borderColor: speech.isListening ? '#EF4444' : colors.border ?? '#E5E7EB' }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g., Grilled chicken breast with rice and broccoli"
            placeholderTextColor={colors.grey ?? colors.textSecondary}
            value={mealDescription}
            onChangeText={(text) => {
              confirmedTextRef.current = text;
              setMealDescription(text);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {speech.isAvailable && (
            <View style={styles.micContainer}>
              {(speech.isListening || isProcessing) && (
                <Text style={styles.listeningLabel}>
                  {listeningLabel}
                </Text>
              )}
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={isProcessing}
                style={[styles.micButton, speech.isListening && styles.micButtonActive]}
                activeOpacity={0.7}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MaterialIcons name={micIconName} size={22} color={micColor} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundAlt ?? colors.card }]}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Estimated Nutrition
            </Text>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey ?? colors.textSecondary }]}>
                Calories
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.calories}
                <Text style={[styles.macroUnit, { color: colors.grey ?? colors.textSecondary }]}> kcal</Text>
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey ?? colors.textSecondary }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.protein}
                <Text style={[styles.macroUnit, { color: colors.grey ?? colors.textSecondary }]}>g</Text>
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey ?? colors.textSecondary }]}>
                Carbs
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.carbs}
                <Text style={[styles.macroUnit, { color: colors.grey ?? colors.textSecondary }]}>g</Text>
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey ?? colors.textSecondary }]}>
                Fats
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.fats}
                <Text style={[styles.macroUnit, { color: colors.grey ?? colors.textSecondary }]}>g</Text>
              </Text>
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
  // Wrapper replaces the old bare TextInput — adds mic button in bottom-right
  inputWrapper: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  input: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  micContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  listeningLabel: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
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
  macroUnit: {
    fontSize: 14,
    fontWeight: '400',
  },
});
