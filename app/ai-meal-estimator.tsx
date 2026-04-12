
import React, { useState } from 'react';
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
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/lib/supabase/client';

/**
 * AI Meal Estimator Screen
 * 
 * This screen allows users to describe their meal in text and get AI-powered
 * nutrition estimates. Premium feature — non-subscribers are redirected to the
 * subscription screen.
 * 
 * NOTE: All voice/microphone/transcription functionality has been removed.
 * Users can only input meal descriptions via text.
 */

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPremium, loading: premiumLoading } = usePremium();

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // --- Premium gate ---
  if (premiumLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.gateLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    console.log('[AIMealEstimator] Non-premium user attempted access — showing paywall');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Meal Estimator</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gateContainer}>
          <View style={[styles.gateIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.gateTitle, { color: colors.text }]}>Premium Feature</Text>
          <Text style={[styles.gateMessage, { color: colors.grey }]}>
            AI Meal Estimator is a premium feature. Describe any meal and get instant calorie and macro estimates — no barcode needed.
          </Text>
          <TouchableOpacity
            style={[styles.gateButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              console.log('[AIMealEstimator] User tapped Upgrade to Premium');
              router.push('/subscription');
            }}
          >
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.gateButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gateBackButton}
            onPress={() => {
              console.log('[AIMealEstimator] Non-premium user tapped Go Back');
              router.back();
            }}
          >
            <Text style={[styles.gateBackText, { color: colors.grey }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // --- End premium gate ---

  const handleAnalyze = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    console.log('[AIMealEstimator] Analyzing meal:', mealDescription.trim());
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-meal', {
        body: { description: mealDescription.trim() },
      });

      if (error || !data) {
        throw new Error('Failed to analyze meal. Please try again.');
      }

      console.log('[AIMealEstimator] Result received:', data);
      setResult({
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
      });
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to analyze meal');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
        
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundAlt,
              color: colors.text,
              borderColor: colors.grey,
            },
          ]}
          placeholder="e.g., Grilled chicken breast with rice and broccoli"
          placeholderTextColor={colors.grey}
          value={mealDescription}
          onChangeText={setMealDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

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
                {result.calories} kcal
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.protein}g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Carbs
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.carbs}g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Fats
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.fats}g
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
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.md,
    minHeight: 120,
    marginBottom: spacing.lg,
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
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    fontSize: typography.md,
  },
  macroValue: {
    fontSize: typography.md,
    fontWeight: '500',
  },
  gateLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  gateIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  gateTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  gateMessage: {
    fontSize: typography.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  gateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  gateButtonText: {
    color: '#FFFFFF',
    fontSize: typography.md,
    fontWeight: '700',
  },
  gateBackButton: {
    paddingVertical: spacing.sm,
  },
  gateBackText: {
    fontSize: typography.md,
    textDecorationLine: 'underline',
  },
});
