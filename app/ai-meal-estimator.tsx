
import React, { useState, useEffect, useRef } from 'react';
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
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const mealDescriptionRef = useRef(mealDescription);

  useEffect(() => {
    mealDescriptionRef.current = mealDescription;
  }, [mealDescription]);

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const recognized = e.value?.[0] ?? '';
      console.log('[AIMealEstimator] Speech recognized:', recognized);
      if (recognized) {
        const current = mealDescriptionRef.current;
        const separator = current.trim().length > 0 ? ' ' : '';
        setMealDescription(current + separator + recognized);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('[AIMealEstimator] Speech error:', e.error);
      stopListening();
      const code = e.error?.code;
      if (code === '5' || String(code) === '5') {
        // Android: client-side error often means no speech detected — ignore
        return;
      }
      if (
        String(e.error?.message ?? '').toLowerCase().includes('permission') ||
        code === '9' ||
        String(code) === '9'
      ) {
        Alert.alert(
          'Permission Denied',
          'Microphone or speech recognition permission is required. Please enable it in Settings.',
        );
      } else {
        Alert.alert('Speech Error', 'Could not recognize speech. Please try again.');
      }
    };

    Voice.onSpeechEnd = () => {
      console.log('[AIMealEstimator] Speech ended');
      stopListening();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
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
      ]),
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (_) {
      // ignore
    }
    setIsListening(false);
    stopPulse();
  };

  const handleMicPress = async () => {
    if (isListening) {
      console.log('[AIMealEstimator] Mic button pressed — stopping listening');
      await stopListening();
      return;
    }

    console.log('[AIMealEstimator] Mic button pressed — starting listening');
    try {
      await Voice.start('en-US');
      setIsListening(true);
      startPulse();
    } catch (e: any) {
      console.error('[AIMealEstimator] Failed to start voice recognition:', e);
      const msg = String(e?.message ?? '').toLowerCase();
      if (msg.includes('permission')) {
        Alert.alert(
          'Permission Denied',
          'Microphone or speech recognition permission is required. Please enable it in Settings.',
        );
      } else {
        Alert.alert('Error', 'Could not start voice recognition. Please try again.');
      }
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
            borderColor: isListening ? '#ef4444' : colors.grey,
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
          <View style={styles.micRow}>
            {isListening && (
              <Text style={styles.listeningLabel}>Listening...</Text>
            )}
            <TouchableOpacity
              onPress={handleMicPress}
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <IconSymbol
                  ios_icon_name={isListening ? 'mic.fill' : 'mic'}
                  android_material_icon_name={isListening ? 'mic' : 'mic-none'}
                  size={22}
                  color={isListening ? '#fff' : colors.primary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
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
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  listeningLabel: {
    fontSize: typography.sm,
    color: '#ef4444',
    fontWeight: '500',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
});
