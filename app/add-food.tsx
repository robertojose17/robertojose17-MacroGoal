
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { getRecentFoods } from '@/utils/foodDatabase';
import { getMyMeals, calculateMyMealSummary } from '@/utils/myMealsDatabase';
import { getFavorites, removeFavoriteById, Favorite } from '@/utils/favoritesDatabase';
import { supabase } from '@/app/integrations/supabase/client';
import { Food } from '@/types';
import { MyMeal } from '@/types/myMeals';

type TabType = 'all' | 'my-meals' | 'favorites' | 'quick-add';

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const mode = params.mode as string; // 'my_meal_builder' or undefined
  const returnTo = params.returnTo as string;
  const targetMealId = params.mealId as string;
  
  // Check if we're in My Meals builder mode
  const isMyMealBuilderMode = mode === 'my_meal_builder';
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [myMeals, setMyMeals] = useState<MyMeal[]>([]);
  const [loading, setLoading] = useState(false);

  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  useEffect(() => {
    console.log('[AddFood] Screen mounted on platform:', Platform.OS);
    console.log('[AddFood] Params:', { mealType, date, mode });
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const recent = await getRecentFoods();
      const meals = await getMyMeals();
      setRecentFoods(recent);
      setMyMeals(meals);

      // Load favorites
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const favs = await getFavorites(user.id);
        setFavorites(favs);
        console.log('[AddFood] Loaded', favs.length, 'favorites');
      }

      console.log('[AddFood] Loaded data:', { recent: recent.length, myMeals: meals.length });
    } catch (error) {
      console.error('[AddFood] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPress = () => {
    console.log('[AddFood] Opening Food Library search, mode:', mode);
    const searchParams: any = { meal: mealType, date: date };
    if (mode === 'my_meal_builder') {
      searchParams.mode = mode;
      searchParams.returnTo = returnTo;
      searchParams.mealId = targetMealId;
    }
    router.push({
      pathname: '/food-search',
      params: searchParams,
    });
  };

  const handleBarcodeScan = () => {
    console.log('[AddFood] Navigating to barcode-scan, mode:', mode);
    const scanParams: any = { meal: mealType, date: date };
    if (mode === 'my_meal_builder') {
      scanParams.mode = mode;
      scanParams.returnTo = returnTo;
      scanParams.mealId = targetMealId;
    }
    router.push({
      pathname: '/barcode-scan',
      params: scanParams,
    });
  };

  const handleCopyFromPrevious = () => {
    console.log('[AddFood] Copy from previous - not yet implemented');
    // TODO: Implement copy from previous functionality
  };

  const handleQuickAdd = () => {
    console.log('[AddFood] Navigating to quick-add, mode:', mode);
    const quickAddParams: any = { meal: mealType, date: date };
    if (mode === 'my_meal_builder') {
      quickAddParams.mode = mode;
      quickAddParams.returnTo = returnTo;
      quickAddParams.mealId = targetMealId;
    }
    router.push({
      pathname: '/quick-add',
      params: quickAddParams,
    });
  };

  /**
   * Open food details for a recent food
   * This converts the recent food data to OpenFoodFacts format for the details screen
   */
  const handleOpenRecentFoodDetails = async (food: Food) => {
    console.log('[AddFood] Opening recent food details:', food.name);

    try {
      // Fetch the full food data from database to get per-100g values
      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .select('*')
        .eq('id', food.id)
        .single();

      if (foodError || !foodData) {
        console.error('[AddFood] Error fetching food data:', foodError);
        Alert.alert('Error', 'Failed to load food details');
        return;
      }

      // Convert to OpenFoodFacts format for the food-details screen
      const offProduct = {
        code: foodData.barcode || '',
        product_name: foodData.name,
        brands: foodData.brand || '',
        serving_size: food.last_serving_description || `${Math.round(food.serving_amount)} g`,
        nutriments: {
          'energy-kcal_100g': foodData.calories,
          'proteins_100g': foodData.protein,
          'carbohydrates_100g': foodData.carbs,
          'fat_100g': foodData.fats,
          'fiber_100g': foodData.fiber,
          'sugars_100g': 0,
        },
      };

      console.log('[AddFood] Navigating to food-details with OFF data');

      const detailsParams: any = {
        offData: JSON.stringify(offProduct),
        meal: mealType,
        date: date,
      };

      if (mode === 'my_meal_builder') {
        detailsParams.mode = mode;
        detailsParams.returnTo = returnTo;
        detailsParams.mealId = targetMealId;
      }

      router.push({
        pathname: '/food-details',
        params: detailsParams,
      });
    } catch (error) {
      console.error('[AddFood] Error opening recent food details:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  /**
   * Add a recent food directly to the diary using its default serving
   * This is called when the "+" button is tapped on a Recent Food item
   */
  const handleAddRecentFood = async (food: Food) => {
    console.log('[AddFood] Adding recent food directly to diary:', food.name);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add food');
        return;
      }

      // Use the food's serving_amount as the default (this is the grams from last time)
      const gramsToAdd = food.serving_amount;
      const multiplier = gramsToAdd / 100;

      // Calculate nutrition based on the per-100g values stored in the food
      // Note: For recent foods, the calories/protein/etc are already for the last serving
      // But we need to recalculate based on per-100g to be accurate
      
      // Get the food from database to get per-100g values
      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .select('*')
        .eq('id', food.id)
        .single();

      if (foodError || !foodData) {
        console.error('[AddFood] Error fetching food data:', foodError);
        Alert.alert('Error', 'Failed to load food details');
        return;
      }

      // Calculate nutrition for the default serving
      const calories = foodData.calories * multiplier;
      const protein = foodData.protein * multiplier;
      const carbs = foodData.carbs * multiplier;
      const fats = foodData.fats * multiplier;
      const fiber = foodData.fiber * multiplier;

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
        console.log('[AddFood] Creating new meal for', mealType, 'on', date);
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
          console.error('[AddFood] Error creating meal:', mealError);
          Alert.alert('Error', 'Failed to create meal');
          return;
        }

        mealId = newMeal.id;
        console.log('[AddFood] Created new meal:', mealId);
      } else {
        console.log('[AddFood] Using existing meal:', mealId);
      }

      // Use the last serving description if available, otherwise generate one
      const servingDescription = food.last_serving_description || `${Math.round(gramsToAdd)} g`;

      console.log('[AddFood] Inserting NEW meal item with serving:', servingDescription);

      // ALWAYS INSERT a new meal item (never update existing ones)
      const { error: mealItemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_id: food.id,
          quantity: multiplier,
          calories: calories,
          protein: protein,
          carbs: carbs,
          fats: fats,
          fiber: fiber,
          serving_description: servingDescription,
          grams: gramsToAdd,
        });

      if (mealItemError) {
        console.error('[AddFood] Error creating meal item:', mealItemError);
        Alert.alert('Error', 'Failed to add food to meal');
        return;
      }

      console.log('[AddFood] Recent food added successfully!');
      console.log('[AddFood] Navigating back to diary');
      
      // Navigate back to the home/diary screen
      router.dismissTo('/(tabs)/(home)/');
    } catch (error) {
      console.error('[AddFood] Error adding recent food:', error);
      Alert.alert('Error', 'An unexpected error occurred while adding food');
    }
  };

  const handleAddFavorite = async (favorite: Favorite) => {
    console.log('[AddFood] Adding favorite to meal:', favorite.food_name);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add food');
        return;
      }

      // Calculate nutrition for default serving
      const multiplier = favorite.default_grams / 100;
      const calories = favorite.per100_calories * multiplier;
      const protein = favorite.per100_protein * multiplier;
      const carbs = favorite.per100_carbs * multiplier;
      const fat = favorite.per100_fat * multiplier;
      const fiber = favorite.per100_fiber * multiplier;

      // Check if food exists in database
      let foodId: string | null = null;

      if (favorite.food_code) {
        const { data: existingFood } = await supabase
          .from('foods')
          .select('id')
          .eq('barcode', favorite.food_code)
          .maybeSingle();

        if (existingFood) {
          foodId = existingFood.id;
        }
      }

      // Create food if it doesn't exist
      if (!foodId) {
        const { data: newFood, error: foodError } = await supabase
          .from('foods')
          .insert({
            name: favorite.food_name,
            brand: favorite.brand || null,
            serving_amount: 100,
            serving_unit: 'g',
            calories: favorite.per100_calories,
            protein: favorite.per100_protein,
            carbs: favorite.per100_carbs,
            fats: favorite.per100_fat,
            fiber: favorite.per100_fiber,
            barcode: favorite.food_code || null,
            user_created: false,
          })
          .select()
          .single();

        if (foodError) {
          console.error('[AddFood] Error creating food:', foodError);
          Alert.alert('Error', 'Failed to add food');
          return;
        }

        foodId = newFood.id;
      }

      // Find or create meal
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (!mealId) {
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
          console.error('[AddFood] Error creating meal:', mealError);
          Alert.alert('Error', 'Failed to create meal');
          return;
        }

        mealId = newMeal.id;
      }

      // Add meal item
      const { error: mealItemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_id: foodId,
          quantity: multiplier,
          calories: calories,
          protein: protein,
          carbs: carbs,
          fats: fat,
          fiber: fiber,
          serving_description: favorite.serving_size || `${favorite.default_grams}g`,
          grams: favorite.default_grams,
        });

      if (mealItemError) {
        console.error('[AddFood] Error adding meal item:', mealItemError);
        Alert.alert('Error', 'Failed to add food to meal');
        return;
      }

      console.log('[AddFood] Favorite added to meal successfully');
      router.dismissTo('/(tabs)/(home)/');
    } catch (error) {
      console.error('[AddFood] Error adding favorite:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this food from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removeFavoriteById(favoriteId);
            if (success) {
              setFavorites(favorites.filter(f => f.id !== favoriteId));
              console.log('[AddFood] Favorite removed');
            } else {
              Alert.alert('Error', 'Failed to remove favorite');
            }
          },
        },
      ]
    );
  };

  const handleMyMealPress = (meal: MyMeal) => {
    console.log('[AddFood] Opening My Meal:', meal.name);
    router.push({
      pathname: '/my-meals-details',
      params: {
        mealId: meal.id,
        meal: mealType,
        date: date,
        fromAddFood: 'true',
      },
    });
  };

  const handleViewAllMyMeals = () => {
    console.log('[AddFood] Viewing all My Meals');
    router.push({
      pathname: '/my-meals-list',
      params: {
        meal: mealType,
        date: date,
        fromAddFood: 'true',
      },
    });
  };

  const renderFoodItem = (food: Food, index: number) => {
    // For recent foods, display the last used serving info
    const servingText = food.last_serving_description || `${Math.round(food.serving_amount)}g`;
    const macrosText = `P: ${Math.round(food.protein)}g • C: ${Math.round(food.carbs)}g • F: ${Math.round(food.fats)}g`;
    
    return (
      <View 
        key={index}
        style={[
          styles.foodCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
      >
        {/* Pressable row area - excludes the + button */}
        <Pressable
          style={styles.foodInfoPressable}
          onPress={() => handleOpenRecentFoodDetails(food)}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <View style={styles.foodInfo}>
            <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
              {food.name}
            </Text>
            <Text style={[styles.foodServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {food.brand ? `${food.brand} • ` : ''}{servingText} • {Math.round(food.calories)} cal
            </Text>
            <Text style={[styles.foodMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {macrosText}
            </Text>
          </View>
        </Pressable>
        
        {/* + button with its own touch target */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddRecentFood(food)}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFavoriteItem = (favorite: Favorite, index: number) => {
    const multiplier = favorite.default_grams / 100;
    const calories = Math.round(favorite.per100_calories * multiplier);
    const protein = Math.round(favorite.per100_protein * multiplier);
    const carbs = Math.round(favorite.per100_carbs * multiplier);
    const fat = Math.round(favorite.per100_fat * multiplier);

    const servingText = favorite.serving_size || `${favorite.default_grams}g`;
    const macrosText = `P: ${protein}g • C: ${carbs}g • F: ${fat}g`;

    return (
      <View 
        key={index}
        style={[
          styles.foodCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
      >
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
            {favorite.food_name}
          </Text>
          <Text style={[styles.foodServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {favorite.brand ? `${favorite.brand} • ` : ''}{servingText} • {calories} cal
          </Text>
          <Text style={[styles.foodMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {macrosText}
          </Text>
        </View>
        <View style={styles.favoriteActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddFavorite(favorite)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(favorite.id)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={18}
              color="#FF3B30"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMyMealCard = (meal: MyMeal, index: number) => {
    const items = meal.items || [];
    const summary = items.length > 0 ? calculateMyMealSummary(items) : null;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.myMealCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
        onPress={() => handleMyMealPress(meal)}
        activeOpacity={0.7}
      >
        <View style={styles.myMealInfo}>
          <Text style={[styles.myMealName, { color: isDark ? colors.textDark : colors.text }]}>
            {meal.name}
          </Text>
          {summary && (
            <React.Fragment>
              <Text style={[styles.myMealCalories, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                {Math.round(summary.totalCalories)} kcal • {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
              </Text>
              <Text style={[styles.myMealMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                P: {Math.round(summary.totalProtein)}g • C: {Math.round(summary.totalCarbs)}g • F: {Math.round(summary.totalFat)}g
              </Text>
            </React.Fragment>
          )}
        </View>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={20}
          color={isDark ? colors.textSecondaryDark : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  // MY MEALS BUILDER MODE - Simplified UI with only 4 options
  if (isMyMealBuilderMode) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]} 
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Add Food to Meal
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Choose an option
          </Text>

          {/* Search Food Library */}
          <TouchableOpacity
            style={[
              styles.builderOptionCard,
              { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
            ]}
            onPress={handleSearchPress}
            activeOpacity={0.7}
          >
            <View style={[styles.builderOptionIconContainer, { backgroundColor: '#E0F2FE' }]}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={28}
                color="#0EA5E9"
              />
            </View>
            <View style={styles.builderOptionTextContainer}>
              <Text style={[styles.builderOptionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Search Food Library
              </Text>
              <Text style={[styles.builderOptionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Search from millions of foods
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Scan Barcode */}
          <TouchableOpacity
            style={[
              styles.builderOptionCard,
              { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
            ]}
            onPress={handleBarcodeScan}
            activeOpacity={0.7}
          >
            <View style={[styles.builderOptionIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <IconSymbol
                ios_icon_name="barcode.viewfinder"
                android_material_icon_name="qr_code_scanner"
                size={28}
                color="#8B5CF6"
              />
            </View>
            <View style={styles.builderOptionTextContainer}>
              <Text style={[styles.builderOptionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Scan Barcode
              </Text>
              <Text style={[styles.builderOptionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Scan product barcode
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Quick Add */}
          <TouchableOpacity
            style={[
              styles.builderOptionCard,
              { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
            ]}
            onPress={handleQuickAdd}
            activeOpacity={0.7}
          >
            <View style={[styles.builderOptionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={28}
                color="#F59E0B"
              />
            </View>
            <View style={styles.builderOptionTextContainer}>
              <Text style={[styles.builderOptionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Quick Add
              </Text>
              <Text style={[styles.builderOptionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Manually enter calories & macros
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Favorites */}
          <TouchableOpacity
            style={[
              styles.builderOptionCard,
              { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
            ]}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.builderOptionIconContainer, { backgroundColor: '#FFEDD5' }]}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={28}
                color="#F97316"
              />
            </View>
            <View style={styles.builderOptionTextContainer}>
              <Text style={[styles.builderOptionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Favorites
              </Text>
              <Text style={[styles.builderOptionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Choose from your favorite foods
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={20}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Show favorites list if that option was selected */}
          {activeTab === 'favorites' && (
            <React.Fragment>
              <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.lg }]}>
                Favorite Foods
              </Text>
              {favorites.length > 0 ? (
                favorites.map((favorite, index) => renderFavoriteItem(favorite, index))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    No favorite foods yet
                  </Text>
                </View>
              )}
            </React.Fragment>
          )}

          {/* Bottom padding to avoid tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // NORMAL MODE - Full Add Food menu with all options
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]} 
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Add to {mealLabels[mealType]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sticky Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity 
          style={[
            styles.searchBar,
            { 
              backgroundColor: isDark ? colors.cardDark : '#FFFFFF',
              borderColor: isDark ? colors.borderDark : colors.border,
            }
          ]}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <Text style={[styles.searchPlaceholder, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Search food...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Row */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'all' && styles.tabTextActive,
            { color: activeTab === 'all' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            All
          </Text>
          {activeTab === 'all' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('my-meals')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'my-meals' && styles.tabTextActive,
            { color: activeTab === 'my-meals' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            My Meals
          </Text>
          {activeTab === 'my-meals' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'favorites' && styles.tabTextActive,
            { color: activeTab === 'favorites' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            Favorites
          </Text>
          {activeTab === 'favorites' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('quick-add')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'quick-add' && styles.tabTextActive,
            { color: activeTab === 'quick-add' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            Quick Add
          </Text>
          {activeTab === 'quick-add' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions - Only show on "All" tab */}
        {activeTab === 'all' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionCardLeft]}
                onPress={handleBarcodeScan}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIconContainer}>
                  <IconSymbol
                    ios_icon_name="barcode.viewfinder"
                    android_material_icon_name="qr_code_scanner"
                    size={32}
                    color="#8B5CF6"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Barcode Scan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionCardRight]}
                onPress={handleCopyFromPrevious}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIconContainer}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="event"
                    size={32}
                    color="#10B981"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Copy from Previous
                </Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        )}

        {/* Recent Foods */}
        {activeTab === 'all' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Recent Foods
            </Text>
            {recentFoods.length > 0 ? (
              recentFoods.map((food, index) => renderFoodItem(food, index))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  No recent foods yet
                </Text>
              </View>
            )}
          </React.Fragment>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Favorite Foods
            </Text>
            {favorites.length > 0 ? (
              favorites.map((favorite, index) => renderFavoriteItem(favorite, index))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="star"
                  android_material_icon_name="star_border"
                  size={48}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
                  No favorite foods yet
                </Text>
                <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.xs }]}>
                  Tap the star icon on any food to add it to your favorites
                </Text>
              </View>
            )}
          </React.Fragment>
        )}

        {/* My Meals Tab */}
        {activeTab === 'my-meals' && (
          <React.Fragment>
            <View style={styles.myMealsHeader}>
              <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Saved Meals
              </Text>
              <TouchableOpacity onPress={handleViewAllMyMeals}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            {myMeals.length > 0 ? (
              myMeals.slice(0, 5).map((meal, index) => renderMyMealCard(meal, index))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="fork.knife"
                  android_material_icon_name="restaurant"
                  size={48}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
                  No saved meals yet
                </Text>
                <TouchableOpacity
                  style={[styles.createMealButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                  onPress={handleViewAllMyMeals}
                >
                  <Text style={styles.createMealButtonText}>Create Your First Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </React.Fragment>
        )}

        {activeTab === 'quick-add' && (
          <View style={styles.quickAddContainer}>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Quick Add Calories
            </Text>
            <TouchableOpacity
              style={[styles.quickAddButton, { backgroundColor: colors.primary }]}
              onPress={handleQuickAdd}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.quickAddButtonText}>
                Manually Enter Calories & Macros
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding to avoid tab bar */}
        <View style={{ height: 100 }} />
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
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    ...typography.body,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  tabText: {
    ...typography.body,
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg + spacing.md,
    borderRadius: borderRadius.lg,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 1,
  },
  quickActionCardLeft: {
    backgroundColor: '#F3E8FF',
  },
  quickActionCardRight: {
    backgroundColor: '#D1FAE5',
  },
  quickActionIconContainer: {
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
    overflow: 'hidden',
  },
  foodInfoPressable: {
    flex: 1,
    padding: spacing.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  foodServing: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  foodMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  favoriteActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginVertical: spacing.md,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myMealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  myMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
  },
  myMealInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  myMealName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  myMealCalories: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  myMealMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  createMealButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  createMealButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickAddContainer: {
    paddingTop: spacing.md,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  quickAddButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // MY MEALS BUILDER MODE STYLES
  builderOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  builderOptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  builderOptionTextContainer: {
    flex: 1,
  },
  builderOptionTitle: {
    ...typography.bodyBold,
    fontSize: 17,
    marginBottom: 2,
  },
  builderOptionDescription: {
    ...typography.caption,
    fontSize: 13,
  },
});
