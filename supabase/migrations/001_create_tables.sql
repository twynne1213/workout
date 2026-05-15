-- Fitness PWA - Supabase tables for cross-device sync
-- No RLS (personal use, single user)

-- ─── Exercises ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_groups JSONB NOT NULL DEFAULT '[]',
  category TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Routines ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  last_performed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Workout Logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  routine_id TEXT,
  name TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  completed_at BIGINT,
  exercises JSONB NOT NULL DEFAULT '[]',
  total_volume NUMERIC NOT NULL DEFAULT 0,
  duration NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Cardio Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  distance_meters NUMERIC,
  duration_seconds NUMERIC NOT NULL,
  avg_pace_seconds_per_km NUMERIC,
  avg_speed_kmh NUMERIC,
  avg_heart_rate NUMERIC,
  max_heart_rate NUMERIC,
  calories_estimate NUMERIC,
  elevation_gain_meters NUMERIC,
  notes TEXT,
  started_at BIGINT NOT NULL,
  completed_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Stretches ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stretches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_areas JSONB NOT NULL DEFAULT '[]',
  default_duration_seconds INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Mobility Sequences ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobility_sequences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timing TEXT NOT NULL,
  stretches JSONB NOT NULL DEFAULT '[]',
  linked_routine_id TEXT,
  total_duration NUMERIC NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Mobility Logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobility_logs (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL,
  timing TEXT NOT NULL,
  completed_stretches JSONB NOT NULL DEFAULT '[]',
  duration NUMERIC NOT NULL DEFAULT 0,
  completed_at BIGINT NOT NULL,
  linked_workout_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Training Plans (legacy) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal JSONB NOT NULL DEFAULT '{}',
  start_date BIGINT NOT NULL,
  end_date BIGINT NOT NULL,
  weeks JSONB NOT NULL DEFAULT '[]',
  generated_by TEXT NOT NULL DEFAULT 'claude',
  raw_response TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Coach Threads ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  week_commit_id TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ─── User Profile ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  weight_unit TEXT NOT NULL DEFAULT 'lbs',
  distance_unit TEXT NOT NULL DEFAULT 'mi',
  bodyweight_kg NUMERIC,
  height_cm NUMERIC,
  date_of_birth TEXT,
  fitness_level TEXT NOT NULL DEFAULT 'intermediate',
  goals JSONB NOT NULL DEFAULT '[]',
  dark_mode BOOLEAN NOT NULL DEFAULT true,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ─── Goals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date BIGINT,
  target_metrics JSONB,
  current_metrics JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Week Commits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS week_commits (
  id TEXT PRIMARY KEY,
  week_start_date BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  goal_ids JSONB NOT NULL DEFAULT '[]',
  coach_notes TEXT NOT NULL DEFAULT '',
  conversation_snapshot JSONB NOT NULL DEFAULT '[]',
  adjustment_log JSONB NOT NULL DEFAULT '[]',
  completion_rate NUMERIC,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Staged Workouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staged_workouts (
  id TEXT PRIMARY KEY,
  week_commit_id TEXT NOT NULL,
  date BIGINT NOT NULL,
  day_of_week INTEGER NOT NULL,
  order_in_day INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER,
  routine_id TEXT,
  planned_exercises JSONB,
  cardio_target JSONB,
  mobility_sequence_id TEXT,
  completed_workout_log_id TEXT,
  completed_cardio_session_id TEXT,
  completed_mobility_log_id TEXT,
  coach_rationale TEXT,
  linked_goal_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _deleted BOOLEAN DEFAULT false
);

-- ─── Indexes for common queries ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_logs_started_at ON workout_logs (started_at);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_started_at ON cardio_sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_staged_workouts_week ON staged_workouts (week_commit_id);
CREATE INDEX IF NOT EXISTS idx_staged_workouts_date ON staged_workouts (date);
CREATE INDEX IF NOT EXISTS idx_week_commits_week_start ON week_commits (week_start_date);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals (status);

-- Disable RLS on all tables (personal app, single user)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON exercises FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON routines FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON workout_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON cardio_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stretches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON stretches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mobility_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON mobility_sequences FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mobility_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON mobility_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON training_plans FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE coach_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON coach_threads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON user_profile FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON goals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE week_commits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON week_commits FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE staged_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON staged_workouts FOR ALL USING (true) WITH CHECK (true);
