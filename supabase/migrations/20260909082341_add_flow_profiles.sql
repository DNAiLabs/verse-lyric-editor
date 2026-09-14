/*
# Add flow_profiles table and active_flow_profile_id column to songs

1. New Tables
- flow_profiles: Custom "Native Flow Profiles" saved from the Analyze My Bars engine.
  - id (uuid PK)
  - name (text, not null) — user-given name for the profile
  - avg_syllables (numeric) — average syllables per bar
  - bar_count (int) — number of bars analyzed
  - min_syllables (int) — minimum syllables in a bar
  - max_syllables (int) — maximum syllables in a bar
  - word_count (int) — total words analyzed
  - created_at (timestamptz)

2. Modified Tables
- songs: Added active_flow_profile_id column (nullable FK to flow_profiles, ON DELETE SET NULL)
- songs: Updated default title from 'Untitled' to 'Untitled Verse'

3. Security
- RLS enabled on flow_profiles.
- Single-tenant (no auth): anon + authenticated have full CRUD.
*/

CREATE TABLE IF NOT EXISTS flow_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avg_syllables numeric NOT NULL DEFAULT 0,
  bar_count int NOT NULL DEFAULT 0,
  min_syllables int NOT NULL DEFAULT 0,
  max_syllables int NOT NULL DEFAULT 0,
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flow_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_flow_profiles" ON flow_profiles;
CREATE POLICY "anon_select_flow_profiles" ON flow_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_flow_profiles" ON flow_profiles;
CREATE POLICY "anon_insert_flow_profiles" ON flow_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_flow_profiles" ON flow_profiles;
CREATE POLICY "anon_update_flow_profiles" ON flow_profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_flow_profiles" ON flow_profiles;
CREATE POLICY "anon_delete_flow_profiles" ON flow_profiles FOR DELETE
  TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'active_flow_profile_id'
  ) THEN
    ALTER TABLE songs ADD COLUMN active_flow_profile_id uuid REFERENCES flow_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE songs ALTER COLUMN title SET DEFAULT 'Untitled Verse';
