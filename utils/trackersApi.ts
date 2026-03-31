import { supabase } from '@/lib/supabase/client';

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

async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
}

export async function listTrackers(): Promise<Tracker[]> {
  console.log('[TrackersApi] listTrackers()');
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[TrackersApi] listTrackers error:', error.message);
    throw new Error(error.message);
  }

  const trackers = data ?? [];

  // Seed default trackers if none exist
  if (trackers.length === 0) {
    console.log('[TrackersApi] No trackers found, seeding defaults');
    const defaults = [
      { user_id: userId, name: 'weight', emoji: '⚖️', tracker_type: 'numeric', unit: 'kg', goal_value: null, frequency: 'daily', is_default: true, sort_order: 0 },
      { user_id: userId, name: 'steps',  emoji: '👟', tracker_type: 'numeric', unit: 'steps', goal_value: 10000, frequency: 'daily', is_default: true, sort_order: 1 },
      { user_id: userId, name: 'gym',    emoji: '🏋️', tracker_type: 'binary',  unit: null, goal_value: null, frequency: 'daily', is_default: true, sort_order: 2 },
    ];
    const { data: created, error: createError } = await supabase
      .from('trackers')
      .insert(defaults)
      .select();
    if (createError) {
      console.error('[TrackersApi] Seed error:', createError.message);
      throw new Error(createError.message);
    }
    console.log('[TrackersApi] Seeded', created?.length, 'default trackers');
    return created ?? [];
  }

  console.log('[TrackersApi] Loaded', trackers.length, 'trackers');
  return trackers;
}

export async function createTracker(data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] createTracker()', data);
  const userId = await getCurrentUserId();

  const { data: result, error } = await supabase
    .from('trackers')
    .insert({ ...data, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('[TrackersApi] createTracker error:', error.message);
    throw new Error(error.message);
  }
  console.log('[TrackersApi] Created tracker:', result.id);
  return result;
}

export async function updateTracker(id: string, data: Partial<Tracker>): Promise<Tracker> {
  console.log('[TrackersApi] updateTracker()', id);
  const userId = await getCurrentUserId();

  const { data: result, error } = await supabase
    .from('trackers')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[TrackersApi] updateTracker error:', error.message);
    throw new Error(error.message);
  }
  return result;
}

export async function deleteTracker(id: string): Promise<void> {
  console.log('[TrackersApi] deleteTracker()', id);
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('trackers')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[TrackersApi] deleteTracker error:', error.message);
    throw new Error(error.message);
  }
}

export async function listEntries(trackerId: string, limit = 90): Promise<TrackerEntry[]> {
  console.log('[TrackersApi] listEntries()', trackerId);
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[TrackersApi] listEntries error:', error.message);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function logEntry(
  trackerId: string,
  date: string,
  value: number,
  notes?: string,
): Promise<TrackerEntry> {
  console.log('[TrackersApi] logEntry()', trackerId, date, value);
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('tracker_entries')
    .upsert(
      { tracker_id: trackerId, user_id: userId, date, value, notes: notes ?? null },
      { onConflict: 'tracker_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('[TrackersApi] logEntry error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function updateEntry(
  trackerId: string,
  entryId: string,
  data: Partial<TrackerEntry>,
): Promise<TrackerEntry> {
  console.log('[TrackersApi] updateEntry()', entryId);
  const userId = await getCurrentUserId();

  const { data: result, error } = await supabase
    .from('tracker_entries')
    .update({ value: data.value, notes: data.notes })
    .eq('id', entryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[TrackersApi] updateEntry error:', error.message);
    throw new Error(error.message);
  }
  return result;
}

export async function deleteEntry(trackerId: string, entryId: string): Promise<void> {
  console.log('[TrackersApi] deleteEntry()', entryId);
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('tracker_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) {
    console.error('[TrackersApi] deleteEntry error:', error.message);
    throw new Error(error.message);
  }
}

export async function getStats(trackerId: string): Promise<TrackerStats> {
  console.log('[TrackersApi] getStats()', trackerId);
  const userId = await getCurrentUserId();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [entriesResult, trackerResult] = await Promise.all([
    supabase
      .from('tracker_entries')
      .select('date, value')
      .eq('tracker_id', trackerId)
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false }),
    supabase
      .from('trackers')
      .select('goal_value')
      .eq('id', trackerId)
      .eq('user_id', userId)
      .single(),
  ]);

  if (entriesResult.error) {
    console.error('[TrackersApi] getStats entries error:', entriesResult.error.message);
    throw new Error(entriesResult.error.message);
  }

  const entries = entriesResult.data ?? [];
  const tracker = trackerResult.data;

  const entryDates = new Set(entries.map((e: { date: string }) => e.date));
  const daysTracked = entryDates.size;

  // Calculate streak
  let streak = 0;
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let checkDate: Date | null = entryDates.has(today)
    ? new Date(now)
    : entryDates.has(yesterdayStr)
    ? new Date(yesterday)
    : null;

  if (checkDate) {
    let keepGoing = true;
    while (keepGoing) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (entryDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        keepGoing = false;
      }
    }
  }

  // Days goal met
  let daysGoalMet = 0;
  if (tracker?.goal_value != null) {
    daysGoalMet = entries.filter((e: { value: number }) => e.value >= tracker.goal_value).length;
  }

  // This week / last week
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  thisMonday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  const thisMondayStr = thisMonday.toISOString().split('T')[0];
  const lastMondayStr = lastMonday.toISOString().split('T')[0];
  const lastSundayStr = lastSunday.toISOString().split('T')[0];

  const thisWeekCount = entries.filter((e: { date: string }) => e.date >= thisMondayStr).length;
  const lastWeekCount = entries.filter((e: { date: string }) => e.date >= lastMondayStr && e.date <= lastSundayStr).length;

  const avgValue = daysTracked > 0
    ? entries.reduce((sum: number, e: { value: number }) => sum + Number(e.value), 0) / daysTracked
    : null;

  let status: TrackerStats['status'] = 'no_data';
  if (daysTracked > 0) {
    status = streak > 0 || thisWeekCount > 0 ? 'on_track' : 'off_track';
  }

  return {
    current_streak: streak,
    best_streak: streak,
    completion_rate: daysTracked / 30,
    days_tracked: daysTracked,
    days_goal_met: daysGoalMet,
    this_week_count: thisWeekCount,
    last_week_count: lastWeekCount,
    total_entries: daysTracked,
    avg_value: avgValue,
    status,
  };
}
