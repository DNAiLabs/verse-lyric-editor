import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Persona {
  id: string;
  name: string;
  description: string | null;
  flow_style: string | null;
  rhyme_density: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FlowProfile {
  id: string;
  name: string;
  avg_syllables: number;
  bar_count: number;
  min_syllables: number;
  max_syllables: number;
  word_count: number;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  cover_art_url: string | null;
  primary_artist: string | null;
  release_date: string | null;
  genre: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export type NoteStatus = 'concept' | 'in_progress' | 'needs_recording' | 'complete';

export interface Note {
  id: string;
  album_id: string | null;
  title: string;
  lyrics: string;
  status: NoteStatus;
  track_number: number | null;
  cover_art_url: string | null;
  audio_url: string | null;
  audio_title: string | null;
  active_persona_id: string | null;
  active_flow_profile_id: string | null;
  bpm: number;
  musical_key: string;
  primary_artist: string | null;
  featured_artists: string | null;
  release_date: string | null;
  genre: string | null;
  isrc_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NotePhoto {
  id: string;
  note_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  note_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type ActiveMode =
  | { type: 'raw' }
  | { type: 'persona'; persona: Persona }
  | { type: 'flow'; profile: FlowProfile };
