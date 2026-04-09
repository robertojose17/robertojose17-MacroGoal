
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://esgptfiofoaeguslgvcq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA";

// Import the supabase client like this:
// import { supabase } from "@/lib/supabase/client";

export const SUPABASE_PROJECT_URL = SUPABASE_URL;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Must be false for React Native — no URL-based OAuth callbacks
  },
});

// Table name constants - USE THESE EVERYWHERE
export const TABLE_SAVED_MEALS = "saved_meals";
export const TABLE_SAVED_MEAL_ITEMS = "saved_meal_items";

// Database initialization function
export async function initializeDatabase() {
  console.log('[Supabase] Verifying database tables...');

  try {
    const { data: testMeals, error: mealsError } = await supabase
      .from(TABLE_SAVED_MEALS)
      .select('id')
      .limit(1);

    if (mealsError) {
      console.error('[Supabase] saved_meals table error:', mealsError.message);
      return false;
    }

    console.log('[Supabase] saved_meals OK, rows checked:', testMeals?.length ?? 0);

    const { data: testItems, error: itemsError } = await supabase
      .from(TABLE_SAVED_MEAL_ITEMS)
      .select('id')
      .limit(1);

    if (itemsError) {
      console.error('[Supabase] saved_meal_items table error:', itemsError.message);
      return false;
    }

    console.log('[Supabase] saved_meal_items OK, rows checked:', testItems?.length ?? 0);
    console.log('[Supabase] All tables verified');
    return true;
  } catch (error) {
    console.error('[Supabase] Unexpected error during database verification:', error);
    return false;
  }
}
