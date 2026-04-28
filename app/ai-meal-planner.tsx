import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import { createMealPlan, addMealPlanItem } from '@/utils/mealPlansApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  quantity: number;
  serving_description: string;
}

interface GeneratedPlan {
  breakfast: PlanFood[];
  lunch: PlanFood[];
  dinner: PlanFood[];
  snack: PlanFood[];
}

interface UserGoals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fats: number;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type ScreenStep = 'preferences' | 'generating' | 'plan';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#14B8A6';
const MEAL_SECTIONS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
];

const REPLACE_SUGGESTIONS = ['More protein', 'Lower calories', 'Vegetarian', 'Something lighter'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function sumMacros(foods: PlanFood[]) {
  return foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      fats: acc.fats + (Number(f.fats) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

interface LoadingDotsProps {
  color: string;
}

function LoadingDots({ color }: LoadingDotsProps) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 200);
    const a3 = anim(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: color, opacity: dot }]} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AIMealPlannerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isMounted = useRef(true);

  // Theme
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;
  const inputBg = isDark ? '#2C2C2E' : '#F5F5F5';

  // Screen state
  const [step, setStep] = useState<ScreenStep>('preferences');
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  // Preferences
  const [foodPrefs, setFoodPrefs] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');

  // Save plan modal
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [planName, setPlanName] = useState('');
  const [saving, setSaving] = useState(false);

  // Replace sheet
  const [replaceSheetVisible, setReplaceSheetVisible] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{ food: PlanFood; mealType: MealType } | null>(null);
  const [replaceText, setReplaceText] = useState('');
  const [replacing, setReplacing] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastKey = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    loadUserGoals();
    return () => { isMounted.current = false; };
  }, []);

  // ── Load goals ──────────────────────────────────────────────────────────────

  const loadUserGoals = async () => {
    console.log('[AIMealPlanner] loadUserGoals called');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[AIMealPlanner] loadUserGoals: no authenticated user');
        return;
      }
      const { data } = await supabase
        .from('goals')
        .select('daily_calories, protein_g, carbs_g, fats_g')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (data && isMounted.current) {
        console.log('[AIMealPlanner] loadUserGoals success:', data);
        setUserGoals({
          daily_calories: data.daily_calories,
          daily_protein: data.protein_g,
          daily_carbs: data.carbs_g,
          daily_fats: data.fats_g,
        });
      } else {
        console.log('[AIMealPlanner] loadUserGoals: no goals found');
      }
    } catch (e) {
      console.error('[AIMealPlanner] loadUserGoals error:', e);
    }
  };

  // ── Generate plan ───────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!userGoals) {
      Alert.alert('No Goals', 'Please set your macro goals first.');
      return;
    }
    console.log('[AIMealPlanner] Generate My Plan pressed, foodPrefs:', foodPrefs, 'restrictions:', dietaryRestrictions);
    setStep('generating');

    const parts: string[] = ['GENERATE_PLAN: Please create a complete meal plan for me.'];
    if (foodPrefs.trim()) parts.push(`Food preferences: ${foodPrefs.trim()}`);
    if (dietaryRestrictions.trim()) parts.push(`Dietary restrictions: ${dietaryRestrictions.trim()}`);
    const prompt = parts.join(' ');

    try {
      console.log('[AIMealPlanner] invoking generate-meal-plan, prompt:', prompt);
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: { messages: [{ role: 'user', content: prompt }], userGoals },
      });
      if (!isMounted.current) return;
      if (error) throw new Error(error.message);

      console.log('[AIMealPlanner] generate-meal-plan response, readyToSave:', data?.readyToSave);

      if (data?.readyToSave && data?.planData) {
        setGeneratedPlan(data.planData);
        setStep('plan');
      } else {
        throw new Error('Plan data not returned. Please try again.');
      }
    } catch (e: any) {
      console.error('[AIMealPlanner] handleGenerate error:', e?.message || e);
      if (!isMounted.current) return;
      setStep('preferences');
      Alert.alert('Error', e?.message || 'Failed to generate plan. Please try again.');
    }
  }, [userGoals, foodPrefs, dietaryRestrictions]);

  const handleRegenerate = useCallback(() => {
    console.log('[AIMealPlanner] Regenerate button pressed');
    setGeneratedPlan(null);
    setStep('preferences');
  }, []);

  // ── Add food to log ─────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    toastKey.current += 1;
    setToastMsg(msg);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 10);
  }, []);

  const handleAddFood = useCallback(async (food: PlanFood, mealType: MealType) => {
    console.log('[AIMealPlanner] Add food pressed:', food.name, 'to', mealType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Error', 'Not authenticated'); return; }

      const todayStr = getTodayStr();
      console.log('[AIMealPlanner] inserting food_log:', food.name, mealType, todayStr);
      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        date: todayStr,
        meal_type: mealType,
        food_name: food.name,
        calories: Number(food.calories) || 0,
        protein: Number(food.protein) || 0,
        carbs: Number(food.carbs) || 0,
        fats: Number(food.fats) || 0,
        fiber: Number(food.fiber) || 0,
        quantity: Number(food.quantity) || 1,
        serving_description: food.serving_description || '1 serving',
      });
      if (error) throw new Error(error.message);

      const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      console.log('[AIMealPlanner] food added to log successfully:', food.name);
      showToast(`Added to ${mealLabel} ✓`);
    } catch (e: any) {
      console.error('[AIMealPlanner] handleAddFood error:', e?.message || e);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    }
  }, [showToast]);

  const handleAddAllToMeal = useCallback(async (mealType: MealType) => {
    if (!generatedPlan) return;
    const foods = generatedPlan[mealType] || [];
    console.log('[AIMealPlanner] Add all to meal pressed:', mealType, 'count:', foods.length);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Error', 'Not authenticated'); return; }

      const todayStr = getTodayStr();
      const inserts = foods.map(food => ({
        user_id: user.id,
        date: todayStr,
        meal_type: mealType,
        food_name: food.name,
        calories: Number(food.calories) || 0,
        protein: Number(food.protein) || 0,
        carbs: Number(food.carbs) || 0,
        fats: Number(food.fats) || 0,
        fiber: Number(food.fiber) || 0,
        quantity: Number(food.quantity) || 1,
        serving_description: food.serving_description || '1 serving',
      }));

      console.log('[AIMealPlanner] inserting', inserts.length, 'food_logs for', mealType);
      const { error } = await supabase.from('food_logs').insert(inserts);
      if (error) throw new Error(error.message);

      const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      console.log('[AIMealPlanner] all foods added to', mealType);
      showToast(`All added to ${mealLabel} ✓`);
    } catch (e: any) {
      console.error('[AIMealPlanner] handleAddAllToMeal error:', e?.message || e);
      Alert.alert('Error', 'Failed to add foods. Please try again.');
    }
  }, [generatedPlan, showToast]);

  // ── Replace food ────────────────────────────────────────────────────────────

  const handleOpenReplace = useCallback((food: PlanFood, mealType: MealType) => {
    console.log('[AIMealPlanner] Replace button pressed for:', food.name, 'in', mealType);
    setReplaceTarget({ food, mealType });
    setReplaceText('');
    setReplaceSheetVisible(true);
  }, []);

  const handleReplace = useCallback(async () => {
    if (!replaceTarget || !replaceText.trim() || !userGoals) return;
    const { food, mealType } = replaceTarget;
    console.log('[AIMealPlanner] Replace submit pressed, food:', food.name, 'with:', replaceText.trim());
    setReplacing(true);

    const prompt = `Replace ${food.name} in ${mealType} with: ${replaceText.trim()}. Return the updated full plan in the same JSON format.`;
    try {
      console.log('[AIMealPlanner] invoking generate-meal-plan for replace, prompt:', prompt);
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: { messages: [{ role: 'user', content: prompt }], userGoals },
      });
      if (!isMounted.current) return;
      if (error) throw new Error(error.message);

      console.log('[AIMealPlanner] replace response, readyToSave:', data?.readyToSave);

      if (data?.readyToSave && data?.planData) {
        setGeneratedPlan(data.planData);
        setReplaceSheetVisible(false);
        showToast('Food replaced ✓');
      } else {
        throw new Error('Could not replace food. Please try again.');
      }
    } catch (e: any) {
      console.error('[AIMealPlanner] handleReplace error:', e?.message || e);
      Alert.alert('Error', e?.message || 'Failed to replace food.');
    } finally {
      if (isMounted.current) setReplacing(false);
    }
  }, [replaceTarget, replaceText, userGoals, showToast]);

  // ── Save plan ───────────────────────────────────────────────────────────────

  const handleOpenSaveModal = useCallback(() => {
    console.log('[AIMealPlanner] Save as Plan button pressed');
    setPlanName('');
    setSaveModalVisible(true);
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (!generatedPlan || !planName.trim()) return;
    console.log('[AIMealPlanner] handleSavePlan called, planName:', planName.trim());
    setSaving(true);
    try {
      const dateStr = getTodayStr();
      console.log('[AIMealPlanner] creating meal plan:', planName.trim(), dateStr);
      const newPlan = await createMealPlan({ name: planName.trim(), start_date: dateStr, end_date: dateStr });
      console.log('[AIMealPlanner] meal plan created:', newPlan.id);

      const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      for (const mealType of mealTypes) {
        const foods = generatedPlan[mealType] || [];
        for (const food of foods) {
          console.log('[AIMealPlanner] adding meal plan item:', food.name, 'to', mealType);
          await addMealPlanItem(newPlan.id, {
            date: dateStr,
            meal_type: mealType,
            food_name: food.name,
            quantity: Number(food.quantity) || 1,
            serving_description: food.serving_description || '1 serving',
            calories: Number(food.calories) || 0,
            protein: Number(food.protein) || 0,
            carbs: Number(food.carbs) || 0,
            fats: Number(food.fats) || 0,
            fiber: Number(food.fiber) || 0,
            grams: null,
          });
        }
      }

      console.log('[AIMealPlanner] all items saved, navigating to plan detail:', newPlan.id);
      setSaveModalVisible(false);
      router.replace({ pathname: '/meal-plan-detail', params: { planId: newPlan.id } });
    } catch (e: any) {
      console.error('[AIMealPlanner] handleSavePlan error:', e?.message || e);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }, [generatedPlan, planName, router]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalMacros = generatedPlan
    ? sumMacros([
        ...(generatedPlan.breakfast || []),
        ...(generatedPlan.lunch || []),
        ...(generatedPlan.dinner || []),
        ...(generatedPlan.snack || []),
      ])
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => {
            console.log('[AIMealPlanner] back button pressed');
            router.back();
          }}
          style={styles.backBtn}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color={TEAL} />
          <Text style={[styles.headerTitle, { color: textColor }]}>AI Meal Planner</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Step: Preferences */}
      {step === 'preferences' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.prefsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={[styles.heroTitle, { color: textColor }]}>Let's build your meal plan</Text>
            <Text style={[styles.heroSubtitle, { color: secondaryColor }]}>
              Tell us a bit about your preferences so we can create something you'll actually enjoy.
            </Text>
          </View>

          {/* Goals chips */}
          {userGoals && (
            <View style={[styles.goalsCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.goalsLabel, { color: secondaryColor }]}>YOUR DAILY GOALS</Text>
              <View style={styles.goalsRow}>
                <View style={[styles.goalChip, { backgroundColor: isDark ? '#2C1F4A' : '#EDE9FE' }]}>
                  <Text style={[styles.goalChipText, { color: colors.calories }]}>{userGoals.daily_calories}</Text>
                  <Text style={[styles.goalChipUnit, { color: colors.calories }]}>kcal</Text>
                </View>
                <View style={[styles.goalChip, { backgroundColor: isDark ? '#3B1F1F' : '#FEE2E2' }]}>
                  <Text style={[styles.goalChipText, { color: colors.protein }]}>{userGoals.daily_protein}g</Text>
                  <Text style={[styles.goalChipUnit, { color: colors.protein }]}>protein</Text>
                </View>
                <View style={[styles.goalChip, { backgroundColor: isDark ? '#1F2E4A' : '#DBEAFE' }]}>
                  <Text style={[styles.goalChipText, { color: colors.carbs }]}>{userGoals.daily_carbs}g</Text>
                  <Text style={[styles.goalChipUnit, { color: colors.carbs }]}>carbs</Text>
                </View>
                <View style={[styles.goalChip, { backgroundColor: isDark ? '#3B2E1F' : '#FEF3C7' }]}>
                  <Text style={[styles.goalChipText, { color: colors.fats }]}>{userGoals.daily_fats}g</Text>
                  <Text style={[styles.goalChipUnit, { color: colors.fats }]}>fats</Text>
                </View>
              </View>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.inputsSection}>
            <Text style={[styles.inputLabel, { color: secondaryColor }]}>FOOD PREFERENCES</Text>
            <TextInput
              style={[styles.prefInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="e.g. I love chicken, no seafood"
              placeholderTextColor={secondaryColor}
              value={foodPrefs}
              onChangeText={setFoodPrefs}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />

            <Text style={[styles.inputLabel, { color: secondaryColor, marginTop: spacing.md }]}>DIETARY RESTRICTIONS</Text>
            <TextInput
              style={[styles.prefInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="e.g. lactose intolerant, vegetarian"
              placeholderTextColor={secondaryColor}
              value={dietaryRestrictions}
              onChangeText={setDietaryRestrictions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          {/* Generate button — inside scroll view */}
          <TouchableOpacity
            style={[styles.generateBtn, { opacity: userGoals ? 1 : 0.5, marginTop: 24 }]}
            onPress={handleGenerate}
            disabled={!userGoals}
            activeOpacity={0.85}
          >
            <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#fff" />
            <Text style={styles.generateBtnText}>Generate My Plan</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step: Generating */}
      {step === 'generating' && (
        <View style={styles.generatingContainer}>
          <View style={[styles.generatingCard, { backgroundColor: cardBg }]}>
            <Text style={styles.generatingEmoji}>🍽️</Text>
            <Text style={[styles.generatingTitle, { color: textColor }]}>Creating your personalized plan...</Text>
            <Text style={[styles.generatingSubtitle, { color: secondaryColor }]}>
              Our AI is crafting meals tailored to your goals and preferences.
            </Text>
            <LoadingDots color={TEAL} />
          </View>
        </View>
      )}

      {/* Step: Plan */}
      {step === 'plan' && generatedPlan && (
        <>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.planContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Plan header */}
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: textColor }]}>Your Meal Plan</Text>
              {totalMacros && (
                <View style={styles.totalMacrosRow}>
                  <MacroPill value={totalMacros.calories} unit="kcal" color={colors.calories} bg={isDark ? '#2C1F4A' : '#EDE9FE'} />
                  <MacroPill value={totalMacros.protein} unit="P" color={colors.protein} bg={isDark ? '#3B1F1F' : '#FEE2E2'} />
                  <MacroPill value={totalMacros.carbs} unit="C" color={colors.carbs} bg={isDark ? '#1F2E4A' : '#DBEAFE'} />
                  <MacroPill value={totalMacros.fats} unit="F" color={colors.fats} bg={isDark ? '#3B2E1F' : '#FEF3C7'} />
                </View>
              )}
            </View>

            {/* Meal sections */}
            {MEAL_SECTIONS.map(section => {
              const foods = generatedPlan[section.key] || [];
              const sectionMacros = sumMacros(foods);
              return (
                <MealSection
                  key={section.key}
                  section={section}
                  foods={foods}
                  sectionCalories={sectionMacros.calories}
                  isDark={isDark}
                  textColor={textColor}
                  secondaryColor={secondaryColor}
                  cardBg={cardBg}
                  borderColor={borderColor}
                  onAddFood={handleAddFood}
                  onReplaceFood={handleOpenReplace}
                  onAddAll={handleAddAllToMeal}
                />
              );
            })}

            <View style={styles.planBottomSpacer} />
          </ScrollView>

          {/* Sticky bottom bar */}
          <View style={[styles.stickyBar, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.regenBtn, { borderColor }]}
              onPress={handleRegenerate}
              activeOpacity={0.8}
            >
              <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={16} color={textColor} />
              <Text style={[styles.regenBtnText, { color: textColor }]}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleOpenSaveModal}
              activeOpacity={0.85}
            >
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save as Plan</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Toast */}
      <Toast message={toastMsg} visible={toastVisible} key={toastKey.current} />

      {/* Save Plan Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSaveModalVisible(false)}
        />
        <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: textColor }]}>Name Your Plan</Text>
          <Text style={[styles.sheetSubtitle, { color: secondaryColor }]}>
            Give your meal plan a name so you can find it later.
          </Text>
          <Text style={[styles.sheetLabel, { color: secondaryColor }]}>PLAN NAME</Text>
          <TextInput
            style={[styles.sheetInput, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', color: textColor }]}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g. Healthy Week 1"
            placeholderTextColor={secondaryColor}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSavePlan}
          />
          <TouchableOpacity
            style={[styles.sheetPrimaryBtn, { opacity: saving || !planName.trim() ? 0.5 : 1 }]}
            onPress={handleSavePlan}
            disabled={saving || !planName.trim()}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sheetPrimaryBtnText}>Save Plan</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Replace Sheet */}
      <Modal
        visible={replaceSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReplaceSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !replacing && setReplaceSheetVisible(false)}
        />
        <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: textColor }]}>
            Replace {replaceTarget?.food.name ?? ''}
          </Text>
          <Text style={[styles.sheetSubtitle, { color: secondaryColor }]}>
            What would you like instead?
          </Text>
          <TextInput
            style={[styles.sheetInput, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', color: textColor }]}
            value={replaceText}
            onChangeText={setReplaceText}
            placeholder="e.g. something with more protein"
            placeholderTextColor={secondaryColor}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleReplace}
            editable={!replacing}
          />
          {/* Quick suggestions */}
          <View style={styles.suggestionsRow}>
            {REPLACE_SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.suggestionChip, { backgroundColor: isDark ? '#2C2C2E' : '#F0F2F7', borderColor }]}
                onPress={() => {
                  console.log('[AIMealPlanner] Replace suggestion tapped:', s);
                  setReplaceText(s);
                }}
                disabled={replacing}
              >
                <Text style={[styles.suggestionChipText, { color: secondaryColor }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.sheetPrimaryBtn, { opacity: replacing || !replaceText.trim() ? 0.5 : 1 }]}
            onPress={handleReplace}
            disabled={replacing || !replaceText.trim()}
            activeOpacity={0.85}
          >
            {replacing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sheetPrimaryBtnText}>Replace</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── MacroPill ────────────────────────────────────────────────────────────────

interface MacroPillProps {
  value: number;
  unit: string;
  color: string;
  bg: string;
}

function MacroPill({ value, unit, color, bg }: MacroPillProps) {
  const rounded = Math.round(value);
  return (
    <View style={[styles.macroPill, { backgroundColor: bg }]}>
      <Text style={[styles.macroPillValue, { color }]}>{rounded}</Text>
      <Text style={[styles.macroPillUnit, { color }]}>{unit}</Text>
    </View>
  );
}

// ─── MealSection ──────────────────────────────────────────────────────────────

interface MealSectionProps {
  section: { key: MealType; label: string; emoji: string };
  foods: PlanFood[];
  sectionCalories: number;
  isDark: boolean;
  textColor: string;
  secondaryColor: string;
  cardBg: string;
  borderColor: string;
  onAddFood: (food: PlanFood, mealType: MealType) => void;
  onReplaceFood: (food: PlanFood, mealType: MealType) => void;
  onAddAll: (mealType: MealType) => void;
}

function MealSection({
  section, foods, sectionCalories, isDark, textColor, secondaryColor, cardBg, borderColor,
  onAddFood, onReplaceFood, onAddAll,
}: MealSectionProps) {
  const calRounded = Math.round(sectionCalories);
  return (
    <View style={[styles.mealCard, { backgroundColor: cardBg, borderColor }]}>
      {/* Section header */}
      <View style={styles.mealCardHeader}>
        <View style={styles.mealCardHeaderLeft}>
          <Text style={styles.mealEmoji}>{section.emoji}</Text>
          <Text style={[styles.mealLabel, { color: textColor }]}>{section.label}</Text>
        </View>
        <View style={[styles.mealCalBadge, { backgroundColor: isDark ? '#2C2C2E' : '#F0F2F7' }]}>
          <Text style={[styles.mealCalBadgeText, { color: colors.calories }]}>{calRounded} kcal</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.mealDivider, { backgroundColor: borderColor }]} />

      {/* Food rows */}
      {foods.map((food, idx) => (
        <FoodRow
          key={`${food.name}-${idx}`}
          food={food}
          mealType={section.key}
          isDark={isDark}
          textColor={textColor}
          secondaryColor={secondaryColor}
          borderColor={borderColor}
          isLast={idx === foods.length - 1}
          onAdd={onAddFood}
          onReplace={onReplaceFood}
        />
      ))}

      {/* Add all button */}
      <TouchableOpacity
        style={[styles.addAllBtn, { borderColor: TEAL }]}
        onPress={() => {
          console.log('[AIMealPlanner] Add all to', section.label, 'pressed');
          onAddAll(section.key);
        }}
        activeOpacity={0.8}
      >
        <IconSymbol ios_icon_name="plus.circle" android_material_icon_name="add_circle_outline" size={15} color={TEAL} />
        <Text style={styles.addAllBtnText}>Add all to {section.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── FoodRow ──────────────────────────────────────────────────────────────────

interface FoodRowProps {
  food: PlanFood;
  mealType: MealType;
  isDark: boolean;
  textColor: string;
  secondaryColor: string;
  borderColor: string;
  isLast: boolean;
  onAdd: (food: PlanFood, mealType: MealType) => void;
  onReplace: (food: PlanFood, mealType: MealType) => void;
}

function FoodRow({ food, mealType, isDark, textColor, secondaryColor, borderColor, isLast, onAdd, onReplace }: FoodRowProps) {
  const calVal = Math.round(Number(food.calories) || 0);
  const protVal = Math.round(Number(food.protein) || 0);
  const carbVal = Math.round(Number(food.carbs) || 0);
  const fatVal = Math.round(Number(food.fats) || 0);

  return (
    <View style={[styles.foodRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}>
      {/* Left: name + serving + macros */}
      <View style={styles.foodRowLeft}>
        <Text style={[styles.foodName, { color: textColor }]} numberOfLines={2}>{food.name}</Text>
        {!!food.serving_description && (
          <Text style={[styles.foodServing, { color: secondaryColor }]} numberOfLines={1}>{food.serving_description}</Text>
        )}
        <View style={styles.foodMacrosRow}>
          <Text style={[styles.foodMacroText, { color: colors.calories }]}>{calVal} kcal</Text>
          <Text style={[styles.foodMacroDot, { color: secondaryColor }]}>·</Text>
          <Text style={[styles.foodMacroText, { color: colors.protein }]}>{protVal}P</Text>
          <Text style={[styles.foodMacroDot, { color: secondaryColor }]}>·</Text>
          <Text style={[styles.foodMacroText, { color: colors.carbs }]}>{carbVal}C</Text>
          <Text style={[styles.foodMacroDot, { color: secondaryColor }]}>·</Text>
          <Text style={[styles.foodMacroText, { color: colors.fats }]}>{fatVal}F</Text>
        </View>
      </View>

      {/* Right: action buttons */}
      <View style={styles.foodRowActions}>
        <TouchableOpacity
          style={styles.addFoodBtn}
          onPress={() => {
            console.log('[AIMealPlanner] Add single food pressed:', food.name, 'to', mealType);
            onAdd(food, mealType);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.addFoodBtnText}>✓ Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.replaceFoodBtn, { backgroundColor: isDark ? '#3A3A3C' : '#E5E7EB' }]}
          onPress={() => onReplace(food, mealType)}
          activeOpacity={0.8}
        >
          <Text style={[styles.replaceFoodBtnText, { color: secondaryColor }]}>↺ Replace</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs, width: 40 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerRight: { width: 40 },

  // Preferences step
  prefsContent: {
    padding: spacing.md,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  heroEmoji: { fontSize: 40, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  goalsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  goalsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  goalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  goalChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  goalChipText: { fontSize: 15, fontWeight: '700' },
  goalChipUnit: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  inputsSection: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  prefInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
  },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingVertical: 18,
  },
  generateBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Generating step
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  generatingCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  generatingEmoji: { fontSize: 48, marginBottom: 16 },
  generatingTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  generatingSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },

  // Plan step
  planContent: { padding: spacing.md, paddingBottom: 100 },
  planHeader: { marginBottom: spacing.md },
  planTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  totalMacrosRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  macroPillValue: { fontSize: 14, fontWeight: '700' },
  macroPillUnit: { fontSize: 11, fontWeight: '500' },

  // Meal card
  mealCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  mealCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealEmoji: { fontSize: 20 },
  mealLabel: { fontSize: 17, fontWeight: '700' },
  mealCalBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  mealCalBadgeText: { fontSize: 13, fontWeight: '600' },
  mealDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },

  // Food row
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  foodRowLeft: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  foodServing: { fontSize: 12, marginBottom: 4 },
  foodMacrosRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  foodMacroText: { fontSize: 12, fontWeight: '600' },
  foodMacroDot: { fontSize: 12 },
  foodRowActions: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  addFoodBtn: {
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addFoodBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  replaceFoodBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  replaceFoodBtnText: { fontSize: 12, fontWeight: '600' },

  // Add all button
  addAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: spacing.md,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  addAllBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },

  planBottomSpacer: { height: 20 },

  // Sticky bar
  stickyBar: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  regenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  regenBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(20,184,166,0.95)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Modal / Bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  sheetSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sheetInput: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  sheetPrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: TEAL,
    marginTop: 4,
  },
  sheetPrimaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },

  // Suggestions
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  suggestionChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: { fontSize: 13, fontWeight: '500' },
});
