
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { getRecentFoods } from '@/utils/foodDatabase';
import { getMyMealTemplates, calculateMyMealSummary, deleteMyMealTemplate } from '@/utils/myMealTemplateDatabase';
import { getFavorites, removeFavoriteById, Favorite } from '@/utils/favoritesDatabase';
import { OpenFoodFactsProduct, extractServingSize, extractNutrition } from '@/utils/openFoodFacts';
import { supabase } from '@/app/integrations/supabase/client';
import { Food } from '@/types';
import { MyMealTemplate } from '@/types/myMealTemplate';

type TabType = 'all' | 'my-meals' | 'favorites' | 'quick-add';

/**
 * Generate a guaranteed-unique temp_id for food items
 * Uses timestamp + random string to ensure uniqueness
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>() || {};

  const mode = params.mode ?? "diary";  // default mode so it never crashes
  const mealType = params.mealType ?? params.meal ?? "breakfast";
  const context = params.context ?? null;
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = params.returnTo as string;
  const showMyMeals = params.showMyMeals as string; // 'true' if we should show My Meals tab
  
  // Check if we're in My Meals builder mode using context flag
  const isMyMealBuilderMode = context === 'my_meal_builder';
  
  console.log('[AddFood] ========== SCREEN INITIALIZED ==========');
  console.log('[AddFood] Context:', context);
  console.log('[AddFood] Is My Meal Builder Mode:', isMyMealBuilderMode);
  console.log('[AddFood] Return To:', returnTo);
  
  // Initialize activeTab based on showMyMeals param
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (showMyMeals === 'true') {
      console.log('[AddFood] Initializing with My Meals tab active');
      return 'my-meals';
    }
    return 'all';
  });
  
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [myMealTemplates, setMyMealTemplates] = useState<MyMealTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // INLINE SEARCH STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef<string>('');

  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  useEffect(() => {
    console.log("[AddFood] Params:", params);
    console.log("[AddFood] mode:", mode);
    loadData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[AddFood] Screen focused, refreshing data');
      console.log('[AddFood] Refresh param:', params.refresh);
      
      // Reload favorites and My Meals templates
      loadFavorites();
      loadMyMealTemplates();
      
      // If showMyMeals param is set, ensure My Meals tab is active
      if (showMyMeals === 'true') {
        console.log('[AddFood] Setting active tab to My Meals');
        setActiveTab('my-meals');
        
        // Clear the param after handling it
        router.setParams({ showMyMeals: undefined });
      }
    }, [params.refresh, showMyMeals])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const recent = await getRecentFoods();
      setRecentFoods(recent);

      // Load favorites
      await loadFavorites();
      
      // Load My Meals templates
      await loadMyMealTemplates();

      console.log('[AddFood] Loaded data:', { recent: recent.length });
    } catch (error) {
      console.error('[AddFood] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const favs = await getFavorites(user.id);
        setFavorites(favs);
        console.log('[AddFood] Loaded', favs.length, 'favorites');
      }
    } catch (error) {
      console.error('[AddFood] Error loading favorites:', error);
    }
  };

  const loadMyMealTemplates = async () => {
    try {
      console.log('[AddFood] Loading My Meal templates...');
      const templates = await getMyMealTemplates();
      setMyMealTemplates(templates);
      console.log('[AddFood] Loaded', templates.length, 'My Meal templates');
    } catch (error) {
      console.error('[AddFood] Error loading My Meal templates:', error);
    }
  };

  /**
   * INLINE SEARCH LOGIC
   * Performs actual OpenFoodFacts API call
   */
  const performSearch = async (query: string) => {
    console.log('[AddFood] ========== PERFORM SEARCH ==========');
    console.log('[AddFood] Query:', query);
    console.log('[AddFood] Latest query ref:', latestQueryRef.current);
    
    // Update latest query ref
    latestQueryRef.current = query;
    
    // Clear previous results and errors
    setSearchResults([]);
    setSearchError(null);
    
    // Empty query - do nothing (Recent Foods will show)
    if (query.trim().length === 0) {
      console.log('[AddFood] Empty query, showing Recent Foods');
      setIsSearching(false);
      return;
    }
    
    // Less than 2 characters - do nothing
    if (query.trim().length < 2) {
      console.log('[AddFood] Query too short, waiting for more characters');
      setIsSearching(false);
      return;
    }
    
    // Start searching
    setIsSearching(true);
    console.log('[AddFood] Starting OpenFoodFacts search...');
    
    try {
      // URL-encode the query
      const encodedQuery = encodeURIComponent(query.trim());
      
      // Use the exact endpoint specified in requirements
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodedQuery}&search_simple=1&action=process&json=1&page_size=20`;
      
      console.log('[AddFood] Fetching:', url);
      
      // Fetch with User-Agent header
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EliteMacroTracker/1.0 (iOS)',
        },
      });
      
      console.log('[AddFood] Response status:', response.status);
      
      // Check if this search is still relevant
      if (query !== latestQueryRef.current) {
        console.log('[AddFood] Search result outdated, ignoring');
        return;
      }
      
      if (!response.ok) {
        console.error('[AddFood] HTTP error:', response.status);
        setSearchError('Network error. Please check your connection and try again.');
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      const data = await response.json();
      
      console.log('[AddFood] Response data:', {
        hasProducts: !!data.products,
        isArray: Array.isArray(data.products),
        count: data.products?.length || 0,
      });
      
      // Check if this search is still relevant (again, after async operation)
      if (query !== latestQueryRef.current) {
        console.log('[AddFood] Search result outdated after parsing, ignoring');
        return;
      }
      
      // Safe parsing - handle missing or invalid products array
      const products = Array.isArray(data.products) ? data.products : [];
      
      if (products.length === 0) {
        console.log('[AddFood] No products found');
        setSearchError('No foods found. Try a different search term.');
        setSearchResults([]);
      } else {
        console.log('[AddFood] Found', products.length, 'products');
        setSearchResults(products);
        setSearchError(null);
      }
    } catch (error) {
      console.error('[AddFood] Search error:', error);
      
      // Check if this search is still relevant
      if (query !== latestQueryRef.current) {
        console.log('[AddFood] Search error for outdated query, ignoring');
        return;
      }
      
      setSearchError('An error occurred. Please try again.');
      setSearchResults([]);
    } finally {
      // Only update loading state if this is still the latest query
      if (query === latestQueryRef.current) {
        setIsSearching(false);
      }
    }
  };

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = (text: string) => {
    console.log('[AddFood] Search input changed:', text);
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If query is empty, clear results immediately
    if (text.trim().length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      latestQueryRef.current = '';
      return;
    }
    
    // Show searching state immediately for queries >= 2 chars
    if (text.trim().length >= 2) {
      setIsSearching(true);
    }
    
    // Debounce search with 500ms delay
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  /**
   * Retry search after error
   */
  const handleRetrySearch = () => {
    console.log('[AddFood] Retrying search');
    performSearch(searchQuery);
  };

  /**
   * Open food details for a search result
   */
  const handleOpenSearchResultDetails = (product: OpenFoodFactsProduct) => {
    console.log('[AddFood] Opening search result details:', product.product_name);

    const detailsParams: any = {
      offData: JSON.stringify(product),
      meal: mealType,
      date: date,
    };

    if (context === 'my_meal_builder') {
      detailsParams.context = context;
      detailsParams.returnTo = returnTo;
    }

    router.push({
      pathname: '/food-details',
      params: detailsParams,
    });
  };

  const handleBarcodeScan = () => {
    console.log('[AddFood] Navigating to barcode-scan, context:', context);
    const scanParams: any = { meal: mealType, date: date };
    if (context === 'my_meal_builder') {
      scanParams.context = context;
      scanParams.returnTo = returnTo;
    }
    router.push({
      pathname: '/barcode-scan',
      params: scanParams,
    });
  };

  const handleCopyFromPrevious = () => {
    console.log('[AddFood] Navigating to copy-from-previous');
    router.push({
      pathname: '/copy-from-previous',
      params: {
        meal: mealType,
        date: date,
      },
    });
  };

  const handleQuickAdd = () => {
    console.log('[AddFood] Navigating to quick-add, context:', context);
    const quickAddParams: any = { meal: mealType, date: date };
    if (context === 'my_meal_builder') {
      quickAddParams.context = context;
      quickAddParams.returnTo = returnTo;
    }
    router.push({
      pathname: '/quick-add',
      params: quickAddParams,
    });
  };

  /**
   * Open food details for a recent food
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

      if (context === 'my_meal_builder') {
        detailsParams.context = context;
        detailsParams.returnTo = returnTo;
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
   * Add a recent food directly
   * If in builder mode, returns food data via goBack() instead of logging to diary
   */
  const handleAddRecentFood = async (food: Food) => {
    console.log('[AddFood] ========== ADD RECENT FOOD ==========');
    console.log('[AddFood] Food:', food.name);
    console.log('[AddFood] Context:', context);
    console.log('[AddFood] Is My Meal Builder Mode:', isMyMealBuilderMode);

    try {
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

      // Use the food's serving_amount as the default (this is the grams from last time)
      const gramsToAdd = food.serving_amount;
      const servingDescription = food.last_serving_description || `${Math.round(gramsToAdd)} g`;

      // Check if we're in My Meal Builder mode using context
      if (context === 'my_meal_builder') {
        console.log('[AddFood] ✓ My Meal Builder context detected - returning food data');
        
        // Generate unique temp_id and append to draft
        const uniqueTempId = generateTempId();
        console.log('[AddFood] Generated temp_id:', uniqueTempId);
        
        // Prepare food data to return to builder
        const foodDataToReturn = {
          temp_id: uniqueTempId,
          food_source: 'library',
          food_id: food.id,
          barcode: foodData.barcode || undefined,
          food_name: foodData.name,
          brand: foodData.brand || undefined,
          amount_grams: gramsToAdd,
          amount_display: servingDescription,
          per100_calories: foodData.calories,
          per100_protein: foodData.protein,
          per100_carbs: foodData.carbs,
          per100_fat: foodData.fats,
          per100_fiber: foodData.fiber,
        };
        
        console.log('[AddFood] Returning food data to builder:', foodDataToReturn);
        
        // Return to builder using goBack()
        router.setParams({
          returnedFood: JSON.stringify(foodDataToReturn),
        });
        
        router.back();
        
        // STOP here - do not proceed to diary logic
        return;
      }

      // Normal diary mode - log to diary
      console.log('[AddFood] Normal diary mode - logging to diary');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add food');
        return;
      }

      const multiplier = gramsToAdd / 100;

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

  const handleOpenFavoriteDetails = async (favorite: Favorite) => {
    console.log('[AddFood] Opening favorite food details:', favorite.food_name);

    try {
      // Convert favorite to OpenFoodFacts format for the food-details screen
      const offProduct = {
        code: favorite.food_code || '',
        product_name: favorite.food_name,
        brands: favorite.brand || '',
        serving_size: favorite.serving_size || `${favorite.default_grams}g`,
        nutriments: {
          'energy-kcal_100g': favorite.per100_calories,
          'proteins_100g': favorite.per100_protein,
          'carbohydrates_100g': favorite.per100_carbs,
          'fat_100g': favorite.per100_fat,
          'fiber_100g': favorite.per100_fiber,
          'sugars_100g': 0,
        },
      };

      console.log('[AddFood] Navigating to food-details with favorite data');

      const detailsParams: any = {
        offData: JSON.stringify(offProduct),
        meal: mealType,
        date: date,
      };

      if (context === 'my_meal_builder') {
        detailsParams.context = context;
        detailsParams.returnTo = returnTo;
      }

      router.push({
        pathname: '/food-details',
        params: detailsParams,
      });
    } catch (error) {
      console.error('[AddFood] Error opening favorite details:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  /**
   * Handle adding favorite
   * If in builder mode, returns food data via goBack() instead of logging to diary
   */
  const handleAddFavorite = async (favorite: Favorite) => {
    console.log('[AddFood] ========== ADD FAVORITE ==========');
    console.log('[AddFood] Favorite:', favorite.food_name);
    console.log('[AddFood] Context:', context);
    console.log('[AddFood] Is My Meal Builder Mode:', isMyMealBuilderMode);

    // Check if we're in My Meal Builder mode using context
    if (context === 'my_meal_builder') {
      console.log('[AddFood] ✓ My Meal Builder context detected - returning favorite as food data');
      
      // Generate unique temp_id and append to draft
      const uniqueTempId = generateTempId();
      console.log('[AddFood] Generated temp_id:', uniqueTempId);
      
      const foodData = {
        temp_id: uniqueTempId,
        food_source: 'library',
        food_id: undefined,
        barcode: favorite.food_source === 'barcode' ? favorite.food_code : undefined,
        food_name: favorite.food_name,
        brand: favorite.brand || undefined,
        amount_grams: favorite.default_grams,
        amount_display: favorite.serving_size || `${favorite.default_grams}g`,
        per100_calories: favorite.per100_calories,
        per100_protein: favorite.per100_protein,
        per100_carbs: favorite.per100_carbs,
        per100_fat: favorite.per100_fat,
        per100_fiber: favorite.per100_fiber,
      };
      
      console.log('[AddFood] Returning favorite food data to builder:', foodData);
      
      // Return to builder using goBack()
      router.setParams({
        returnedFood: JSON.stringify(foodData),
      });
      
      router.back();
      
      // STOP here - do not proceed to diary logic
      return;
    }

    // Normal diary mode - log to diary
    console.log('[AddFood] Normal diary mode - logging to diary');
    
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

      if (favorite.food_code && favorite.food_source === 'barcode') {
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
            barcode: favorite.food_source === 'barcode' ? favorite.food_code : null,
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

  /**
   * Remove a favorite from the list
   */
  const handleRemoveFavorite = async (favoriteId: string) => {
    console.log('[AddFood] ========== REMOVE FAVORITE ==========');
    console.log('[AddFood] Favorite ID to remove:', favoriteId);
    
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this food from your favorites?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('[AddFood] Remove canceled by user')
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log('[AddFood] User confirmed removal');
            
            // Store previous state for rollback
            const previousFavorites = [...favorites];
            
            // Optimistically update UI
            console.log('[AddFood] Optimistically removing from UI');
            setFavorites(favorites.filter(f => f.id !== favoriteId));
            
            try {
              console.log('[AddFood] Calling removeFavoriteById...');
              const success = await removeFavoriteById(favoriteId);
              
              if (success) {
                console.log('[AddFood] ✓ Favorite removed successfully from database');
              } else {
                console.error('[AddFood] ✗ removeFavoriteById returned false');
                setFavorites(previousFavorites);
                Alert.alert('Error', 'Failed to remove favorite. Please try again.');
              }
            } catch (error: any) {
              console.error('[AddFood] ✗ Error removing favorite:', error);
              setFavorites(previousFavorites);
              Alert.alert('Error', error.message || 'Failed to remove favorite. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleMyMealTemplatePress = (template: MyMealTemplate) => {
    console.log('[AddFood] Opening My Meal Template:', template.name);
    router.push({
      pathname: '/my-meal-template-details',
      params: {
        templateId: template.id,
        meal: mealType,
        date: date,
      },
    });
  };

  const handleCreateMyMeal = () => {
    console.log('[AddFood] ========== CREATE MY MEAL ==========');
    console.log('[AddFood] ✓ Opening NEW builder session');
    router.push('/my-meal-builder');
  };

  /**
   * Delete My Meal Template from list
   */
  const handleDeleteMyMealTemplate = (template: MyMealTemplate) => {
    console.log('[AddFood] ========== DELETE MY MEAL TEMPLATE ==========');
    console.log('[AddFood] Template ID:', template.id);
    console.log('[AddFood] Template name:', template.name);

    Alert.alert(
      'Delete this meal?',
      "This won't remove past diary logs.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('[AddFood] Delete canceled by user'),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[AddFood] User confirmed deletion');

            // Store previous state for rollback
            const previousTemplates = [...myMealTemplates];

            // Optimistically update UI
            console.log('[AddFood] Optimistically removing from UI');
            setMyMealTemplates(myMealTemplates.filter(t => t.id !== template.id));

            try {
              console.log('[AddFood] Calling deleteMyMealTemplate...');
              const success = await deleteMyMealTemplate(template.id);

              if (success) {
                console.log('[AddFood] ✓ Template deleted successfully from database');
              } else {
                console.error('[AddFood] ✗ deleteMyMealTemplate returned false');
                setMyMealTemplates(previousTemplates);
                Alert.alert('Error', 'Failed to delete meal. Please try again.');
              }
            } catch (error: any) {
              console.error('[AddFood] ✗ Error deleting template:', error);
              setMyMealTemplates(previousTemplates);
              Alert.alert('Error', error.message || 'Failed to delete meal. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderFoodItem = (food: Food, index: number) => {
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

  const renderSearchResultItem = (product: OpenFoodFactsProduct, index: number) => {
    const nutrition = extractNutrition(product);
    const serving = extractServingSize(product);
    
    const displayName = product.product_name || 'Unknown Product';
    const displayBrand = product.brands || '';
    const servingText = serving.displayText;
    const calories = Math.round(nutrition.calories * (serving.grams / 100));
    const protein = Math.round(nutrition.protein * (serving.grams / 100));
    const carbs = Math.round(nutrition.carbs * (serving.grams / 100));
    const fat = Math.round(nutrition.fat * (serving.grams / 100));
    const macrosText = `P: ${protein}g • C: ${carbs}g • F: ${fat}g`;
    
    return (
      <View 
        key={index}
        style={[
          styles.foodCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
      >
        <Pressable
          style={styles.foodInfoPressable}
          onPress={() => handleOpenSearchResultDetails(product)}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <View style={styles.foodInfo}>
            <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.foodServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {displayBrand ? `${displayBrand} • ` : ''}{servingText} • {calories} cal
            </Text>
            <Text style={[styles.foodMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {macrosText}
            </Text>
          </View>
        </Pressable>
        
        <View style={styles.chevronContainer}>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
        </View>
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
        <Pressable
          style={styles.foodInfoPressable}
          onPress={() => handleOpenFavoriteDetails(favorite)}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
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
        </Pressable>
        
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
          {!isMyMealBuilderMode && (
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
          )}
        </View>
      </View>
    );
  };

  const renderMyMealTemplateCard = (template: MyMealTemplate, index: number) => {
    const items = template.items || [];
    const summary = items.length > 0 ? calculateMyMealSummary(items) : null;

    return (
      <View
        key={index}
        style={[
          styles.myMealCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
      >
        <Pressable
          style={styles.myMealPressable}
          onPress={() => handleMyMealTemplatePress(template)}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
        >
          <View style={styles.myMealInfo}>
            <Text style={[styles.myMealName, { color: isDark ? colors.textDark : colors.text }]}>
              {template.name}
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
        </Pressable>

        <TouchableOpacity
          style={styles.myMealDeleteButton}
          onPress={() => handleDeleteMyMealTemplate(template)}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={20}
            color="#FF3B30"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderListContent = () => {
    if (searchQuery.trim().length > 0) {
      if (searchQuery.trim().length < 2) {
        return (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Type at least 2 characters to search
            </Text>
          </View>
        );
      }
      
      if (isSearching) {
        return (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
              Searching...
            </Text>
          </View>
        );
      }
      
      if (searchError) {
        return (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="error_outline"
              size={48}
              color="#FF3B30"
            />
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary, marginTop: spacing.md }]}>
              {searchError}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
              onPress={handleRetrySearch}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        );
      }
      
      if (searchResults.length > 0) {
        return (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Search Results ({searchResults.length})
            </Text>
            {searchResults.map((product, index) => renderSearchResultItem(product, index))}
          </React.Fragment>
        );
      }
      
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No foods found
          </Text>
        </View>
      );
    }
    
    return (
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
    );
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]} 
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          {isMyMealBuilderMode ? 'Add Food to Meal' : `Add to ${mealLabels[mealType]}`}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <View 
          style={[
            styles.searchBar,
            { 
              backgroundColor: isDark ? colors.cardDark : '#FFFFFF',
              borderColor: isDark ? colors.borderDark : colors.border,
            }
          ]}
        >
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDark ? colors.textDark : colors.text }
            ]}
            placeholder="Search food..."
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.trim().length === 0 && (
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

          {!isMyMealBuilderMode && (
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
          )}

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
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length > 0 ? (
          renderListContent()
        ) : (
          <React.Fragment>
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

                  {!isMyMealBuilderMode && (
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
                  )}
                </View>
              </React.Fragment>
            )}

            {activeTab === 'all' && renderListContent()}

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

            {activeTab === 'my-meals' && !isMyMealBuilderMode && (
              <React.Fragment>
                <View style={styles.myMealsHeader}>
                  <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Saved Meals
                  </Text>
                  <TouchableOpacity onPress={handleCreateMyMeal}>
                    <IconSymbol
                      ios_icon_name="plus"
                      android_material_icon_name="add"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                {myMealTemplates.length > 0 ? (
                  myMealTemplates.map((template, index) => renderMyMealTemplateCard(template, index))
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
                      onPress={handleCreateMyMeal}
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
          </React.Fragment>
        )}

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
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
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
  chevronContainer: {
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
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
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
    overflow: 'hidden',
  },
  myMealPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
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
  myMealDeleteButton: {
    padding: spacing.md,
    marginRight: spacing.xs,
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
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
