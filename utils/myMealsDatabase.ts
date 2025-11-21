
/**
 * My Meals Database Management
 * Handles CRUD operations for saved meal templates
 */

import { supabase } from '@/app/integrations/supabase/client';
import { MyMeal, MyMealItem, MyMealSummary, CreateMyMealParams, UpdateMyMealParams } from '@/types/myMeals';

/**
 * Calculate nutrition summary for a My Meal
 */
export function calculateMyMealSummary(items: MyMealItem[]): MyMealSummary {
  const summary = items.reduce(
    (acc, item) => {
      const multiplier = item.amount_grams / 100;
      return {
        totalCalories: acc.totalCalories + (item.per100_calories * multiplier),
        totalProtein: acc.totalProtein + (item.per100_protein * multiplier),
        totalCarbs: acc.totalCarbs + (item.per100_carbs * multiplier),
        totalFat: acc.totalFat + (item.per100_fat * multiplier),
        totalFiber: acc.totalFiber + (item.per100_fiber * multiplier),
        itemCount: acc.itemCount + 1,
      };
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, itemCount: 0 }
  );

  return summary;
}

/**
 * Get all My Meals for the current user
 */
export async function getMyMeals(): Promise<MyMeal[]> {
  try {
    console.log('[MyMeals] Fetching all My Meals');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[MyMeals] No user found');
      return [];
    }

    const { data, error } = await supabase
      .from('my_meals')
      .select(`
        *,
        my_meal_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MyMeals] Error fetching My Meals:', error);
      return [];
    }

    console.log('[MyMeals] Fetched', data?.length || 0, 'My Meals');
    return (data || []) as MyMeal[];
  } catch (error) {
    console.error('[MyMeals] Error in getMyMeals:', error);
    return [];
  }
}

/**
 * Get a single My Meal by ID with all items
 */
export async function getMyMealById(id: string): Promise<MyMeal | null> {
  try {
    console.log('[MyMeals] Fetching My Meal:', id);

    const { data, error } = await supabase
      .from('my_meals')
      .select(`
        *,
        my_meal_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[MyMeals] Error fetching My Meal:', error);
      return null;
    }

    console.log('[MyMeals] Fetched My Meal:', data.name);
    return data as MyMeal;
  } catch (error) {
    console.error('[MyMeals] Error in getMyMealById:', error);
    return null;
  }
}

/**
 * Create a new My Meal
 */
export async function createMyMeal(params: CreateMyMealParams): Promise<MyMeal | null> {
  try {
    console.log('[MyMeals] Creating My Meal:', params.name);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[MyMeals] No user found');
      return null;
    }

    // Validate items
    if (!params.items || params.items.length === 0) {
      console.error('[MyMeals] Cannot create My Meal without items');
      return null;
    }

    // Create the My Meal
    const { data: meal, error: mealError } = await supabase
      .from('my_meals')
      .insert({
        user_id: user.id,
        name: params.name,
        note: params.note || null,
      })
      .select()
      .single();

    if (mealError) {
      console.error('[MyMeals] Error creating My Meal:', mealError);
      return null;
    }

    console.log('[MyMeals] Created My Meal:', meal.id);

    // Create the items
    const itemsToInsert = params.items.map(item => ({
      my_meal_id: meal.id,
      food_source: item.food_source,
      food_id: item.food_id || null,
      barcode: item.barcode || null,
      ai_snapshot_id: item.ai_snapshot_id || null,
      food_name: item.food_name,
      brand: item.brand || null,
      amount_grams: item.amount_grams,
      amount_display: item.amount_display,
      per100_calories: item.per100_calories,
      per100_protein: item.per100_protein,
      per100_carbs: item.per100_carbs,
      per100_fat: item.per100_fat,
      per100_fiber: item.per100_fiber || 0,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('my_meal_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('[MyMeals] Error creating My Meal items:', itemsError);
      // Clean up the meal if items failed
      await supabase.from('my_meals').delete().eq('id', meal.id);
      return null;
    }

    console.log('[MyMeals] Created', items.length, 'items');

    return {
      ...meal,
      items: items as MyMealItem[],
    } as MyMeal;
  } catch (error) {
    console.error('[MyMeals] Error in createMyMeal:', error);
    return null;
  }
}

/**
 * Update a My Meal (name and/or note only)
 */
export async function updateMyMeal(params: UpdateMyMealParams): Promise<boolean> {
  try {
    console.log('[MyMeals] Updating My Meal:', params.id);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.name !== undefined) {
      updateData.name = params.name;
    }

    if (params.note !== undefined) {
      updateData.note = params.note;
    }

    const { error } = await supabase
      .from('my_meals')
      .update(updateData)
      .eq('id', params.id);

    if (error) {
      console.error('[MyMeals] Error updating My Meal:', error);
      return false;
    }

    console.log('[MyMeals] My Meal updated successfully');
    return true;
  } catch (error) {
    console.error('[MyMeals] Error in updateMyMeal:', error);
    return false;
  }
}

/**
 * Delete a My Meal item
 */
export async function deleteMyMealItem(itemId: string): Promise<boolean> {
  try {
    console.log('[MyMeals] Deleting My Meal item:', itemId);

    const { error } = await supabase
      .from('my_meal_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[MyMeals] Error deleting My Meal item:', error);
      return false;
    }

    console.log('[MyMeals] My Meal item deleted successfully');
    return true;
  } catch (error) {
    console.error('[MyMeals] Error in deleteMyMealItem:', error);
    return false;
  }
}

/**
 * Add an item to an existing My Meal
 */
export async function addItemToMyMeal(
  myMealId: string,
  item: Omit<MyMealItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'>
): Promise<MyMealItem | null> {
  try {
    console.log('[MyMeals] Adding item to My Meal:', myMealId);

    const { data, error } = await supabase
      .from('my_meal_items')
      .insert({
        my_meal_id: myMealId,
        food_source: item.food_source,
        food_id: item.food_id || null,
        barcode: item.barcode || null,
        ai_snapshot_id: item.ai_snapshot_id || null,
        food_name: item.food_name,
        brand: item.brand || null,
        amount_grams: item.amount_grams,
        amount_display: item.amount_display,
        per100_calories: item.per100_calories,
        per100_protein: item.per100_protein,
        per100_carbs: item.per100_carbs,
        per100_fat: item.per100_fat,
        per100_fiber: item.per100_fiber || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[MyMeals] Error adding item to My Meal:', error);
      return null;
    }

    // Update the My Meal's updated_at timestamp
    await supabase
      .from('my_meals')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', myMealId);

    console.log('[MyMeals] Item added successfully');
    return data as MyMealItem;
  } catch (error) {
    console.error('[MyMeals] Error in addItemToMyMeal:', error);
    return null;
  }
}

/**
 * Update a My Meal item (amount only)
 */
export async function updateMyMealItem(
  itemId: string,
  amountGrams: number,
  amountDisplay: string
): Promise<boolean> {
  try {
    console.log('[MyMeals] Updating My Meal item:', itemId);

    const { error } = await supabase
      .from('my_meal_items')
      .update({
        amount_grams: amountGrams,
        amount_display: amountDisplay,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      console.error('[MyMeals] Error updating My Meal item:', error);
      return false;
    }

    console.log('[MyMeals] My Meal item updated successfully');
    return true;
  } catch (error) {
    console.error('[MyMeals] Error in updateMyMealItem:', error);
    return false;
  }
}

/**
 * Delete a My Meal
 */
export async function deleteMyMeal(id: string): Promise<boolean> {
  try {
    console.log('[MyMeals] Deleting My Meal:', id);

    const { error } = await supabase
      .from('my_meals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[MyMeals] Error deleting My Meal:', error);
      return false;
    }

    console.log('[MyMeals] My Meal deleted successfully');
    return true;
  } catch (error) {
    console.error('[MyMeals] Error in deleteMyMeal:', error);
    return false;
  }
}

/**
 * Add a My Meal to the diary
 * This creates individual meal_items for each item in the My Meal
 */
export async function addMyMealToDiary(
  myMealId: string,
  mealType: string,
  date: string
): Promise<boolean> {
  try {
    console.log('[MyMeals] Adding My Meal to diary:', myMealId, mealType, date);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[MyMeals] No user found');
      return false;
    }

    // Get the My Meal with all items
    const myMeal = await getMyMealById(myMealId);
    if (!myMeal || !myMeal.items || myMeal.items.length === 0) {
      console.error('[MyMeals] My Meal not found or has no items');
      return false;
    }

    // Find or create the meal for this date and meal type
    let { data: existingMeal } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('meal_type', mealType)
      .maybeSingle();

    let mealId = existingMeal?.id;

    if (!mealId) {
      console.log('[MyMeals] Creating new meal for', mealType, 'on', date);
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
        console.error('[MyMeals] Error creating meal:', mealError);
        return false;
      }

      mealId = newMeal.id;
    }

    // For each item in the My Meal, create a meal_item
    const mealItemsToInsert = [];

    for (const item of myMeal.items) {
      // Calculate nutrition for this item
      const multiplier = item.amount_grams / 100;
      const calories = item.per100_calories * multiplier;
      const protein = item.per100_protein * multiplier;
      const carbs = item.per100_carbs * multiplier;
      const fats = item.per100_fat * multiplier;
      const fiber = item.per100_fiber * multiplier;

      // Get or create the food entry
      let foodId = item.food_id;

      if (!foodId) {
        // Create a food entry for this item
        const { data: newFood, error: foodError } = await supabase
          .from('foods')
          .insert({
            name: item.food_name,
            brand: item.brand || null,
            serving_amount: 100,
            serving_unit: 'g',
            calories: item.per100_calories,
            protein: item.per100_protein,
            carbs: item.per100_carbs,
            fats: item.per100_fat,
            fiber: item.per100_fiber,
            barcode: item.barcode || null,
            user_created: false,
          })
          .select()
          .single();

        if (foodError) {
          console.error('[MyMeals] Error creating food:', foodError);
          continue; // Skip this item but continue with others
        }

        foodId = newFood.id;
      }

      mealItemsToInsert.push({
        meal_id: mealId,
        food_id: foodId,
        quantity: multiplier,
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
        fiber: fiber,
        serving_description: item.amount_display,
        grams: item.amount_grams,
      });
    }

    // Insert all meal items
    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(mealItemsToInsert);

    if (itemsError) {
      console.error('[MyMeals] Error creating meal items:', itemsError);
      return false;
    }

    console.log('[MyMeals] My Meal added to diary successfully');
    return true;
  } catch (error) {
    console.error('[MyMeals] Error in addMyMealToDiary:', error);
    return false;
  }
}
