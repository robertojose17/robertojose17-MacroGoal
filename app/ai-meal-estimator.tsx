
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useAppleSpeech } from '@/hooks/useAppleSpeech';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Pulse animation for listening state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const handleTranscript = useCallback((text: string) => {
    setMealDescription(text);
  }, []);

  const { status: speechStatus, error: speechError, startListening, stopListening } = useAppleSpeech(handleTranscript);

  // Start/stop pulse animation based on listening state
  useEffect(() => {
    if (speechStatus === 'listening') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [speechStatus, pulseAnim]);

  const handleMicPress = async () => {
    if (speechStatus === 'listening') {
      console.log('[AIMealEstimator] Mic button pressed — stopping listening');
      await stopListening();
    } else {
      console.log('[AIMealEstimator] Mic button pressed — starting listening');
      await startListening();
    }
  };

  const handleAnalyze = async () => {
    console.log('[AIMealEstimator] Analyze button pressed, description:', mealDescription.trim());
    if (!mealDescription.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('[AIMealEstimator] Sending meal analysis request');
      // TODO: Backend Integration - Call the AI meal estimation API endpoint here
      // Placeholder result for now
      await new Promise(resolve => setTimeout(resolve, 1500));

      setResult({
        calories: 450,
        protein: 25,
        carbs: 45,
        fats: 15,
        fiber: 5,
      });
      console.log('[AIMealEstimator] Meal analysis complete');
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', 'Failed to analyze meal');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isListening = speechStatus === 'listening';
  const isProcessing = speechStatus === 'processing';
  const isError = speechStatus === 'error';

  const micIconColor = isListening ? '#FF3B30' : isError ? '#FF3B30' : colors.primary;
  const micIconName = isError ? 'mic.slash.fill' : isListening ? 'mic.fill' : 'mic.fill';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => {
          console.log('[AIMealEstimator] Back button pressed');
          router.back();
        }} style={styles.backButton}>
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
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundAlt }]}>
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

        <View style={[
          styles.inputContainer,
          {
            backgroundColor: colors.backgroundAlt,
            borderColor: isListening ? '#FF3B30' : isError ? '#FF3B30' : colors.grey,
          },
        ]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g., Grilled chicken breast with rice and broccoli"
            placeholderTextColor={colors.grey}
            value={mealDescription}
            onChangeText={(text) => {
              setMealDescription(text);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {Platform.OS === 'ios' && (
            <View style={styles.micContainer}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.micButton} />
              ) : (
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[
                    styles.micButton,
                    isListening && styles.micButtonListening,
                  ]}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ opacity: isListening ? pulseAnim : 1 }}>
                    <IconSymbol
                      ios_icon_name={micIconName}
                      android_material_icon_name="mic"
                      size={22}
                      color={micIconColor}
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {isListening && (
          <View style={styles.listeningBadge}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningText}>
              Listening... tap mic to stop
            </Text>
          </View>
        )}

        {isError && speechError && (
          <View style={styles.errorRow}>
            <IconSymbol
              ios_icon_name="exclamationmark.circle.fill"
              android_material_icon_name="error"
              size={14}
              color="#FF3B30"
            />
            <Text style={styles.errorText}>
              {speechError}
            </Text>
          </View>
        )}

        {isError && (
          <Text style={styles.retryHint}>
            Tap mic to retry
          </Text>
        )}

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
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundAlt }]}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Estimated Nutrition
            </Text>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Calories
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.calories}
              </Text>
              <Text style={[styles.macroUnit, { color: colors.grey }]}>
                kcal
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.protein}
              </Text>
              <Text style={[styles.macroUnit, { color: colors.grey }]}>
                g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Carbs
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.carbs}
              </Text>
              <Text style={[styles.macroUnit, { color: colors.grey }]}>
                g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Fats
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.fats}
              </Text>
              <Text style={[styles.macroUnit, { color: colors.grey }]}>
                g
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
    fontSize: typography.lg,
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
    fontSize: typography.sm,
    lineHeight: 20,
  },
  label: {
    fontSize: typography.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    minHeight: 120,
  },
  input: {
    padding: spacing.md,
    fontSize: typography.md,
    minHeight: 100,
    paddingRight: 52,
  },
  micContainer: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonListening: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  listeningText: {
    fontSize: typography.sm,
    color: '#FF3B30',
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  errorText: {
    fontSize: typography.xs ?? 12,
    color: '#FF3B30',
    flex: 1,
  },
  retryHint: {
    fontSize: typography.xs ?? 12,
    color: '#FF3B30',
    opacity: 0.7,
    marginBottom: spacing.sm,
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
    fontSize: typography.md,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  resultTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    fontSize: typography.md,
    flex: 1,
  },
  macroValue: {
    fontSize: typography.md,
    fontWeight: '500',
  },
  macroUnit: {
    fontSize: typography.sm,
    marginLeft: 2,
    width: 28,
  },
});
