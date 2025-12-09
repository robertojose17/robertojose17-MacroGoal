
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// CRITICAL: Use safe defaults for environment variables
const SUPABASE_URL = "https://esgptfiofoaeguslgvcq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA";

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('[Supabase] ❌ CRITICAL: Missing Supabase credentials');
  console.error('[Supabase] URL:', SUPABASE_URL ? 'present' : 'MISSING');
  console.error('[Supabase] Key:', SUPABASE_PUBLISHABLE_KEY ? 'present' : 'MISSING');
}

// Store the client instance
let supabaseInstance: SupabaseClient<Database> | null = null;

// Lazy load AsyncStorage only when needed and only on native platforms
let AsyncStorage: any = null;
let asyncStorageLoadAttempted = false;

function getAsyncStorage() {
  // Only attempt to load once
  if (asyncStorageLoadAttempted) {
    return AsyncStorage;
  }
  
  asyncStorageLoadAttempted = true;
  
  // Only load AsyncStorage on native platforms
  if (Platform.OS === 'web') {
    console.log('[Supabase] Web platform detected, using localStorage');
    // For web, use localStorage wrapper
    AsyncStorage = {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore errors
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
      },
    };
    return AsyncStorage;
  }
  
  // For native platforms, dynamically import AsyncStorage
  try {
    console.log('[Supabase] Native platform detected, loading AsyncStorage');
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    console.log('[Supabase] ✅ AsyncStorage loaded successfully');
  } catch (error) {
    console.error('[Supabase] ⚠️ Failed to load AsyncStorage:', error);
    // Fallback to a no-op storage
    AsyncStorage = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }
  
  return AsyncStorage;
}

// Function to safely initialize the Supabase client
function initializeSupabase(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  console.log('[Supabase] Initializing client with URL:', SUPABASE_URL);

  try {
    const storage = getAsyncStorage();
    
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    console.log('[Supabase] ✅ Client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    console.error('[Supabase] ❌ Error initializing client:', error);
    throw error;
  }
}

// Create a proxy object that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    // Initialize the client on first access
    if (!supabaseInstance) {
      try {
        initializeSupabase();
      } catch (error) {
        console.error('[Supabase] Failed to initialize on access:', error);
        throw error;
      }
    }
    
    // Return the property from the initialized client
    const value = (supabaseInstance as any)[prop];
    
    // If it's a function, bind it to the client instance
    if (typeof value === 'function') {
      return value.bind(supabaseInstance);
    }
    
    return value;
  }
});
