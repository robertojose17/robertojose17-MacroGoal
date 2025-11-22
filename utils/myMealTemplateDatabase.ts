
/**
 * My Meal Template Database Management
 * Handles CRUD operations for saved meal templates
 */

import { supabase } from '@/app/integrations/supabase/client';
import { MyMealTemplate, MyMealTemplateItem, MyMealTemplateSummary } from '@/types/myMealTemplate';

/**
 * Calculate nutrition summary for a My Meal Template
 */
export function calculateMyMealSummary(items: MyMealTemplateItem[]): MyMealTemplateSummary {
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
 * Get all My Meal Templates for the current user
 */
export async function getMyMealTemplates(): Promise<MyMealTemplate[]> {
  try {
    console.log('[MyMealTemplate] Fetching all templates');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[MyMealTemplate] No user found');
      return [];
    }

    const { data, error } = await supabase
      .from('my_meals')
      .select(`
        *,
        items:my_meal_items (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MyMealTemplate] Error fetching templates:', error);
      return [];
    }

    console.log('[MyMealTemplate] Fetched', data?.length || 0, 'templates');
    return (data || []) as MyMealTemplate[];
  } catch (error) {
    console.error('[MyMealTemplate] Error in getMyMealTemplates:', error);
    return [];
  }
}

/**
 * Get a single My Meal Template by ID with all items
 */
export async function getMyMealTemplateById(id: string): Promise<MyMealTemplate | null> {
  try {
    console.log('[MyMealTemplate] Fetching template:', id);

    const { data, error } = await supabase
      .from('my_meals')
      .select(`
        *,
        items:my_meal_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[MyMealTemplate] Error fetching template:', error);
      return null;
    }

    console.log('[MyMealTemplate] Fetched template:', data.name);
    return data as MyMealTemplate;
  } catch (error) {
    console.error('[MyMealTemplate] Error in getMyMealTemplateById:', error);
    return null;
  }
}

/**
 * Create a new My Meal Template
 */
export async function createMyMealTemplate(
  name: string,
  items: Omit<MyMealTemplateItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'>[],
  note?: string
): Promise<MyMealTemplate | null> {
  try {
    console.log('[MyMealTemplate] Creating template:', name);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[MyMealTemplate] No user found');
      return null;
    }

    // Validate items
    if (!items || items.length === 0) {
      console.error('[MyMealTemplate] Cannot create template without items');
      return null;
    }

    // Create the template
    const { data: template, error: templateError } = await supabase
      .from('my_meals')
      .insert({
        user_id: user.id,
        name: name,
        note: note || null,
      })
      .select()
      .single();

    if (templateError) {
      console.error('[MyMealTemplate] Error creating template:', templateError);
      return null;
    }

    console.log('[MyMealTemplate] Created template:', template.id);

    // Create the items
    const itemsToInsert = items.map(item => ({
      my_meal_id: template.id,
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

    const { data: insertedItems, error: itemsError } = await supabase
      .from('my_meal_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('[MyMealTemplate] Error creating items:', itemsError);
      // Clean up the template if items failed
      await supabase.from('my_meals').delete().eq('id', template.id);
      return null;
    }

    console.log('[MyMealTemplate] Created', insertedItems.length, 'items');

    return {
      ...template,
      items: insertedItems as MyMealTemplateItem[],
    } as MyMealTemplate;
  } catch (error) {
    console.error('[MyMealTemplate] Error in createMyMealTemplate:', error);
    return null;
  }
}

/**
 * Update a My Meal Template (name and/or note only)
 */
export async function updateMyMealTemplate(
  id: string,
  name?: string,
  note?: string
): Promise<boolean> {
  try {
    console.log('[MyMealTemplate] Updating template:', id);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    const { error } = await supabase
      .from('my_meals')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[MyMealTemplate] Error updating template:', error);
      return false;
    }

    console.log('[MyMealTemplate] Template updated successfully');
    return true;
  } catch (error) {
    console.error('[MyMealTemplate] Error in updateMyMealTemplate:', error);
    return false;
  }
}

/**
 * Delete a My Meal Template item
 */
export async function deleteMyMealTemplateItem(itemId: string): Promise<boolean> {
  try {
    console.log('[MyMealTemplate] Deleting item:', itemId);

    const { error } = await supabase
      .from('my_meal_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[MyMealTemplate] Error deleting item:', error);
      return false;
    }

    console.log('[MyMealTemplate] Item deleted successfully');
    return true;
  } catch (error) {
    console.error('[MyMealTemplate] Error in deleteMyMealTemplateItem:', error);
    return false;
  }
}

/**
 * Add an item to an existing My Meal Template
 */
export async function addItemToMyMealTemplate(
  templateId: string,
  item: Omit<MyMealTemplateItem, 'id' | 'my_meal_id' | 'created_at' | 'updated_at'>
): Promise<MyMealTemplateItem | null> {
  try {
    console.log('[MyMealTemplate] Adding item to template:', templateId);

    const { data, error } = await supabase
      .from('my_meal_items')
      .insert({
        my_meal_id: templateId,
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
      console.error('[MyMealTemplate] Error adding item:', error);
      return null;
    }

    // Update the template's updated_at timestamp
    await supabase
      .from('my_meals')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', templateId);

    console.log('[MyMealTemplate] Item added successfully');
    return data as MyMealTemplateItem;
  } catch (error) {
    console.error('[MyMealTemplate] Error in addItemToMyMealTemplate:', error);
    return null;
  }
}

/**
 * Delete a My Meal Template
 */
export async function deleteMyMealTemplate(id: string): Promise<boolean> {
  try {
    console.log('[MyMealTemplate] Deleting template:', id);

    // Items will be deleted automatically due to CASCADE foreign key
    const { error } = await supabase
      .from('my_meals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[MyMealTemplate] Error deleting template:', error);
      return false;
    }

    console.log('[MyMealTemplate] Template deleted successfully');
    return true;
  } catch (error) {
    console.error('[MyMealTemplate] Error in deleteMyMealTemplate:', error);
    return false;
  }
}

/**
 * Add a My Meal Template to the diary
 * This creates individual meal_items for each item in the template
 */
export async function addMyMealTemplateToDiary(
  templateId: string,
  mealType: string,
  date: string
): Promise<boolean> {
  try {
    console.log('[MyMealTemplate] ========== ADD TEMPLATE TO DIARY ==========');
    console.log('[MyMealTemplate] Template ID:', templateId);
    console.log('[MyMealTemplate] Target meal type:', mealType);
    console.log('[MyMealTemplate] Target date:', date);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[MyMealTemplate] No user found');
      return false;
    }

    // Get the template with all items
    const template = await getMyMealTemplateById(templateId);
    if (!template || !template.items || template.items.length === 0) {
      console.error('[MyMealTemplate] Template not found or has no items');
      return false;
    }

    console.log('[MyMealTemplate] Found template:', template.name);
    console.log('[MyMealTemplate] Items to add:', template.items.length);

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
      console.log('[MyMealTemplate] Creating new meal for', mealType, 'on', date);
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
        console.error('[MyMealTemplate] Error creating meal:', mealError);
        return false;
      }

      mealId = newMeal.id;
      console.log('[MyMealTemplate] Created meal:', mealId);
    } else {
      console.log('[MyMealTemplate] Using existing meal:', mealId);
    }

    // Process each item in the template
    let successCount = 0;
    let failCount = 0;

    for (const item of template.items) {
      try {
        console.log('[MyMealTemplate] Processing item:', item.food_name);

        // Calculate nutrition for this item
        const multiplier = item.amount_grams / 100;
        const calories = item.per100_calories * multiplier;
        const protein = item.per100_protein * multiplier;
        const carbs = item.per100_carbs * multiplier;
        const fats = item.per100_fat * multiplier;
        const fiber = item.per100_fiber * multiplier;

        console.log('[MyMealTemplate] Calculated nutrition:', {
          calories: Math.round(calories),
          protein: Math.round(protein),
          carbs: Math.round(carbs),
          fats: Math.round(fats),
        });

        // Get or create the food entry
        let foodId = item.food_id;

        // If we don't have a food_id, try to find or create the food
        if (!foodId) {
          console.log('[MyMealTemplate] No food_id, checking if food exists...');

          // Try to find existing food by barcode or name+brand
          let existingFood = null;

          if (item.barcode) {
            const { data } = await supabase
              .from('foods')
              .select('id')
              .eq('barcode', item.barcode)
              .maybeSingle();
            existingFood = data;
          }

          if (!existingFood && item.brand) {
            const { data } = await supabase
              .from('foods')
              .select('id')
              .eq('name', item.food_name)
              .eq('brand', item.brand)
              .maybeSingle();
            existingFood = data;
          }

          if (!existingFood) {
            const { data } = await supabase
              .from('foods')
              .select('id')
              .eq('name', item.food_name)
              .is('brand', null)
              .maybeSingle();
            existingFood = data;
          }

          if (existingFood) {
            foodId = existingFood.id;
            console.log('[MyMealTemplate] Found existing food:', foodId);
          } else {
            // Create a new food entry
            console.log('[MyMealTemplate] Creating new food entry');
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
              console.error('[MyMealTemplate] Error creating food:', foodError);
              failCount++;
              continue; // Skip this item but continue with others
            }

            foodId = newFood.id;
            console.log('[MyMealTemplate] Created new food:', foodId);
          }
        }

        // Create the meal item
        console.log('[MyMealTemplate] Creating meal item...');
        const { error: itemError } = await supabase
          .from('meal_items')
          .insert({
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

        if (itemError) {
          console.error('[MyMealTemplate] Error creating meal item:', itemError);
          failCount++;
          continue;
        }

        console.log('[MyMealTemplate] ✓ Item added successfully');
        successCount++;
      } catch (itemError) {
        console.error('[MyMealTemplate] Error processing item:', itemError);
        failCount++;
      }
    }

    console.log('[MyMealTemplate] ========== SUMMARY ==========');
    console.log('[MyMealTemplate] Success:', successCount);
    console.log('[MyMealTemplate] Failed:', failCount);
    console.log('[MyMealTemplate] Total:', template.items.length);

    // Consider it a success if at least one item was added
    if (successCount > 0) {
      console.log('[MyMealTemplate] Template added to diary successfully');
      return true;
    } else {
      console.error('[MyMealTemplate] Failed to add any items to diary');
      return false;
    }
  } catch (error) {
    console.error('[MyMealTemplate] Error in addMyMealTemplateToDiary:', error);
    return false;
  }
}
