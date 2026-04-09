import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://esgptfiofoaeguslgvcq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA";

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
export const TABLE_SAVED_MEALS = "saved_meals";
export const TABLE_SAVED_MEAL_ITEMS = "saved_meal_items";

// Safe AsyncStorage wrapper compatible with both v1 and v2
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { await AsyncStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

// Eagerly create the client — AsyncStorage is safe to reference at module level
// because it is a pure JS module (no native bridge call at import time).
// The actual storage reads/writes only happen when auth methods are called.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep getSupabase() for backward compatibility with _layout.tsx
export function getSupabase() {
  return supabase;
}

export async function initializeDatabase() {
  return true;
}
