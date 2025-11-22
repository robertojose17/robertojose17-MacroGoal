
/**
 * Favorites Database Management
 * Handles CRUD operations for favorite foods
 */

import { supabase } from '@/app/integrations/supabase/client';

export interface Favorite {
  id: string;
  user_id: string;
  food_source: 'library' | 'barcode' | 'quickadd' | 'custom';
  food_code?: string;
  food_name: string;
  brand?: string;
  per100_calories: number;
  per100_protein: number;
  per100_carbs: number;
  per100_fat: number;
  per100_fiber: number;
  serving_size?: string;
  serving_unit?: string;
  default_grams: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Check if a food is favorited
 */
export async function isFavorite(
  userId: string,
  foodSource: string,
  foodCode?: string
): Promise<boolean> {
  try {
    if (!foodCode) return false;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('food_source', foodSource)
      .eq('food_code', foodCode)
      .maybeSingle();

    if (error) {
      console.error('[Favorites] Error checking favorite:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[Favorites] Error in isFavorite:', error);
    return false;
  }
}

/**
 * Add a food to favorites
 */
export async function addFavorite(favorite: Omit<Favorite, 'id' | 'created_at' | 'updated_at'>): Promise<Favorite | null> {
  try {
    console.log('[Favorites] Adding favorite:', favorite.food_name);

    // Use upsert to handle duplicates gracefully
    const { data, error } = await supabase
      .from('favorites')
      .upsert(
        {
          user_id: favorite.user_id,
          food_source: favorite.food_source,
          food_code: favorite.food_code || null,
          food_name: favorite.food_name,
          brand: favorite.brand || null,
          per100_calories: favorite.per100_calories,
          per100_protein: favorite.per100_protein,
          per100_carbs: favorite.per100_carbs,
          per100_fat: favorite.per100_fat,
          per100_fiber: favorite.per100_fiber,
          serving_size: favorite.serving_size || null,
          serving_unit: favorite.serving_unit || null,
          default_grams: favorite.default_grams,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,food_source,food_code',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Favorites] Error adding favorite:', error);
      return null;
    }

    console.log('[Favorites] Favorite added successfully:', data.id);
    return data as Favorite;
  } catch (error) {
    console.error('[Favorites] Error in addFavorite:', error);
    return null;
  }
}

/**
 * Remove a food from favorites
 */
export async function removeFavorite(
  userId: string,
  foodSource: string,
  foodCode?: string
): Promise<boolean> {
  try {
    console.log('[Favorites] Removing favorite:', foodSource, foodCode);

    if (!foodCode) {
      console.error('[Favorites] Cannot remove favorite without food_code');
      return false;
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('food_source', foodSource)
      .eq('food_code', foodCode);

    if (error) {
      console.error('[Favorites] Error removing favorite:', error);
      return false;
    }

    console.log('[Favorites] Favorite removed successfully');
    return true;
  } catch (error) {
    console.error('[Favorites] Error in removeFavorite:', error);
    return false;
  }
}

/**
 * Remove a favorite by ID
 */
export async function removeFavoriteById(favoriteId: string): Promise<boolean> {
  try {
    console.log('[Favorites] Removing favorite by ID:', favoriteId);

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      console.error('[Favorites] Error removing favorite by ID:', error);
      return false;
    }

    console.log('[Favorites] Favorite removed successfully');
    return true;
  } catch (error) {
    console.error('[Favorites] Error in removeFavoriteById:', error);
    return false;
  }
}

/**
 * Get all favorites for a user
 */
export async function getFavorites(userId: string): Promise<Favorite[]> {
  try {
    console.log('[Favorites] Getting favorites for user:', userId);

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Favorites] Error getting favorites:', error);
      return [];
    }

    console.log('[Favorites] Found', data.length, 'favorites');
    return data as Favorite[];
  } catch (error) {
    console.error('[Favorites] Error in getFavorites:', error);
    return [];
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  userId: string,
  foodSource: string,
  foodCode: string | undefined,
  foodData: {
    food_name: string;
    brand?: string;
    per100_calories: number;
    per100_protein: number;
    per100_carbs: number;
    per100_fat: number;
    per100_fiber: number;
    serving_size?: string;
    serving_unit?: string;
    default_grams: number;
  }
): Promise<boolean> {
  try {
    // Check if already favorited
    const isAlreadyFavorite = await isFavorite(userId, foodSource, foodCode);

    if (isAlreadyFavorite) {
      // Remove from favorites
      return await removeFavorite(userId, foodSource, foodCode);
    } else {
      // Add to favorites
      const result = await addFavorite({
        user_id: userId,
        food_source: foodSource as 'library' | 'barcode' | 'quickadd' | 'custom',
        food_code: foodCode,
        ...foodData,
      });
      return !!result;
    }
  } catch (error) {
    console.error('[Favorites] Error in toggleFavorite:', error);
    return false;
  }
}
