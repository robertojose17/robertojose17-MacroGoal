
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { estimateMealWithGemini } from '@/utils/aiMealEstimator';

export default function TestAIScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [testDescription, setTestDescription] = useState('grilled chicken breast with broccoli and brown rice');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    console.log('========================================');
    console.log('🧪 STARTING AI MEAL ESTIMATOR TEST');
    console.log('========================================');

    try {
      const startTime = Date.now();
      const estimation = await estimateMealWithGemini(testDescription, null);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('========================================');
      console.log('✅ TEST PASSED!');
      console.log('Duration:', duration, 'ms');
      console.log('Items:', estimation.items.length);
      console.log('Total Calories:', estimation.total.calories);
      console.log('Confidence:', estimation.confidence);
      console.log('========================================');

      setResult({
        ...estimation,
        duration,
      });

      Alert.alert(
        '✅ Test Passed!',
        `AI estimation successful!\n\nDuration: ${duration}ms\nItems: ${estimation.items.length}\nCalories: ${estimation.total.calories}\nConfidence: ${(estimation.confidence * 100).toFixed(0)}%`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.error('========================================');
      console.error('❌ TEST FAILED!');
      console.error('Error:', err.message);
      console.error('========================================');

      setError(err.message);

      Alert.alert(
        '❌ Test Failed',
        err.message,
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Test AI Integration
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            🧪 Quick Test
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Test the AI Meal Estimator integration with Google Gemini
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { 
                backgroundColor: isDark ? colors.backgroundDark : colors.background,
                borderColor: isDark ? colors.borderDark : colors.border,
                color: isDark ? colors.textDark : colors.text
              }
            ]}
            placeholder="Enter a meal description to test..."
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={testDescription}
            onChangeText={setTestDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.testButton,
              { 
                backgroundColor: colors.primary,
                opacity: (testing || !testDescription.trim()) ? 0.5 : 1
              }
            ]}
            onPress={runTest}
            disabled={testing || !testDescription.trim()}
            activeOpacity={0.7}
          >
            {testing ? (
              <View style={styles.testingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.testButtonText}>Testing...</Text>
              </View>
            ) : (
              <Text style={styles.testButtonText}>Run Test</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.card, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: '#FF3B30', borderWidth: 1 }]}>
            <View style={styles.errorHeader}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="error"
                size={32}
                color="#FF3B30"
              />
              <Text style={[styles.errorTitle, { color: '#FF3B30' }]}>
                Test Failed
              </Text>
            </View>
            <Text style={[styles.errorText, { color: '#FF3B30' }]}>
              {error}
            </Text>
          </View>
        )}

        {result && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={styles.successHeader}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={32}
                color={colors.success}
              />
              <Text style={[styles.successTitle, { color: colors.success }]}>
                Test Passed!
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Duration:
              </Text>
              <Text style={[styles.resultValue, { color: isDark ? colors.textDark : colors.text }]}>
                {result.duration}ms
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Items:
              </Text>
              <Text style={[styles.resultValue, { color: isDark ? colors.textDark : colors.text }]}>
                {result.items.length}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Total Calories:
              </Text>
              <Text style={[styles.resultValue, { color: isDark ? colors.textDark : colors.text }]}>
                {result.total.calories}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Confidence:
              </Text>
              <Text style={[styles.resultValue, { color: isDark ? colors.textDark : colors.text }]}>
                {(result.confidence * 100).toFixed(0)}%
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.itemsTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Ingredients:
            </Text>
            {result.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemCard}>
                <Text style={[styles.itemName, { color: isDark ? colors.textDark : colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {item.serving}
                </Text>
                <View style={styles.itemMacros}>
                  <Text style={[styles.itemMacro, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    {item.calories} cal
                  </Text>
                  <Text style={[styles.itemMacro, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    P: {item.protein_g}g
                  </Text>
                  <Text style={[styles.itemMacro, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    C: {item.carbs_g}g
                  </Text>
                  <Text style={[styles.itemMacro, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    F: {item.fat_g}g
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            📋 Checklist
          </Text>
          <View style={styles.checklistItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle"
              android_material_icon_name="check_circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.checklistText, { color: isDark ? colors.textDark : colors.text }]}>
              API key added to Supabase Edge Functions
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle"
              android_material_icon_name="check_circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.checklistText, { color: isDark ? colors.textDark : colors.text }]}>
              Edge Function deployed (gemini-meal-estimate)
            </Text>
          </View>
          <View style={styles.checklistItem}>
            <IconSymbol
              ios_icon_name="checkmark.circle"
              android_material_icon_name="check_circle"
              size={20}
              color={colors.success}
            />
            <Text style={[styles.checklistText, { color: isDark ? colors.textDark : colors.text }]}>
              Client-side integration complete
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            📖 Instructions
          </Text>
          <Text style={[styles.instructionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            1. Make sure you&apos;ve added GOOGLE_AI_API_KEY to Supabase Edge Functions → Settings → Secrets
          </Text>
          <Text style={[styles.instructionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            2. Get your API key from: https://aistudio.google.com/app/apikey
          </Text>
          <Text style={[styles.instructionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            3. Press &quot;Run Test&quot; to verify the integration
          </Text>
          <Text style={[styles.instructionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            4. Check the console logs for detailed information
          </Text>
          <Text style={[styles.instructionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            5. Check Supabase Edge Function logs for server-side logs
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    minHeight: 80,
    marginBottom: spacing.md,
  },
  testButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  testingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
  },
  errorText: {
    ...typography.body,
    lineHeight: 20,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h3,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  resultLabel: {
    ...typography.body,
  },
  resultValue: {
    ...typography.bodyBold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  itemsTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  itemCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  itemServing: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  itemMacros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  itemMacro: {
    ...typography.caption,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checklistText: {
    ...typography.body,
    flex: 1,
  },
  instructionText: {
    ...typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  bottomSpacer: {
    height: 100,
  },
});
