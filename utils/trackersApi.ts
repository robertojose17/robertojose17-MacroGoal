
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
  avg_value: number;
  status: 'on_track' | 'improving' | 'behind';
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
    console.error('[TrackersApi] HTTP error', response.status, text);
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

export async function listTrackers(): Promise<Tracker[]> {
  console.log('[TrackersApi] listTrackers()');
  const headers = await getAuthHeaders();
  const response = await fetch(BASE_URL, { headers });
  return handleResponse<Tracker[]>(response);
}

export async function createTracker(data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] createTracker()', data);
  const headers = await getAuthHeaders();
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Tracker>(response);
}

export async function updateTracker(id: string, data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] updateTracker()', id, data);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Tracker>(response);
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
  console.log('[TrackersApi] listEntries()', trackerId, 'limit:', limit);
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/${trackerId}/entries?limit=${limit}`, { headers });
  return handleResponse<TrackerEntry[]>(response);
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
  return handleResponse<TrackerEntry>(response);
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
  return handleResponse<TrackerEntry>(response);
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
  return handleResponse<TrackerStats>(response);
}
