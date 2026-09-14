import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Disc3, Plus, Music, Trash2, ChevronUp, ChevronDown,
  Calendar, User, Tag, Hash, FileText,
} from 'lucide-react';
import { supabase, type Album, type Note, type NoteStatus } from '@/lib/supabase';
import { uploadCoverArt, deleteStorageObject } from '@/lib/storage';
import type { StudioTheme } from '@/lib/themes';

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; dot: string }> = {
  concept: { label: 'Concept', color: '#fbbf24', dot: '#fbbf24' },
  in_progress: { label: 'In Progress', color: '#60a5fa', dot: '#60a5fa' },
  needs_recording: { label: 'Needs Recording', color: '#a78bfa', dot: '#a78bfa' },
  complete: { label: 'Complete', color: '#34d399', dot: '#34d399' },
};

interface AlbumViewProps {
  album: Album;
  theme: StudioTheme;
  onBack: () => void;
  onOpenNote: (note: Note) => void;
}

export function AlbumView({ album, theme, onBack, onOpenNote }: AlbumViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [coverUrl, setCoverUrl] = useState(album.cover_art_url);
  const [title, setTitle] = useState(album.title);
  const [primaryArtist, setPrimaryArtist] = useState(album.primary_artist ?? '');
  const [releaseDate, setReleaseDate] = useState(album.release_date ?? '');
  const [genre, setGenre] = useState(album.genre ?? '');
  const [description, setDescription] = useState(album.description ?? '');
  const [editingMeta, setEditingMeta] = useState(false);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('album_id', album.id)
      .order('track_number', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });
    if (error) console.error('Failed to load album notes:', error);
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  }, [album.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveAlbum = useCallback(async () => {
    const { error } = await supabase.from('albums').update({
      title, primary_artist: primaryArtist || null, release_date: releaseDate || null,
      genre: genre || null, description: description || null, cover_art_url: coverUrl,
    }).eq('id', album.id);
    if (error) console.error('Failed to save album:', error);
  }, [album.id, title, primaryArtist, releaseDate, genre, description, coverUrl]);

  useEffect(() => {
    const timer = setTimeout(() => saveAlbum(), 1200);
    return () => clearTimeout(timer);
  }, [title, primaryArtist, releaseDate, genre, description, coverUrl, saveAlbum]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (coverUrl) await deleteStorageObject('cover-art', coverUrl);
      const url = await uploadCoverArt(file);
      setCoverUrl(url);
    } catch (err) {
      console.error('Cover upload failed:', err);
    }
  };

  const handleAddTrack = async () => {
    const nextTrack = notes.length > 0 ? Math.max(...notes.map((n) => n.track_number ?? 0)) + 1 : 1;
    const { data, error } = await supabase
      .from('notes')
      .insert({
        album_id: album.id,
        title: `Track ${String(nextTrack).padStart(2, '0')}`,
        track_number: nextTrack,
      })
      .select()
      .maybeSingle();
    if (error) { console.error('Failed to add track:', error); return; }
    if (data) setNotes((prev) => [...prev, data as Note]);
  };

  const handleMoveTrack = async (note: Note, dir: -1 | 1) => {
    const sorted = [...notes].sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0));
    const idx = sorted.findIndex((n) => n.id === note.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapNote = sorted[swapIdx];
    const noteTrack = note.track_number ?? idx + 1;
    const swapTrack = swapNote.track_number ?? swapIdx + 1;
    await Promise.all([
      supabase.from('notes').update({ track_number: swapTrack }).eq('id', note.id),
      supabase.from('notes').update({ track_number: noteTrack }).eq('id', swapNote.id),
    ]);
    loadData();
  };

  const handleDeleteTrack = async (note: Note) => {
    if (!confirm(`Remove "${note.title}" from this album?`)) return;
    await supabase.from('notes').update({ album_id: null, track_number: null }).eq('id', note.id);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  return (
    <div className="flex flex-col h-full" style={{ background: theme.bg, color: theme.text }}>
      {/* Top Bar */}
      <header className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={onBack} className="p-2 -ml-1 rounded-xl transition-colors active:scale-90" style={{ color: theme.textMuted }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-base font-bold bg-transparent focus:outline-none truncate"
            style={{ color: theme.text }}
          />
          <p className="text-[10px] mt-0.5" style={{ color: theme.textFaint }}>{notes.length} tracks</p>
        </div>
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="p-2 rounded-xl transition-colors active:scale-90"
          style={{ color: theme.textMuted, background: showMetadata ? theme.accentSoft : 'transparent' }}
        >
          <Tag className="w-5 h-5" />
        </button>
      </header>

      {/* Cover Art Banner */}
      <div className="relative h-40 flex-shrink-0 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.bgElevated})` }}>
            <Disc3 className="w-12 h-12" style={{ color: theme.textFaint }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <label className="absolute bottom-3 right-3 cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md bg-black/40 text-white border border-white/10">
            <Plus className="w-3.5 h-3.5" /> Cover Art
          </span>
        </label>
      </div>

      {/* Metadata Panel */}
      {showMetadata && (
        <div className="px-4 py-3 space-y-3 animate-fade-in" style={{ borderBottom: `1px solid ${theme.border}`, background: theme.bgElevated }}>
          {editingMeta ? (
            <>
              <MetaField icon={<User className="w-3.5 h-3.5" />} label="Primary Artist" value={primaryArtist} onChange={setPrimaryArtist} theme={theme} />
              <MetaField icon={<Calendar className="w-3.5 h-3.5" />} label="Release Date" value={releaseDate} onChange={setReleaseDate} type="date" theme={theme} />
              <MetaField icon={<Tag className="w-3.5 h-3.5" />} label="Genre" value={genre} onChange={setGenre} theme={theme} />
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: theme.textFaint }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                  style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
              <button onClick={() => setEditingMeta(false)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: theme.accent, color: theme.isDark ? '#000' : '#fff' }}>
                Done
              </button>
            </>
          ) : (
            <div className="space-y-1.5 text-xs" style={{ color: theme.textMuted }}>
              {primaryArtist && <p><span style={{ color: theme.textFaint }}>Artist:</span> {primaryArtist}</p>}
              {releaseDate && <p><span style={{ color: theme.textFaint }}>Release:</span> {releaseDate}</p>}
              {genre && <p><span style={{ color: theme.textFaint }}>Genre:</span> {genre}</p>}
              {description && <p style={{ color: theme.textFaint }}>{description}</p>}
              <button onClick={() => setEditingMeta(true)} className="text-xs font-medium mt-1" style={{ color: theme.accentText }}>Edit metadata</button>
            </div>
          )}
        </div>
      )}

      {/* Tracklist */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 mb-3" style={{ color: theme.textFaint }} />
            <p className="text-sm font-medium" style={{ color: theme.textMuted }}>No tracks yet</p>
            <p className="text-xs mt-1" style={{ color: theme.textFaint }}>Add your first track below</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note, idx) => {
              const status = STATUS_CONFIG[note.status];
              return (
                <div
                  key={note.id}
                  className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer"
                  style={{ background: theme.bgCard, borderColor: theme.border }}
                  onClick={() => onOpenNote(note)}
                >
                  <span className="text-xs font-mono font-bold w-6 text-center flex-shrink-0" style={{ color: theme.textFaint }}>
                    {String(note.track_number ?? idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
                      <span className="text-[10px]" style={{ color: theme.textFaint }}>{status.label}</span>
                      {note.audio_url && <Music className="w-2.5 h-2.5" style={{ color: theme.textFaint }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleMoveTrack(note, -1)} className="p-1 rounded-lg transition-colors" style={{ color: theme.textFaint }}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleMoveTrack(note, 1)} className="p-1 rounded-lg transition-colors" style={{ color: theme.textFaint }}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTrack(note)} className="p-1 rounded-lg transition-colors" style={{ color: theme.textFaint }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Track Button */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={handleAddTrack}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]"
          style={{ background: theme.accent, color: theme.isDark ? '#000' : '#fff' }}
        >
          <Plus className="w-4 h-4" /> Add Track
        </button>
      </div>
    </div>
  );
}

function MetaField({ icon, label, value, onChange, type, theme }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  theme: StudioTheme;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: theme.textFaint }}>
        {icon} {label}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
        style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.text }}
      />
    </div>
  );
}
