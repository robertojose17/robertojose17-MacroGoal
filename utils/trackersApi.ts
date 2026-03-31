
import { supabase } from '@/lib/supabase/client';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const BASE_URL = `${SUPABASE_URL}/functions/v1/trackers`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZ3B0ZmlvZm9hZWd1c2xndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI4NjcsImV4cCI6MjA3OTExODg2N30.iC4P3lp4fJHLsYNWBwHwFwGP-WZuJONETOYd2q1lQWA';

export interface Tracker {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  tracker_type: 'binary' | 'count' | 'numeric' | 'duration';
  unit: string | null;
  goal_value: number | null;
  frequency: 'daily' | 'weekly';
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface TrackerEntry {
  id: string;
  tracker_id: string;
  user_id: string;
  date: string;
  value: number;
  notes: string | null;
  created_at: string;
}

export interface TrackerStats {
  current_streak: number;
  best_streak: number;
  completion_rate: number;
  days_tracked: number;
  days_goal_met: number;
  this_week_count: number;
  last_week_count: number;
  total_entries: number;
  avg_value: number | null;
  status: 'on_track' | 'improving' | 'behind' | 'no_data' | 'off_track';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token ?? ''}`,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    console.error('[TrackersApi] HTTP error', response.status, response.url, text);
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

export async function listTrackers(): Promise<Tracker[]> {
  console.log('[TrackersApi] listTrackers() →', BASE_URL);
  const headers = await getAuthHeaders();
  const response = await fetch(BASE_URL, { headers });
  console.log('[TrackersApi] listTrackers status:', response.status);
  const data = await handleResponse<Tracker[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function createTracker(data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] createTracker()', data);
  const headers = await getAuthHeaders();
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const result = await handleResponse<Tracker>(response);
  return result;
}

export async function updateTracker(id: string, data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] updateTracker()', id, data);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  const result = await handleResponse<Tracker>(response);
  return result;
}

export async function deleteTracker(id: string): Promise<void> {
  console.log('[TrackersApi] deleteTracker()', id);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('[TrackersApi] deleteTracker error', response.status, text);
    throw new Error(`Delete failed (${response.status}): ${text}`);
  }
}

export async function listEntries(trackerId: string, limit = 90): Promise<TrackerEntry[]> {
  const url = `${BASE_URL}/${trackerId}/entries?limit=${limit}`;
  console.log('[TrackersApi] listEntries() →', url);
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });
  console.log('[TrackersApi] listEntries status:', response.status);
  const data = await handleResponse<TrackerEntry[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function logEntry(
  trackerId: string,
  date: string,
  value: number,
  notes?: string,
): Promise<TrackerEntry> {
  console.log('[TrackersApi] logEntry()', trackerId, date, value);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${trackerId}/entries`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ date, value, notes: notes ?? null }),
  });
  const result = await handleResponse<TrackerEntry>(response);
  return result;
}

export async function updateEntry(
  trackerId: string,
  entryId: string,
  data: Partial<TrackerEntry>,
): Promise<TrackerEntry> {
  console.log('[TrackersApi] updateEntry()', trackerId, entryId, data);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${trackerId}/entries/${entryId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  const result = await handleResponse<TrackerEntry>(response);
  return result;
}

export async function deleteEntry(trackerId: string, entryId: string): Promise<void> {
  console.log('[TrackersApi] deleteEntry()', trackerId, entryId);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${trackerId}/entries/${entryId}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('[TrackersApi] deleteEntry error', response.status, text);
    throw new Error(`Delete entry failed (${response.status}): ${text}`);
  }
}

export async function getStats(trackerId: string): Promise<TrackerStats> {
  console.log('[TrackersApi] getStats()', trackerId);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${trackerId}/stats`, { headers });
  const data = await handleResponse<{ stats: TrackerStats } | TrackerStats>(response);
  return ('stats' in data ? data.stats : data) as TrackerStats;
}
