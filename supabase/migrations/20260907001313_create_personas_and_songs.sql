/*
# Create personas and songs tables (single-tenant, no auth)

1. New Tables
- `personas`: AI rap personas used as co-pilot styles.
  - id (uuid PK)
  - name (text, not null)
  - description (text, nullable) - short bio/style summary
  - flow_style (text, nullable) - describes cadence/flow characteristics
  - rhyme_density (text, nullable) - e.g. "High", "Medium", "Complex"
  - is_default (boolean, default false) - true for the 8 built-in personas
  - created_at (timestamptz)
- `songs`: lyric drafts the user is working on.
  - id (uuid PK)
  - title (text, default 'Untitled')
  - bpm (int, default 90)
  - musical_key (text, default 'C Major')
  - lyrics (text, default '')
  - active_persona_id (uuid FK -> personas, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)

2. Seed Data
- Inserts 8 default personas: Eminem, Kendrick Lamar, J. Cole, Lil Wayne,
  Drake, Joyner Lucas, Logic, Chris Webby.

3. Security
- RLS enabled on both tables.
- Single-tenant (no sign-in): anon + authenticated have full CRUD on both
  tables, since all data is intentionally shared/public.
*/

CREATE TABLE IF NOT EXISTS personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  flow_style text,
  rhyme_density text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_personas" ON personas;
CREATE POLICY "anon_select_personas" ON personas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_personas" ON personas;
CREATE POLICY "anon_insert_personas" ON personas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_personas" ON personas;
CREATE POLICY "anon_update_personas" ON personas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_personas" ON personas;
CREATE POLICY "anon_delete_personas" ON personas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  bpm int NOT NULL DEFAULT 90,
  musical_key text NOT NULL DEFAULT 'C Major',
  lyrics text NOT NULL DEFAULT '',
  active_persona_id uuid REFERENCES personas(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_songs" ON songs;
CREATE POLICY "anon_select_songs" ON songs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_songs" ON songs;
CREATE POLICY "anon_insert_songs" ON songs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_songs" ON songs;
CREATE POLICY "anon_update_songs" ON songs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_songs" ON songs;
CREATE POLICY "anon_delete_songs" ON songs FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default personas (idempotent: only insert if not already present)
INSERT INTO personas (name, description, flow_style, rhyme_density, is_default)
SELECT * FROM (VALUES
  ('Eminem', 'Rapid-fire multi-syllabic rhymes with intricate internal rhyme schemes and aggressive delivery.', 'Fast, staccato, unpredictable cadence with sudden bursts', 'Very High', true),
  ('Kendrick Lamar', 'Jazz-influenced polymetric flows with storytelling depth and tonal modulation.', 'Polyrhythmic, conversational to explosive, off-beat pockets', 'High', true),
  ('J. Cole', 'Conscious, laid-back storytelling with steady boom-bap cadence and reflective tone.', 'Smooth, pocketed, mid-tempo with conversational pauses', 'Medium', true),
  ('Lil Wayne', 'Punchline-heavy with metaphor chains, slant rhymes, and playful wordplay.', 'Bouncy, syncopated, ad-lib-driven, off-the-dome feel', 'High', true),
  ('Drake', 'Melodic, sing-song flow blending rap and R&B with emotional vulnerability.', 'Melodic, half-time pockets, conversational, hook-oriented', 'Medium', true),
  ('Joyner Lucas', 'Double-time and triplet flows with cinematic storytelling and technical precision.', 'Double-time, rapid triplet bursts, narrative-driven', 'Very High', true),
  ('Logic', 'Technical, breathless speed rap with tongue-twister bars and pop-culture references.', 'Fast, breathless, double-time with technical precision', 'High', true),
  ('Chris Webby', 'Underground battle-rap style with dense multis and pop-culture-laden punchlines.', 'Battle-tested, relentless, dense bar-after-bar', 'High', true)
) AS v(name, description, flow_style, rhyme_density, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM personas WHERE name = v.name AND is_default = true
);
