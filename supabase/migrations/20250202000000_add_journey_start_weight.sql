
-- Add journey_start_weight column to users table
-- goal_weight already exists; this adds the journey start weight field

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS journey_start_weight NUMERIC(6, 2);

COMMENT ON COLUMN users.journey_start_weight IS 'Weight in kg at the start of the user journey (set during onboarding)';
