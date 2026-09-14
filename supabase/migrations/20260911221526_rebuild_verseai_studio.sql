/*
# Rebuild VerseAI Notes as Pro Studio Notepad

Complete schema rebuild for the full studio application.

## 1. New Tables

- `albums`: Album/EP project folders with cover art, artist metadata, distro info
  - id (uuid PK)
  - title (text, not null)
  - cover_art_url (text, nullable) — storage path to cover image
  - primary_artist (text, nullable)
  - release_date (date, nullable)
  - genre (text, nullable)
  - description (text, nullable)
  - sort_order (int, default 0)
  - created_at (timestamptz)

- `notes`: Individual lyric note sheets
  - id (uuid PK)
  - album_id (uuid FK -> albums, nullable, ON DELETE SET NULL)
  - title (text, default 'Untitled Verse')
  - lyrics (text, default '')
  - status (text, default 'concept') — concept | in_progress | needs_recording | complete
  - track_number (int, nullable) — ordered position within album
  - cover_art_url (text, nullable) — per-note background image
  - audio_url (text, nullable) — storage path to beat/audio file
  - audio_title (text, nullable) — display name for audio file
  - active_persona_id (uuid FK -> personas, nullable, ON DELETE SET NULL)
  - active_flow_profile_id (uuid FK -> flow_profiles, nullable, ON DELETE SET NULL)
  - bpm (int, default 90)
  - musical_key (text, default 'C Major')
  - primary_artist (text, nullable)
  - featured_artists (text, nullable)
  - release_date (date, nullable)
  - genre (text, nullable)
  - isrc_notes (text, nullable)
  - sort_order (int, default 0)
  - created_at (timestamptz)
  - updated_at (timestamptz)

- `note_photos`: In-note photo gallery attachments
  - id (uuid PK)
  - note_id (uuid FK -> notes, ON DELETE CASCADE)
  - photo_url (text, not null) — storage path
  - caption (text, nullable)
  - created_at (timestamptz)

- `chat_messages`: Conversational messages with Lyric AI assistant
  - id (uuid PK)
  - note_id (uuid FK -> notes, ON DELETE CASCADE)
  - role (text, not null) — 'user' | 'assistant'
  - content (text, not null)
  - created_at (timestamptz)

## 2. Modified Tables

- `songs`: Kept for backward compatibility but no longer used by the new app.
  - Added album_id column (uuid FK -> albums, nullable, ON DELETE SET NULL)

## 3. Storage Buckets

- `cover-art`: Public bucket for album/note cover images
- `note-photos`: Public bucket for in-note photo gallery images
- `note-audio`: Public bucket for audio beat attachments

## 4. Security

- RLS enabled on all new tables.
- Single-tenant (no auth): anon + authenticated have full CRUD on all tables.
- Storage buckets are public (read), with insert/update/delete for anon + authenticated.
*/

-- ===== ALBUMS =====
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cover_art_url text,
  primary_artist text,
  release_date date,
  genre text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_albums" ON albums;
CREATE POLICY "anon_select_albums" ON albums FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_albums" ON albums;
CREATE POLICY "anon_insert_albums" ON albums FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_albums" ON albums;
CREATE POLICY "anon_update_albums" ON albums FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_albums" ON albums;
CREATE POLICY "anon_delete_albums" ON albums FOR DELETE
  TO anon, authenticated USING (true);

-- ===== NOTES =====
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid REFERENCES albums(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled Verse',
  lyrics text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'concept',
  track_number int,
  cover_art_url text,
  audio_url text,
  audio_title text,
  active_persona_id uuid REFERENCES personas(id) ON DELETE SET NULL,
  active_flow_profile_id uuid REFERENCES flow_profiles(id) ON DELETE SET NULL,
  bpm int NOT NULL DEFAULT 90,
  musical_key text NOT NULL DEFAULT 'C Major',
  primary_artist text,
  featured_artists text,
  release_date date,
  genre text,
  isrc_notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_notes_album_id ON notes(album_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- ===== NOTE PHOTOS =====
CREATE TABLE IF NOT EXISTS note_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE note_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_note_photos" ON note_photos;
CREATE POLICY "anon_select_note_photos" ON note_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_note_photos" ON note_photos;
CREATE POLICY "anon_insert_note_photos" ON note_photos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_note_photos" ON note_photos;
CREATE POLICY "anon_update_note_photos" ON note_photos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_note_photos" ON note_photos;
CREATE POLICY "anon_delete_note_photos" ON note_photos FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_note_photos_note_id ON note_photos(note_id);

-- ===== CHAT MESSAGES =====
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_note_id ON chat_messages(note_id);

-- ===== Add album_id to songs (backward compat) =====
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'album_id'
  ) THEN
    ALTER TABLE songs ADD COLUMN album_id uuid REFERENCES albums(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-art', 'cover-art', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('note-photos', 'note-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('note-audio', 'note-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cover-art
DROP POLICY IF EXISTS "anon_read_cover_art" ON storage.objects;
CREATE POLICY "anon_read_cover_art" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'cover-art');

DROP POLICY IF EXISTS "anon_insert_cover_art" ON storage.objects;
CREATE POLICY "anon_insert_cover_art" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'cover-art');

DROP POLICY IF EXISTS "anon_update_cover_art" ON storage.objects;
CREATE POLICY "anon_update_cover_art" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'cover-art') WITH CHECK (bucket_id = 'cover-art');

DROP POLICY IF EXISTS "anon_delete_cover_art" ON storage.objects;
CREATE POLICY "anon_delete_cover_art" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'cover-art');

-- Storage policies for note-photos
DROP POLICY IF EXISTS "anon_read_note_photos" ON storage.objects;
CREATE POLICY "anon_read_note_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'note-photos');

DROP POLICY IF EXISTS "anon_insert_note_photos" ON storage.objects;
CREATE POLICY "anon_insert_note_photos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'note-photos');

DROP POLICY IF EXISTS "anon_update_note_photos" ON storage.objects;
CREATE POLICY "anon_update_note_photos" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'note-photos') WITH CHECK (bucket_id = 'note-photos');

DROP POLICY IF EXISTS "anon_delete_note_photos" ON storage.objects;
CREATE POLICY "anon_delete_note_photos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'note-photos');

-- Storage policies for note-audio
DROP POLICY IF EXISTS "anon_read_note_audio" ON storage.objects;
CREATE POLICY "anon_read_note_audio" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'note-audio');

DROP POLICY IF EXISTS "anon_insert_note_audio" ON storage.objects;
CREATE POLICY "anon_insert_note_audio" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'note-audio');

DROP POLICY IF EXISTS "anon_update_note_audio" ON storage.objects;
CREATE POLICY "anon_update_note_audio" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'note-audio') WITH CHECK (bucket_id = 'note-audio');

DROP POLICY IF EXISTS "anon_delete_note_audio" ON storage.objects;
CREATE POLICY "anon_delete_note_audio" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'note-audio');
