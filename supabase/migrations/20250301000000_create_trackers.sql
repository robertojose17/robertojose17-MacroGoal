CREATE TABLE IF NOT EXISTS trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  tracker_type TEXT NOT NULL DEFAULT 'numeric',
  unit TEXT,
  goal_value NUMERIC,
  frequency TEXT NOT NULL DEFAULT 'daily',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trackers" ON trackers
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS tracker_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tracker_id, date)
);

ALTER TABLE tracker_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tracker entries" ON tracker_entries
  FOR ALL USING (auth.uid() = user_id);
