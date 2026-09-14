import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Music, FileText, Mic, Sparkles, Clock, MoreVertical, Trash2,
  Disc3, ChevronRight, Layers,
} from 'lucide-react';
import { supabase, type Note, type Album, type NoteStatus } from '@/lib/supabase';
import type { StudioTheme } from '@/lib/themes';

interface HomeViewProps {
  theme: StudioTheme;
  onOpenNote: (note: Note) => void;
  onOpenAlbum: (album: Album) => void;
  onNewNote: () => void;
  onNewAlbum: () => void;
}

type FilterTab = 'all' | 'albums' | 'needs_recording' | 'in_progress' | 'complete';

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; dot: string }> = {
  concept: { label: 'Concept', color: '#fbbf24', dot: '#fbbf24' },
  in_progress: { label: 'In Progress', color: '#60a5fa', dot: '#60a5fa' },
  needs_recording: { label: 'Needs Recording', color: '#a78bfa', dot: '#a78bfa' },
  complete: { label: 'Complete', color: '#34d399', dot: '#34d399' },
};

export function HomeView({ theme, onOpenNote, onOpenAlbum, onNewNote, onNewAlbum }: HomeViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const [menuNote, setMenuNote] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [notesRes, albumsRes] = await Promise.all([
      supabase.from('notes').select('*').order('updated_at', { ascending: false }),
      supabase.from('albums').select('*').order('created_at', { ascending: false }),
    ]);
    if (notesRes.error) console.error('Failed to load notes:', notesRes.error);
    if (albumsRes.error) console.error('Failed to load albums:', albumsRes.error);
    setNotes((notesRes.data ?? []) as Note[]);
    setAlbums((albumsRes.data ?? []) as Album[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note permanently?')) return;
    setMenuNote(null);
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { console.error('Delete failed:', error); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotes = notes.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'albums') return false;
    return n.status === filter;
  });

  const showAlbums = filter === 'all' || filter === 'albums';

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'albums', label: 'Albums' },
    { id: 'needs_recording', label: 'Recording' },
    { id: 'in_progress', label: 'Writing' },
    { id: 'complete', label: 'Complete' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VerseAI Notes</h1>
          <p className="text-xs mt-0.5" style={{ color: theme.textFaint }}>The Lyricist's Pro Studio Notepad</p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: theme.accentSoft, border: `1px solid ${theme.border}` }}>
          <Mic className="w-5 h-5" style={{ color: theme.accentText }} />
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-5 pb-3 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={filter === tab.id
              ? { background: theme.accent, color: theme.isDark ? '#000' : '#fff' }
              : { background: theme.bgElevated, color: theme.textMuted, border: `1px solid ${theme.border}` }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} />
          </div>
        ) : filteredNotes.length === 0 && !showAlbums ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-10 h-10 mb-3" style={{ color: theme.textFaint }} />
            <p className="text-sm font-medium" style={{ color: theme.textMuted }}>No notes here yet</p>
            <p className="text-xs mt-1" style={{ color: theme.textFaint }}>Tap + to start writing</p>
          </div>
        ) : (
          <>
            {/* Album Folders */}
            {showAlbums && albums.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textFaint }}>
                  Albums & Projects
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {albums.map((album) => {
                    const albumNotes = notes.filter((n) => n.album_id === album.id);
                    return (
                      <button
                        key={album.id}
                        onClick={() => onOpenAlbum(album)}
                        className="text-left rounded-2xl overflow-hidden border transition-all active:scale-[0.97]"
                        style={{ background: theme.bgCard, borderColor: theme.border }}
                      >
                        <div className="aspect-square relative overflow-hidden">
                          {album.cover_art_url ? (
                            <img src={album.cover_art_url} alt={album.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: theme.bgElevated }}>
                              <Disc3 className="w-10 h-10" style={{ color: theme.textFaint }} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2.5">
                            <p className="text-sm font-bold text-white truncate">{album.title}</p>
                            <p className="text-[10px] text-white/60">{albumNotes.length} tracks</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {filteredNotes.length > 0 && (
              <div>
                {showAlbums && <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textFaint }}>Notes</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {filteredNotes.map((note) => {
                    const status = STATUS_CONFIG[note.status];
                    const preview = note.lyrics.split('\n').filter((l) => l.trim()).slice(0, 4).join('\n');
                    return (
                      <div
                        key={note.id}
                        className="relative rounded-2xl border overflow-hidden cursor-pointer transition-all active:scale-[0.97]"
                        style={{ background: theme.bgCard, borderColor: theme.border }}
                        onClick={() => onOpenNote(note)}
                      >
                        {/* Cover art or gradient header */}
                        <div className="h-20 relative overflow-hidden">
                          {note.cover_art_url ? (
                            <img src={note.cover_art_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.bgElevated})` }} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: status.dot }} />
                          </div>
                          {note.audio_url && (
                            <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm">
                              <Music className="w-3 h-3 text-white/80" />
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="p-3">
                          <p className="text-sm font-bold truncate mb-1">{note.title}</p>
                          {preview ? (
                            <p className="text-[11px] leading-relaxed line-clamp-3 font-mono whitespace-pre-line" style={{ color: theme.textFaint }}>
                              {preview}
                            </p>
                          ) : (
                            <p className="text-[11px] italic" style={{ color: theme.textFaint }}>Empty sheet...</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${status.color}20`, color: status.color }}>
                              {status.label}
                            </span>
                            {note.bpm !== 90 && (
                              <span className="text-[10px]" style={{ color: theme.textFaint }}>{note.bpm} BPM</span>
                            )}
                          </div>
                        </div>
                        {/* Menu */}
                        {menuNote === note.id && (
                          <div className="absolute top-10 right-2 z-20 rounded-xl overflow-hidden border shadow-2xl animate-fade-in" style={{ background: theme.bgElevated, borderColor: theme.border }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                              className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 w-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            <button
              onClick={() => { setFabOpen(false); onNewAlbum(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg animate-slide-up border"
              style={{ background: theme.bgElevated, color: theme.text, borderColor: theme.border }}
            >
              <Disc3 className="w-4 h-4" style={{ color: theme.accentText }} />
              New Album
            </button>
            <button
              onClick={() => { setFabOpen(false); onNewNote(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg animate-slide-up border"
              style={{ background: theme.bgElevated, color: theme.text, borderColor: theme.border }}
            >
              <FileText className="w-4 h-4" style={{ color: theme.accentText }} />
              New Note
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform active:scale-90"
          style={{ background: theme.accent, color: theme.isDark ? '#000' : '#fff' }}
        >
          <Plus className={`w-6 h-6 transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </div>
  );
}
