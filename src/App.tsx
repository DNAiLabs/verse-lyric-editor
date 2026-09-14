import { useState, useEffect, useCallback } from 'react';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { supabase, type Note, type Album, type Persona, type FlowProfile } from '@/lib/supabase';
import { THEMES, resolveTheme, THEME_ORDER, type AppearanceMode, type StudioTheme } from '@/lib/themes';
import { HomeView } from '@/components/HomeView';
import { NoteEditor } from '@/components/NoteEditor';
import { AlbumView } from '@/components/AlbumView';

type View =
  | { type: 'home' }
  | { type: 'note'; note: Note }
  | { type: 'album'; album: Album };

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' });
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [flowProfiles, setFlowProfiles] = useState<FlowProfile[]>([]);
  const [appearance, setAppearance] = useState<AppearanceMode>('dark');
  const [themeId, setThemeId] = useState('onyx-booth');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = resolveTheme(appearance, themeId);

  useEffect(() => {
    (async () => {
      const [personaRes, profileRes] = await Promise.all([
        supabase.from('personas').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: true }),
        supabase.from('flow_profiles').select('*').order('created_at', { ascending: false }),
      ]);
      if (personaRes.data) setPersonas(personaRes.data as Persona[]);
      if (profileRes.data) setFlowProfiles(profileRes.data as FlowProfile[]);
      setLoading(false);
    })();
  }, []);

  const refreshPersonas = useCallback(async () => {
    const { data } = await supabase.from('personas').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: true });
    if (data) setPersonas(data as Persona[]);
  }, []);

  const handleNewNote = async () => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ title: 'Untitled Verse' })
      .select()
      .maybeSingle();
    if (error) { console.error('Failed to create note:', error); return; }
    if (data) setView({ type: 'note', note: data as Note });
  };

  const handleNewAlbum = async () => {
    const { data, error } = await supabase
      .from('albums')
      .insert({ title: 'New Album' })
      .select()
      .maybeSingle();
    if (error) { console.error('Failed to create album:', error); return; }
    if (data) setView({ type: 'album', album: data as Album });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <div className="flex items-center gap-3" style={{ color: theme.textFaint }}>
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }} />
          <span className="text-sm">Loading VerseAI Notes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
      {/* Settings button - only on home */}
      {view.type === 'home' && (
        <button
          onClick={() => setShowSettings(true)}
          className="fixed top-5 right-5 z-30 p-2.5 rounded-xl transition-colors active:scale-90"
          style={{ background: theme.accentSoft, border: `1px solid ${theme.border}`, color: theme.accentText }}
        >
          <Palette className="w-5 h-5" />
        </button>
      )}

      {/* Main content */}
      {view.type === 'home' && (
        <HomeView
          theme={theme}
          onOpenNote={(note) => setView({ type: 'note', note })}
          onOpenAlbum={(album) => setView({ type: 'album', album })}
          onNewNote={handleNewNote}
          onNewAlbum={handleNewAlbum}
        />
      )}

      {view.type === 'note' && (
        <NoteEditor
          key={view.note.id}
          note={view.note}
          personas={personas}
          flowProfiles={flowProfiles}
          theme={theme}
          onBack={() => setView({ type: 'home' })}
          onPersonasChange={refreshPersonas}
        />
      )}

      {view.type === 'album' && (
        <AlbumView
          key={view.album.id}
          album={view.album}
          theme={theme}
          onBack={() => setView({ type: 'home' })}
          onOpenNote={(note) => setView({ type: 'note', note })}
        />
      )}

      {/* Theme Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowSettings(false)}>
          <div
            className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden border shadow-2xl animate-slide-up"
            style={{ background: theme.bgElevated, borderColor: theme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: theme.accentSoft }}>
                  <Palette className="w-4 h-4" style={{ color: theme.accentText }} />
                </div>
                <h2 className="text-base font-bold">Studio Appearance</h2>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Appearance Mode */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: theme.textFaint }}>System Mode</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
                    { id: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
                    { id: 'auto', icon: <Monitor className="w-4 h-4" />, label: 'Auto' },
                  ] as const).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setAppearance(mode.id)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors"
                      style={appearance === mode.id
                        ? { background: theme.accentSoft, borderColor: `${theme.accent}40`, color: theme.accentText }
                        : { background: theme.bgCard, borderColor: theme.border, color: theme.textMuted }
                      }
                    >
                      {mode.icon}
                      <span className="text-xs font-medium">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Studio Palettes */}
              {appearance !== 'light' && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: theme.textFaint }}>Studio Palette</h3>
                  <div className="space-y-2">
                    {THEME_ORDER.map((id) => {
                      const t: StudioTheme = THEMES[id];
                      return (
                        <button
                          key={id}
                          onClick={() => setThemeId(id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border transition-colors"
                          style={themeId === id
                            ? { background: theme.bgCard, borderColor: t.accent }
                            : { background: theme.bgCard, borderColor: theme.border }
                          }
                        >
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full" style={{ background: t.bg }} />
                            <div className="w-5 h-5 rounded-full" style={{ background: t.bgElevated }} />
                            <div className="w-5 h-5 rounded-full" style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}80` }} />
                          </div>
                          <span className="flex-1 text-left text-sm font-medium">{t.name}</span>
                          {themeId === id && <Check className="w-4 h-4" style={{ color: t.accentText }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
