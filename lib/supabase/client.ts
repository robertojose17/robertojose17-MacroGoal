import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://esgptfiofoaeguslgvcq.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA';

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
export const TABLE_SAVED_MEALS = 'saved_meals';
export const TABLE_SAVED_MEAL_ITEMS = 'saved_meal_items';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client!;
}

export const supabase = {
  get auth() { return getSupabase().auth; },
  get from() { return getSupabase().from.bind(getSupabase()); },
  get storage() { return getSupabase().storage; },
  get functions() { return getSupabase().functions; },
  get rpc() { return getSupabase().rpc.bind(getSupabase()); },
  get channel() { return getSupabase().channel.bind(getSupabase()); },
  get removeChannel() { return getSupabase().removeChannel.bind(getSupabase()); },
  get removeAllChannels() { return getSupabase().removeAllChannels.bind(getSupabase()); },
  get getChannels() { return getSupabase().getChannels.bind(getSupabase()); },
} as unknown as SupabaseClient;

export async function initializeDatabase() {
  return true;
}
