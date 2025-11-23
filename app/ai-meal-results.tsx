
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

interface Ingredient {
  name: string;
  quantity: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface EstimationResult {
  meal_name: string;
  assumptions: string[];
  questions: string[];
  ingredients: Ingredient[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
}

export default function AIMealResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const mode = (params.mode as string) || 'diary';
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;
  const resultString = params.result as string;

  const [result, setResult] = useState<EstimationResult | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  const [logging, setLogging] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);

  useEffect(() => {
    if (resultString) {
      try {
        const parsed = JSON.parse(resultString) as EstimationResult;
        setResult(parsed);
        setIngredients(parsed.ingredients);
        setTotals(parsed.totals);
        console.log('[AIMealResults] Parsed result:', parsed);
      } catch (error) {
        console.error('[AIMealResults] Error parsing result:', error);
        Alert.alert('Error', 'Failed to load estimation results', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    }
  }, [resultString]);

  const handleGramsChange = (index: number, newGrams: string) => {
    const gramsNum = parseFloat(newGrams) || 0;
    const ingredient = ingredients[index];
    
    // Calculate per-gram values from original
    const perGram = {
      calories: ingredient.calories / ingredient.grams,
      protein: ingredient.protein_g / ingredient.grams,
      carbs: ingredient.carbs_g / ingredient.grams,
      fat: ingredient.fat_g / ingredient.grams,
      fiber: ingredient.fiber_g / ingredient.grams,
    };

    // Update ingredient with new values
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = {
      ...ingredient,
      grams: gramsNum,
      calories: perGram.calories * gramsNum,
      protein_g: perGram.protein * gramsNum,
      carbs_g: perGram.carbs * gramsNum,
      fat_g: perGram.fat * gramsNum,
      fiber_g: perGram.fiber * gramsNum,
    };

    setIngredients(updatedIngredients);

    // Recalculate totals
    const newTotals = updatedIngredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.calories,
        protein_g: acc.protein_g + ing.protein_g,
        carbs_g: acc.carbs_g + ing.carbs_g,
        fat_g: acc.fat_g + ing.fat_g,
        fiber_g: acc.fiber_g + ing.fiber_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    );

    setTotals(newTotals);
  };

  const handleLogToDiary = async () => {
    if (ingredients.length === 0) {
      Alert.alert('Error', 'No ingredients to log');
      return;
    }

    // If there are unanswered questions, show confirmation
    if (result?.questions && result.questions.length > 0 && showQuestions) {
      Alert.alert(
        'Continue Anyway?',
        'There are clarifying questions that could improve accuracy. Do you want to continue logging?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedWithLogging() }
        ]
      );
      return;
    }

    proceedWithLogging();
  };

  const proceedWithLogging = async () => {
    setLogging(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to log food');
        setLogging(false);
        return;
      }

      console.log('[AIMealResults] Starting to log ingredients...');

      // Find or create meal for the date and meal type
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (!mealId) {
        console.log('[AIMealResults] Creating new meal for', mealType, 'on', date);
        const { data: newMeal, error: mealError } = await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            date: date,
            meal_type: mealType,
          })
          .select()
          .single();

        if (mealError) {
          console.error('[AIMealResults] Error creating meal:', mealError);
          Alert.alert('Error', 'Failed to create meal');
          setLogging(false);
          return;
        }

        mealId = newMeal.id;
      }

      // Log each ingredient as a separate food entry
      for (const ingredient of ingredients) {
        console.log('[AIMealResults] Logging ingredient:', ingredient.name);

        // Create food entry for this ingredient
        const { data: foodData, error: foodError } = await supabase
          .from('foods')
          .insert({
            name: ingredient.name,
            serving_amount: 100,
            serving_unit: 'g',
            calories: (ingredient.calories / ingredient.grams) * 100,
            protein: (ingredient.protein_g / ingredient.grams) * 100,
            carbs: (ingredient.carbs_g / ingredient.grams) * 100,
            fats: (ingredient.fat_g / ingredient.grams) * 100,
            fiber: (ingredient.fiber_g / ingredient.grams) * 100,
            user_created: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (foodError) {
          console.error('[AIMealResults] Error creating food:', foodError);
          Alert.alert('Error', `Failed to create food entry for ${ingredient.name}`);
          setLogging(false);
          return;
        }

        // Add meal item
        const { error: mealItemError } = await supabase
          .from('meal_items')
          .insert({
            meal_id: mealId,
            food_id: foodData.id,
            quantity: ingredient.grams / 100,
            calories: ingredient.calories,
            protein: ingredient.protein_g,
            carbs: ingredient.carbs_g,
            fats: ingredient.fat_g,
            fiber: ingredient.fiber_g,
            serving_description: ingredient.quantity,
            grams: ingredient.grams,
          });

        if (mealItemError) {
          console.error('[AIMealResults] Error creating meal item:', mealItemError);
          Alert.alert('Error', `Failed to add ${ingredient.name} to meal`);
          setLogging(false);
          return;
        }
      }

      console.log('[AIMealResults] All ingredients logged successfully!');
      
      // Navigate back to diary
      router.dismissTo('/(tabs)/(home)/');
    } catch (error) {
      console.error('[AIMealResults] Error in proceedWithLogging:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLogging(false);
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading results...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          Review Estimate
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Name */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
            {result.meal_name}
          </Text>
        </View>

        {/* Assumptions */}
        {result.assumptions && result.assumptions.length > 0 && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Assumptions
            </Text>
            {result.assumptions.map((assumption, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.bulletText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {assumption}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Questions */}
        {result.questions && result.questions.length > 0 && showQuestions && (
          <View style={[styles.card, { backgroundColor: 'rgba(255, 149, 0, 0.1)', borderColor: colors.warning || '#FF9500', borderWidth: 1 }]}>
            <View style={styles.questionsHeader}>
              <IconSymbol
                ios_icon_name="questionmark.circle"
                android_material_icon_name="help_outline"
                size={24}
                color={colors.warning || '#FF9500'}
              />
              <Text style={[styles.sectionTitle, { color: colors.warning || '#FF9500', flex: 1 }]}>
                Clarifying Questions
              </Text>
              <TouchableOpacity onPress={() => setShowQuestions(false)}>
                <Text style={[styles.dismissText, { color: colors.warning || '#FF9500' }]}>
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
            {result.questions.map((question, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={[styles.bullet, { color: colors.warning || '#FF9500' }]}>
                  •
                </Text>
                <Text style={[styles.bulletText, { color: colors.warning || '#FF9500' }]}>
                  {question}
                </Text>
              </View>
            ))}
            <Text style={[styles.questionsNote, { color: colors.warning || '#FF9500' }]}>
              You can continue with the current estimate or go back to provide more details.
            </Text>
          </View>
        )}

        {/* Ingredients */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Ingredients
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Adjust quantities as needed
          </Text>

          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientCard}>
              <View style={styles.ingredientHeader}>
                <Text style={[styles.ingredientName, { color: isDark ? colors.textDark : colors.text }]}>
                  {ingredient.name}
                </Text>
                <Text style={[styles.ingredientCalories, { color: colors.calories }]}>
                  {Math.round(ingredient.calories)} kcal
                </Text>
              </View>

              <View style={styles.ingredientGrams}>
                <Text style={[styles.gramsLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Grams:
                </Text>
                <TextInput
                  style={[
                    styles.gramsInput,
                    {
                      backgroundColor: isDark ? colors.backgroundDark : colors.background,
                      borderColor: isDark ? colors.borderDark : colors.border,
                      color: isDark ? colors.textDark : colors.text
                    }
                  ]}
                  value={ingredient.grams.toString()}
                  onChangeText={(text) => handleGramsChange(index, text)}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.gramsUnit, { color: isDark ? colors.textDark : colors.text }]}>
                  g
                </Text>
              </View>

              <View style={styles.ingredientMacros}>
                <Text style={[styles.macroText, { color: colors.protein }]}>
                  P: {ingredient.protein_g.toFixed(1)}g
                </Text>
                <Text style={[styles.macroText, { color: colors.carbs }]}>
                  C: {ingredient.carbs_g.toFixed(1)}g
                </Text>
                <Text style={[styles.macroText, { color: colors.fats }]}>
                  F: {ingredient.fat_g.toFixed(1)}g
                </Text>
                <Text style={[styles.macroText, { color: colors.fiber }]}>
                  Fiber: {ingredient.fiber_g.toFixed(1)}g
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={[styles.card, { backgroundColor: colors.primary }]}>
          <Text style={styles.totalsTitle}>Total Nutrition</Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{Math.round(totals.calories)}</Text>
              <Text style={styles.totalLabel}>Calories</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.protein_g.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Protein</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.carbs_g.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Carbs</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.fat_g.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Fats</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.fiber_g.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Fiber</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.logButton,
            { 
              backgroundColor: colors.success,
              opacity: logging ? 0.7 : 1
            }
          ]}
          onPress={handleLogToDiary}
          disabled={logging}
          activeOpacity={0.7}
        >
          {logging ? (
            <View style={styles.loggingContainer}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.logButtonText}>Logging...</Text>
            </View>
          ) : (
            <Text style={styles.logButtonText}>Log to Diary</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
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
  mealName: {
    ...typography.h2,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bullet: {
    ...typography.body,
    marginRight: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
  },
  questionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dismissText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  questionsNote: {
    ...typography.caption,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  ingredientCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ingredientName: {
    ...typography.bodyBold,
    fontSize: 16,
    flex: 1,
  },
  ingredientCalories: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  ingredientGrams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gramsLabel: {
    ...typography.body,
  },
  gramsInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
  gramsUnit: {
    ...typography.body,
    fontWeight: '600',
  },
  ingredientMacros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroText: {
    ...typography.caption,
    fontWeight: '600',
  },
  totalsTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  totalItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  totalValue: {
    ...typography.h2,
    color: '#FFFFFF',
    fontSize: 24,
  },
  totalLabel: {
    ...typography.caption,
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  logButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loggingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
});
