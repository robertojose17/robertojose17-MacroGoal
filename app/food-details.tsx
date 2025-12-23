
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { OpenFoodFactsProduct, extractServingSize, extractNutrition, ServingSizeInfo } from '@/utils/openFoodFacts';
import { isFavorite, toggleFavorite } from '@/utils/favoritesDatabase';

// Unit conversion factors (grams as base)
const UNIT_CONVERSIONS: Record<string, number> = {
  'g': 1,
  'oz': 28.3495,
  'ml': 1, // Approximate for water-like liquids
  'cup': 240,
  'tbsp': 15,
  'tsp': 5,
};

type ServingUnit = 'g' | 'oz' | 'ml' | 'cup' | 'tbsp' | 'tsp';

export default function FoodDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const offDataString = params.offData as string;
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [servingInfo, setServingInfo] = useState<ServingSizeInfo | null>(null);
  const [nutrition, setNutrition] = useState<any>(null);
  
  // Base serving in grams (canonical reference)
  const [baseServingGrams, setBaseServingGrams] = useState(100);
  
  // Current serving controls
  const [servingAmount, setServingAmount] = useState('100');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [numberOfServings, setNumberOfServings] = useState('1');
  
  const [saving, setSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [nutritionExpanded, setNutritionExpanded] = useState(false);

  const isMountedRef = useRef(true);

  const [bannerQueue, setBannerQueue] = useState<string[]>([]);
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [bannerOpacity] = useState(new Animated.Value(0));
  const isShowingBannerRef = useRef(false);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('[FoodDetails] ========== COMPONENT MOUNTED ==========');
    console.log('[FoodDetails] Mode:', mode);
    console.log('[FoodDetails] Meal:', mealType);
    console.log('[FoodDetails] Date:', date);
    console.log('[FoodDetails] returnTo:', returnTo);
    console.log('[FoodDetails] mealId:', myMealId);
    console.log('[FoodDetails] offDataString:', !!offDataString);
    
    if (!offDataString) {
      console.error('[FoodDetails] ❌ No offData provided');
      Alert.alert('Error', 'No product data available', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      return;
    }

    try {
      console.log('[FoodDetails] Parsing OpenFoodFacts data...');
      const parsed = JSON.parse(offDataString);
      
      console.log('[FoodDetails] ✅ Parsed successfully');
      console.log('[FoodDetails] Product name:', parsed.product_name || 'Unknown');
      console.log('[FoodDetails] Brand:', parsed.brands || 'Unknown');
      console.log('[FoodDetails] Code:', parsed.code || 'N/A');
      console.log('[FoodDetails] Has nutriments:', !!parsed.nutriments);
      
      const productWithDefaults: OpenFoodFactsProduct = {
        code: parsed.code || '',
        product_name: parsed.product_name || 'Unknown Product',
        brands: parsed.brands || '',
        serving_size: parsed.serving_size || '100 g',
        nutriments: {
          'energy-kcal_100g': parsed.nutriments?.['energy-kcal_100g'] || 0,
          'proteins_100g': parsed.nutriments?.['proteins_100g'] || 0,
          'carbohydrates_100g': parsed.nutriments?.['carbohydrates_100g'] || 0,
          'fat_100g': parsed.nutriments?.['fat_100g'] || 0,
          'fiber_100g': parsed.nutriments?.['fiber_100g'] || 0,
          'sugars_100g': parsed.nutriments?.['sugars_100g'] || 0,
          'sodium_100g': parsed.nutriments?.['sodium_100g'] || 0,
          'saturated-fat_100g': parsed.nutriments?.['saturated-fat_100g'] || 0,
        },
      };
      
      console.log('[FoodDetails] Product with defaults applied');
      setProduct(productWithDefaults);
      
      console.log('[FoodDetails] Extracting serving size...');
      const serving = extractServingSize(productWithDefaults);
      console.log('[FoodDetails] Serving info:', {
        description: serving.description,
        grams: serving.grams,
        displayText: serving.displayText,
        hasValidGrams: serving.hasValidGrams,
        isEstimated: serving.isEstimated,
      });
      
      setServingInfo(serving);
      setBaseServingGrams(serving.grams);
      
      // Determine default unit based on source
      const defaultUnit: ServingUnit = serving.description.toLowerCase().includes('oz') ? 'oz' : 'g';
      setServingUnit(defaultUnit);
      
      // Set serving amount based on unit
      if (defaultUnit === 'oz') {
        const ozAmount = serving.grams / UNIT_CONVERSIONS['oz'];
        setServingAmount(ozAmount.toFixed(1));
      } else {
        setServingAmount(serving.grams.toString());
      }
      
      setNumberOfServings('1');
      
      console.log('[FoodDetails] Extracting nutrition...');
      const nutritionData = extractNutrition(productWithDefaults);
      console.log('[FoodDetails] Nutrition (per 100g):', {
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        fiber: nutritionData.fiber,
      });
      setNutrition(nutritionData);
      
      setIsReady(true);
      console.log('[FoodDetails] ✅ Screen ready to display');

      checkFavoriteStatus(productWithDefaults);
    } catch (error) {
      console.error('[FoodDetails] ❌ Error parsing OpenFoodFacts data:', error);
      
      console.log('[FoodDetails] Using complete defaults due to parse error');
      setProduct({
        code: '',
        product_name: 'Unknown Product',
        brands: '',
        serving_size: '100 g',
        nutriments: {
          'energy-kcal_100g': 0,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 0,
          'fiber_100g': 0,
          'sugars_100g': 0,
        },
      } as OpenFoodFactsProduct);
      setServingInfo({
        description: '100 g',
        grams: 100,
        displayText: '100 g',
        hasValidGrams: false,
        isEstimated: false,
      });
      setNutrition({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
      });
      setBaseServingGrams(100);
      setServingAmount('100');
      setServingUnit('g');
      setNumberOfServings('1');
      setIsReady(true);
      
      Alert.alert(
        'Warning',
        'There was an issue loading product data. Some information may be missing.',
        [{ text: 'OK' }]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offDataString]);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, []);

  const checkFavoriteStatus = async (prod: OpenFoodFactsProduct) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const foodSource = prod.code ? 'barcode' : 'library';
      const foodCode = prod.code || undefined;

      const favorited = await isFavorite(
        user.id,
        foodSource,
        foodCode,
        prod.product_name || 'Unknown Product',
        prod.brands || undefined
      );
      setIsFavorited(favorited);
      console.log('[FoodDetails] Initial favorite status:', favorited);
    } catch (error) {
      console.error('[FoodDetails] Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product || !servingInfo || !nutrition) return;

    setFavoriteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to favorite foods');
        setFavoriteLoading(false);
        return;
      }

      const foodSource = product.code ? 'barcode' : 'library';
      const foodCode = product.code || undefined;

      console.log('[FoodDetails] Toggling favorite for:', {
        foodSource,
        foodCode,
        foodName: product.product_name,
        brand: product.brands,
      });

      const newFavoriteStatus = await toggleFavorite(
        user.id,
        foodSource,
        foodCode,
        {
          food_name: product.product_name || 'Unknown Product',
          brand: product.brands || undefined,
          per100_calories: nutrition.calories,
          per100_protein: nutrition.protein,
          per100_carbs: nutrition.carbs,
          per100_fat: nutrition.fat,
          per100_fiber: nutrition.fiber,
          serving_size: servingInfo.displayText,
          serving_unit: servingUnit,
          default_grams: baseServingGrams,
        }
      );

      setIsFavorited(newFavoriteStatus);
      console.log('[FoodDetails] Favorite toggled successfully, new status:', newFavoriteStatus);
      
      Alert.alert(
        'Success',
        newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites'
      );
    } catch (error: any) {
      console.error('[FoodDetails] Error toggling favorite:', error);
      Alert.alert('Error', error.message || 'Failed to update favorite');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Convert serving amount to grams
  const convertToGrams = (amount: number, unit: ServingUnit): number => {
    return amount * UNIT_CONVERSIONS[unit];
  };

  // Convert grams to target unit
  const convertFromGrams = (grams: number, unit: ServingUnit): number => {
    return grams / UNIT_CONVERSIONS[unit];
  };

  // Handle serving amount change
  const handleServingAmountChange = (newAmount: string) => {
    setServingAmount(newAmount);
    
    const amountNum = parseFloat(newAmount);
    if (!isNaN(amountNum) && amountNum > 0) {
      const gramsPerServing = convertToGrams(amountNum, servingUnit);
      setBaseServingGrams(gramsPerServing);
      console.log('[FoodDetails] Serving amount changed:', newAmount, servingUnit, '=', gramsPerServing, 'g');
    }
  };

  // Handle serving unit change
  const handleServingUnitChange = (newUnit: ServingUnit) => {
    console.log('[FoodDetails] Unit changed from', servingUnit, 'to', newUnit);
    
    // Convert current amount to new unit
    const currentGrams = convertToGrams(parseFloat(servingAmount) || baseServingGrams, servingUnit);
    const newAmount = convertFromGrams(currentGrams, newUnit);
    
    setServingUnit(newUnit);
    setServingAmount(newAmount.toFixed(1));
    
    console.log('[FoodDetails] Converted:', servingAmount, servingUnit, '→', newAmount.toFixed(1), newUnit);
  };

  // Handle number of servings change
  const handleNumberOfServingsChange = (newServings: string) => {
    console.log('[FoodDetails] Number of servings changed to:', newServings);
    setNumberOfServings(newServings);
  };

  // Calculate total grams
  const getTotalGrams = (): number => {
    const servings = parseFloat(numberOfServings) || 1;
    return baseServingGrams * servings;
  };

  // Calculate macros based on total grams
  const calculateMacros = () => {
    if (!nutrition) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    
    const totalGrams = getTotalGrams();
    const multiplier = totalGrams / 100;
    
    return {
      calories: nutrition.calories * multiplier,
      protein: nutrition.protein * multiplier,
      carbs: nutrition.carbs * multiplier,
      fat: nutrition.fat * multiplier,
      fiber: nutrition.fiber * multiplier,
    };
  };

  const showSuccessBanner = useCallback((mealName: string) => {
    console.log('[FoodDetails] ========== ADDING BANNER TO QUEUE ==========');
    setBannerQueue(prev => {
      const newQueue = [...prev, `Added to ${mealName}`];
      console.log('[FoodDetails] Queue length:', newQueue.length);
      return newQueue;
    });
  }, []);

  useEffect(() => {
    if (bannerQueue.length === 0 || isShowingBannerRef.current) {
      return;
    }

    console.log('[FoodDetails] ========== SHOWING NEXT BANNER ==========');
    console.log('[FoodDetails] Queue length:', bannerQueue.length);
    
    isShowingBannerRef.current = true;
    
    const nextBanner = bannerQueue[0];
    setCurrentBanner(nextBanner);
    
    bannerOpacity.setValue(1);
    
    console.log('[FoodDetails] Banner visible, will hide after 500ms');
    
    bannerTimerRef.current = setTimeout(() => {
      console.log('[FoodDetails] Hiding banner');
      
      bannerOpacity.setValue(0);
      
      setBannerQueue(prev => prev.slice(1));
      setCurrentBanner(null);
      isShowingBannerRef.current = false;
      
      console.log('[FoodDetails] Banner hidden, ready for next');
    }, 500);
  }, [bannerQueue, bannerOpacity]);

  if (!isReady || !product || !servingInfo || !nutrition) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading product details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const macros = calculateMacros();
  const totalGrams = getTotalGrams();

  const handleSave = async () => {
    const finalServings = parseFloat(numberOfServings);
    const finalGrams = totalGrams;
    
    if (!finalServings || finalServings <= 0 || !finalGrams || finalGrams <= 0) {
      Alert.alert('Error', 'Please enter valid servings');
      return;
    }

    console.log('[FoodDetails] ========== SAVING FOOD ==========');
    console.log('[FoodDetails] Mode:', mode);
    console.log('[FoodDetails] Meal:', mealType);
    console.log('[FoodDetails] Servings:', finalServings);
    console.log('[FoodDetails] Total Grams:', finalGrams);
    console.log('[FoodDetails] returnTo:', returnTo);
    console.log('[FoodDetails] mealId:', myMealId);

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add food');
        setSaving(false);
        return;
      }

      console.log('[FoodDetails] User ID:', user.id);

      let foodId: string | null = null;

      if (product.code) {
        console.log('[FoodDetails] Checking for existing food with barcode:', product.code);
        const { data: existingFood } = await supabase
          .from('foods')
          .select('id')
          .eq('barcode', product.code)
          .maybeSingle();

        if (existingFood) {
          foodId = existingFood.id;
          console.log('[FoodDetails] ✅ Using existing food:', foodId);
        }
      }

      if (!foodId) {
        console.log('[FoodDetails] Creating new food in database...');
        const { data: newFood, error: foodError } = await supabase
          .from('foods')
          .insert({
            name: product.product_name || 'Unknown Product',
            brand: product.brands || null,
            serving_amount: 100,
            serving_unit: 'g',
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fats: nutrition.fat,
            fiber: nutrition.fiber,
            barcode: product.code || null,
            user_created: false,
          })
          .select()
          .single();

        if (foodError) {
          console.error('[FoodDetails] ❌ Error creating food:', foodError);
          Alert.alert('Error', 'Failed to save food');
          setSaving(false);
          return;
        }

        foodId = newFood.id;
        console.log('[FoodDetails] ✅ Created new food:', foodId);
      }

      const servingDescription = `${servingAmount} ${servingUnit} (${Math.round(finalGrams)}g)`;

      console.log('[FoodDetails] Serving description:', servingDescription);
      console.log('[FoodDetails] Final servings:', finalServings);
      console.log('[FoodDetails] Final grams:', finalGrams);
      console.log('[FoodDetails] Calculated nutrition:', macros);

      if (mode === 'mymeal') {
        console.log('[FoodDetails] Mode is mymeal, returning to My Meal screen');

        const { data: foodData } = await supabase
          .from('foods')
          .select('*')
          .eq('id', foodId)
          .single();

        const newFoodItem = {
          food_id: foodId,
          food: foodData,
          quantity: finalServings,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fats: macros.fat,
          fiber: macros.fiber,
          serving_description: servingDescription,
          grams: finalGrams,
        };

        console.log('[FoodDetails] ✅ Using returnTo parameter:', returnTo || '/my-meal-builder');
        
        router.dismissTo({
          pathname: returnTo || '/my-meal-builder',
          params: {
            mealId: myMealId || '',
            newFoodItem: JSON.stringify(newFoodItem),
          },
        });

        setSaving(false);
        return;
      }

      // NORMAL DIARY MODE: Log to diary
      console.log('[FoodDetails] Logging to diary...');
      
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (!mealId) {
        console.log('[FoodDetails] Creating new meal for', mealType, 'on', date);
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
          console.error('[FoodDetails] ❌ Error creating meal:', mealError);
          Alert.alert('Error', 'Failed to create meal');
          setSaving(false);
          return;
        }

        mealId = newMeal.id;
        console.log('[FoodDetails] ✅ Created new meal:', mealId);
      } else {
        console.log('[FoodDetails] ✅ Using existing meal:', mealId);
      }

      console.log('[FoodDetails] Inserting NEW meal item');
      const { error: mealItemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_id: foodId,
          quantity: finalServings,
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fats: macros.fat,
          fiber: macros.fiber,
          serving_description: servingDescription,
          grams: finalGrams,
        });

      if (mealItemError) {
        console.error('[FoodDetails] ❌ Error creating meal item:', mealItemError);
        Alert.alert('Error', 'Failed to add food to meal');
        setSaving(false);
        return;
      }

      console.log('[FoodDetails] ✅ Food added successfully!');
      
      const mealLabels: Record<string, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snacks',
      };
      showSuccessBanner(mealLabels[mealType] || mealType);
      
      setSaving(false);
      
      console.log('[FoodDetails] ✅ NAVIGATING TO FOOD HOME');
      
      setTimeout(() => {
        router.push('/(tabs)/(home)/');
      }, 600);
    } catch (error) {
      console.error('[FoodDetails] ❌ Error in handleSave:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setSaving(false);
    }
  };

  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  const availableUnits: ServingUnit[] = ['g', 'oz'];

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
        <View style={styles.headerSpacer} />
        <TouchableOpacity 
          onPress={handleToggleFavorite}
          disabled={favoriteLoading}
          style={styles.favoriteButton}
        >
          {favoriteLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <IconSymbol
              ios_icon_name={isFavorited ? "star.fill" : "star"}
              android_material_icon_name={isFavorited ? "star" : "star_border"}
              size={24}
              color={isFavorited ? "#FFD700" : (isDark ? colors.textDark : colors.text)}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* COMPACT HEADER */}
        <View style={styles.foodHeader}>
          <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
            {product.product_name || 'Unknown Product'}
          </Text>
          {product.brands && (
            <Text style={[styles.foodBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {product.brands}
            </Text>
          )}
        </View>

        {/* SERVING CONTROLS - COMPACT */}
        <View style={[styles.servingCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          {/* Serving Size with Unit Selector */}
          <View style={styles.servingRow}>
            <Text style={[styles.servingLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Serving Size
            </Text>
            <View style={styles.servingInputRow}>
              <TextInput
                style={[styles.servingInput, { 
                  backgroundColor: isDark ? colors.backgroundDark : colors.background, 
                  borderColor: isDark ? colors.borderDark : colors.border, 
                  color: isDark ? colors.textDark : colors.text 
                }]}
                placeholder="100"
                placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                keyboardType="decimal-pad"
                value={servingAmount}
                onChangeText={handleServingAmountChange}
              />
              <View style={styles.unitSelector}>
                {availableUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      servingUnit === unit && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleServingUnitChange(unit)}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      { color: servingUnit === unit ? '#FFFFFF' : (isDark ? colors.textDark : colors.text) }
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Number of Servings */}
          <View style={styles.servingRow}>
            <Text style={[styles.servingLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Number of Servings
            </Text>
            <View style={styles.servingInputRow}>
              <TextInput
                style={[styles.servingInput, { 
                  backgroundColor: isDark ? colors.backgroundDark : colors.background, 
                  borderColor: isDark ? colors.borderDark : colors.border, 
                  color: isDark ? colors.textDark : colors.text 
                }]}
                placeholder="1"
                placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                keyboardType="decimal-pad"
                value={numberOfServings}
                onChangeText={handleNumberOfServingsChange}
              />
              <Text style={[styles.servingUnitText, { color: isDark ? colors.textDark : colors.text }]}>
                × {servingAmount} {servingUnit}
              </Text>
            </View>
          </View>

          <Text style={[styles.totalGramsText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Total: {Math.round(totalGrams)}g
          </Text>
        </View>

        {/* MACROS + CALORIES - COMPACT ROW WITH IMPROVED SPACING */}
        <View style={[styles.macrosCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={styles.macrosRow}>
            <View style={styles.caloriesSection}>
              <Text style={[styles.caloriesLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Calories
              </Text>
              <Text style={[styles.caloriesValue, { color: colors.calories }]}>
                {Math.round(macros.calories)}
              </Text>
            </View>
            <View style={styles.macrosDivider} />
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.carbs }]}>
                  {macros.carbs.toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Carbs
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.fats }]}>
                  {macros.fat.toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Fat
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.protein }]}>
                  {macros.protein.toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Protein
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ADD BUTTON - DIRECTLY UNDER MACROS */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add to {mealLabels[mealType]}</Text>
          )}
        </TouchableOpacity>

        {/* NUTRITION FACTS - COLLAPSIBLE */}
        <TouchableOpacity
          style={[styles.nutritionHeader, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
          onPress={() => setNutritionExpanded(!nutritionExpanded)}
        >
          <Text style={[styles.nutritionHeaderText, { color: isDark ? colors.textDark : colors.text }]}>
            Nutrition Facts
          </Text>
          <IconSymbol
            ios_icon_name={nutritionExpanded ? "chevron.up" : "chevron.down"}
            android_material_icon_name={nutritionExpanded ? "expand_less" : "expand_more"}
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>

        {nutritionExpanded && (
          <View style={[styles.nutritionContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={styles.nutritionRow}>
              <Text style={[styles.nutritionLabel, { color: isDark ? colors.textDark : colors.text }]}>
                Fiber
              </Text>
              <Text style={[styles.nutritionValue, { color: isDark ? colors.textDark : colors.text }]}>
                {macros.fiber.toFixed(1)}g
              </Text>
            </View>
            {nutrition.sugars > 0 && (
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Sugars
                </Text>
                <Text style={[styles.nutritionValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {(nutrition.sugars * (totalGrams / 100)).toFixed(1)}g
                </Text>
              </View>
            )}
            {nutrition.sodium > 0 && (
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Sodium
                </Text>
                <Text style={[styles.nutritionValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {(nutrition.sodium * (totalGrams / 100) * 1000).toFixed(0)}mg
                </Text>
              </View>
            )}
            {nutrition['saturated-fat'] > 0 && (
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Saturated Fat
                </Text>
                <Text style={[styles.nutritionValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {(nutrition['saturated-fat'] * (totalGrams / 100)).toFixed(1)}g
                </Text>
              </View>
            )}
            <View style={[styles.nutritionRow, { borderTopWidth: 1, borderTopColor: isDark ? colors.borderDark : colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }]}>
              <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, fontSize: 12 }]}>
                Per 100g
              </Text>
              <Text style={[styles.nutritionValue, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, fontSize: 12 }]}>
                {Math.round(nutrition.calories)} kcal • P: {nutrition.protein.toFixed(1)}g • C: {nutrition.carbs.toFixed(1)}g • F: {nutrition.fat.toFixed(1)}g
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {currentBanner && (
        <Animated.View 
          style={[
            styles.bannerContainer,
            { 
              opacity: bannerOpacity,
            }
          ]}
        >
          <View style={styles.banner}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.bannerText}>
              {currentBanner}
            </Text>
          </View>
        </Animated.View>
      )}
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
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
  favoriteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  foodHeader: {
    marginBottom: spacing.md,
  },
  foodName: {
    ...typography.h2,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  foodBrand: {
    ...typography.body,
    fontSize: 14,
  },
  servingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  servingRow: {
    marginBottom: spacing.md,
  },
  servingLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servingInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    fontWeight: '600',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  servingUnitText: {
    ...typography.body,
    fontSize: 14,
  },
  totalGramsText: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  macrosCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesSection: {
    flex: 1,
    alignItems: 'center',
  },
  caloriesLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  macrosDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  macrosGrid: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  macroItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  addButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  nutritionHeaderText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  nutritionContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  nutritionLabel: {
    ...typography.body,
    fontSize: 14,
  },
  nutritionValue: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  bottomSpacer: {
    height: 100,
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
