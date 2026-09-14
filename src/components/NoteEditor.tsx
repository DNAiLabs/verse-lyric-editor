import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Mic, Sparkles, ChevronDown, Music, Gauge, ImagePlus,
  Headphones, Trash2, CheckCircle2, Save, MessageCircle, Layers, Hash,
  Zap, Activity, X, FileText, Disc3,
} from 'lucide-react';
import { supabase, type Note, type NoteStatus, type Persona, type FlowProfile, type NotePhoto, type ActiveMode } from '@/lib/supabase';
import { analyzeLyrics, getTotalBars, getAvgSyllablesPerBar, getFlowPace, detectRhymes, type LineAnalysis } from '@/lib/lyrics';
import { generateSuggestions } from '@/lib/copilot';
import { uploadNotePhoto, uploadNoteAudio, deleteStorageObject } from '@/lib/storage';
import { AudioPlayer } from '@/components/AudioPlayer';
import { PhotoModal } from '@/components/PhotoModal';
import { LyricChat } from '@/components/LyricChat';
import { ManagePersonasModal } from '@/components/ManagePersonasModal';
import type { StudioTheme } from '@/lib/themes';

const MUSICAL_KEYS = [
  'C Major', 'C# Major', 'D Major', 'D# Major', 'E Major', 'F Major',
  'F# Major', 'G Major', 'G# Major', 'A Major', 'A# Major', 'B Major',
  'C Minor', 'C# Minor', 'D Minor', 'D# Minor', 'E Minor', 'F Minor',
  'F# Minor', 'G Minor', 'G# Minor', 'A Minor', 'A# Minor', 'B Minor',
];

const BPM_OPTIONS = [60, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120, 130, 140, 150, 160, 170, 180];

const SECTION_CHIPS = ['[Intro]', '[Verse 1]', '[Hook]', '[Verse 2]', '[Bridge]', '[Outro]'];

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; dot: string }> = {
  concept: { label: 'Concept', color: '#fbbf24', dot: '#fbbf24' },
  in_progress: { label: 'In Progress', color: '#60a5fa', dot: '#60a5fa' },
  needs_recording: { label: 'Needs Recording', color: '#a78bfa', dot: '#a78bfa' },
  complete: { label: 'Complete', color: '#34d399', dot: '#34d399' },
};

const STATUSES: NoteStatus[] = ['concept', 'in_progress', 'needs_recording', 'complete'];

interface NoteEditorProps {
  note: Note;
  personas: Persona[];
  flowProfiles: FlowProfile[];
  theme: StudioTheme;
  onBack: () => void;
  onPersonasChange: () => void;
}

export function NoteEditor({ note, personas, flowProfiles, theme, onBack, onPersonasChange }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [lyrics, setLyrics] = useState(note.lyrics);
  const [bpm, setBpm] = useState(note.bpm);
  const [musicalKey, setMusicalKey] = useState(note.musical_key);
  const [status, setStatus] = useState<NoteStatus>(note.status);
  const [mode, setMode] = useState<ActiveMode>({ type: 'raw' });
  const [photos, setPhotos] = useState<NotePhoto[]>([]);
  const [audioUrl, setAudioUrl] = useState(note.audio_url);
  const [audioTitle, setAudioTitle] = useState(note.audio_title);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [photoModal, setPhotoModal] = useState<NotePhoto | null>(null);
  const [statusDropdown, setStatusDropdown] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note.active_persona_id) {
      const p = personas.find((p) => p.id === note.active_persona_id);
      if (p) setMode({ type: 'persona', persona: p });
    } else if (note.active_flow_profile_id) {
      const fp = flowProfiles.find((fp) => fp.id === note.active_flow_profile_id);
      if (fp) setMode({ type: 'flow', profile: fp });
    }
  }, [note, personas, flowProfiles]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('note_photos')
        .select('*')
        .eq('note_id', note.id)
        .order('created_at', { ascending: true });
      if (!error) setPhotos((data ?? []) as NotePhoto[]);
    })();
  }, [note.id]);

  const activePersonaId = mode.type === 'persona' ? mode.persona.id : null;
  const activeFlowProfileId = mode.type === 'flow' ? mode.profile.id : null;

  const saveNote = useCallback(() => {
    setSaveStatus('saving');
    const payload = {
      title, lyrics, bpm, musical_key: musicalKey, status,
      active_persona_id: activePersonaId,
      active_flow_profile_id: activeFlowProfileId,
      audio_url: audioUrl,
      audio_title: audioTitle,
      updated_at: new Date().toISOString(),
    };
    (async () => {
      const { error } = await supabase.from('notes').update(payload).eq('id', note.id);
      if (error) {
        console.error('Save failed:', error);
        setSaveStatus('idle');
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }
    })();
  }, [note.id, title, lyrics, bpm, musicalKey, status, activePersonaId, activeFlowProfileId, audioUrl, audioTitle]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(), 1200);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, lyrics, bpm, musicalKey, status, mode, audioUrl, audioTitle, saveNote]);

  const lines: LineAnalysis[] = analyzeLyrics(lyrics);
  const totalBars = getTotalBars(lines);
  const avgSyl = getAvgSyllablesPerBar(lines);
  const flowPace = getFlowPace(bpm, avgSyl);
  const { lineRhymeColors } = detectRhymes(lines);
  const suggestions = generateSuggestions(lines, mode, bpm);


  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadNotePhoto(file);
      const { data, error } = await supabase
        .from('note_photos')
        .insert({ note_id: note.id, photo_url: url })
        .select()
        .maybeSingle();
      if (!error && data) setPhotos((prev) => [...prev, data as NotePhoto]);
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  };

  const handleDeletePhoto = async (photo: NotePhoto) => {
    await deleteStorageObject('note-photos', photo.photo_url);
    await supabase.from('note_photos').delete().eq('id', photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadNoteAudio(file);
      if (audioUrl) await deleteStorageObject('note-audio', audioUrl);
      setAudioUrl(url);
      setAudioTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      console.error('Audio upload failed:', err);
    }
  };

  const handleRemoveAudio = async () => {
    if (audioUrl) await deleteStorageObject('note-audio', audioUrl);
    setAudioUrl(null);
    setAudioTitle(null);
  };

  const handleClearLyrics = () => {
    if (lyrics.trim() && !confirm('Clear all lyrics?')) return;
    setLyrics('');
  };

  const insertSection = (chip: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newLyrics = lyrics.slice(0, start) + chip + '\n' + lyrics.slice(start);
    setLyrics(newLyrics);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + chip.length + 1, start + chip.length + 1);
    }, 0);
  };

  const handlePersonaAdd = async (persona: Omit<Persona, 'id' | 'created_at' | 'is_default'>) => {
    const { data, error } = await supabase.from('personas').insert({ ...persona, is_default: false }).select().maybeSingle();
    if (error) throw error;
    if (data) { setMode({ type: 'persona', persona: data as Persona }); onPersonasChange(); }
  };

  const handlePersonaEdit = async (id: string, updates: Partial<Persona>) => {
    const { data, error } = await supabase.from('personas').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (data) {
      const updated = data as Persona;
      if (mode.type === 'persona' && mode.persona.id === id) setMode({ type: 'persona', persona: updated });
      onPersonasChange();
    }
  };

  const handlePersonaDelete = async (id: string) => {
    const { error } = await supabase.from('personas').delete().eq('id', id);
    if (error) throw error;
    if (mode.type === 'persona' && mode.persona.id === id) setMode({ type: 'raw' });
    onPersonasChange();
  };

  const statusCfg = STATUS_CONFIG[status];

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
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textFaint }}>
              <Gauge className="w-2.5 h-2.5" /> {bpm} BPM
            </span>
            <span style={{ color: theme.textFaint }}>·</span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: theme.textFaint }}>
              <Music className="w-2.5 h-2.5" /> {musicalKey}
            </span>
            <span style={{ color: theme.textFaint }}>·</span>
            <span className="text-[10px]" style={{ color: theme.textFaint }}>{totalBars} bars</span>
            {saveStatus === 'saving' && <span className="text-[10px] text-amber-400 ml-auto">Saving...</span>}
            {saveStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />}
          </div>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          className="p-2 rounded-xl transition-colors active:scale-90"
          style={{ background: theme.accentSoft, color: theme.accentText }}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl transition-colors active:scale-90"
          style={{ color: theme.textMuted }}
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </header>

      {/* Status + Section Chips Bar */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setStatusDropdown(!statusDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${statusCfg.color}20`, color: statusCfg.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
            {statusCfg.label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {statusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 z-20 rounded-xl overflow-hidden border shadow-2xl animate-fade-in" style={{ background: theme.bgElevated, borderColor: theme.border }}>
                {STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => { setStatus(s); setStatusDropdown(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap w-full hover:bg-white/5"
                      style={{ color: s === status ? cfg.color : theme.textMuted }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {SECTION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => insertSection(chip)}
            className="px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-colors"
            style={{ background: theme.bgElevated, color: theme.textMuted, border: `1px solid ${theme.border}` }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="px-4 py-2 flex-shrink-0">
          <AudioPlayer url={audioUrl} title={audioTitle ?? 'Audio'} onRemove={handleRemoveAudio} accent={theme.accent} />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="sticky left-0 select-none px-3 py-4 text-right z-10" style={{ background: theme.bg }}>
            {lines.map((line) => (
              <div key={line.lineNumber} className="text-xs leading-7 font-mono" style={{ color: line.isEmpty ? theme.border : theme.textFaint }}>
                {line.lineNumber}
              </div>
            ))}
            {lines.length === 0 && <div className="text-xs leading-7 font-mono" style={{ color: theme.border }}>1</div>}
          </div>

          {/* Text + overlays */}
          <div className="flex-1 relative min-w-0">
            <textarea
              ref={textareaRef}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Start writing your verse...&#10;&#10;Each line is a bar. Rhymes highlight in color as you type."
              spellCheck={false}
              className="w-full h-full px-4 py-4 bg-transparent font-mono text-[15px] leading-7 resize-none focus:outline-none absolute inset-0"
              style={{ color: theme.text, caretColor: theme.accent }}
            />
            {/* Rhyme highlight overlay */}
            {lyrics.length > 0 && (
              <div className="pointer-events-none absolute inset-0 px-4 py-4 overflow-hidden">
                {lines.map((line) => {
                  const rhymeColor = lineRhymeColors.get(line.lineNumber - 1);
                  return (
                    <div key={line.lineNumber} className="flex items-center leading-7 h-7">
                      <div className="flex-1" />
                      {!line.isEmpty && !line.isSection && (
                        <div className="flex items-center gap-1.5">
                          {rhymeColor && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: rhymeColor, boxShadow: `0 0 6px ${rhymeColor}80` }}
                            />
                          )}
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background: line.syllables > 16 ? 'rgba(239,68,68,0.12)' : line.syllables > 12 ? 'rgba(251,191,36,0.12)' : `${theme.accentSoft}`,
                              color: line.syllables > 16 ? '#f87171' : line.syllables > 12 ? '#fbbf24' : theme.accentText,
                            }}
                          >
                            {line.syllables}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery Strip */}
      {photos.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setPhotoModal(photo)}
              className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border"
              style={{ borderColor: theme.border }}
            >
              <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="flex items-center justify-center gap-4 px-4 py-2 text-xs flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}`, background: theme.bg }}>
        <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
          <Layers className="w-3 h-3" /> {totalBars} Bars
        </div>
        <div className="w-px h-3" style={{ background: theme.border }} />
        <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
          <Hash className="w-3 h-3" /> {avgSyl > 0 ? avgSyl : '--'} Syl/Bar
        </div>
        <div className="w-px h-3" style={{ background: theme.border }} />
        <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
          <Zap className="w-3 h-3" /> {flowPace}
        </div>
        <div className="w-px h-3" style={{ background: theme.border }} />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: theme.accent }} />
          <span className="font-medium" style={{ color: theme.accentText }}>Engine Ready</span>
        </div>
      </footer>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors active:scale-95"
          style={{ background: theme.bgElevated, color: theme.textMuted, border: `1px solid ${theme.border}` }}
        >
          <ImagePlus className="w-4 h-4" /> Photo
        </button>
        <button
          onClick={() => audioInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors active:scale-95"
          style={{ background: theme.bgElevated, color: theme.textMuted, border: `1px solid ${theme.border}` }}
        >
          <Headphones className="w-4 h-4" /> Audio
        </button>
        <button
          onClick={handleClearLyrics}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors active:scale-95"
          style={{ background: theme.bgElevated, color: theme.textMuted, border: `1px solid ${theme.border}` }}
        >
          <Trash2 className="w-4 h-4" /> Clear
        </button>
      </div>

      {/* Slide-out Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <aside
            className="fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-sm flex flex-col overflow-hidden transform transition-transform duration-300 ease-out"
            style={{ background: theme.bg, borderRight: `1px solid ${theme.border}`, transform: 'translateX(0)' }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: theme.accentSoft }}>
                  <Sparkles className="w-4 h-4" style={{ color: theme.accentText }} />
                </div>
                <h3 className="text-sm font-bold">Studio Settings</h3>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-xl transition-colors" style={{ color: theme.textMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Mode Selector */}
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textFaint }}>Writing Mode</h4>
                <button
                  onClick={() => setMode({ type: 'raw' })}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border mb-2 transition-colors"
                  style={mode.type === 'raw'
                    ? { background: theme.accentSoft, borderColor: `${theme.accent}40`, color: theme.accentText }
                    : { background: theme.bgElevated, borderColor: theme.border, color: theme.textMuted }}
                  >
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Raw Writing Mode</p>
                    <p className="text-[10px]" style={{ color: theme.textFaint }}>Silent, unassisted canvas</p>
                  </div>
                </button>
                <p className="text-[10px] uppercase tracking-wider font-medium mt-4 mb-2" style={{ color: theme.textFaint }}>AI Co-Pilot Personas</p>
                <div className="space-y-1.5">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setMode({ type: 'persona', persona: p })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors"
                      style={mode.type === 'persona' && mode.persona.id === p.id
                        ? { background: theme.accentSoft, borderColor: `${theme.accent}40`, color: theme.accentText }
                        : { background: theme.bgElevated, borderColor: theme.border, color: theme.textMuted }}
                      >
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: theme.bgCard }}>
                        <span className="text-xs font-bold">{p.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[10px] truncate" style={{ color: theme.textFaint }}>{p.rhyme_density ?? '—'} density</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowManageModal(true)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{ color: theme.textMuted, border: `1px solid ${theme.border}` }}
                >
                  <Activity className="w-3.5 h-3.5" /> Manage Personas
                </button>

                {flowProfiles.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider font-medium mt-4 mb-2" style={{ color: theme.textFaint }}>Native Flow Profiles</p>
                    <div className="space-y-1.5">
                      {flowProfiles.map((fp) => (
                        <button
                          key={fp.id}
                          onClick={() => setMode({ type: 'flow', profile: fp })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors"
                          style={mode.type === 'flow' && mode.profile.id === fp.id
                            ? { background: theme.accentSoft, borderColor: `${theme.accent}40`, color: theme.accentText }
                            : { background: theme.bgElevated, borderColor: theme.border, color: theme.textMuted }}
                        >
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0" style={{ background: theme.bgCard }}>
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate">{fp.name}</p>
                            <p className="text-[10px] truncate" style={{ color: theme.textFaint }}>{fp.avg_syllables} syl/bar · {fp.bar_count} bars</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Track Details */}
              <div className="px-5 py-4">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textFaint }}>Track Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: theme.textFaint }}>BPM</label>
                    <div className="relative">
                      <select value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm rounded-xl focus:outline-none cursor-pointer" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, color: theme.text }}>
                        {BPM_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: theme.textFaint }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: theme.textFaint }}>Musical Key</label>
                    <div className="relative">
                      <select value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm rounded-xl focus:outline-none cursor-pointer" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, color: theme.text }}>
                        {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 pointer-events-none" style={{ color: theme.textFaint }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-Pilot Suggestions */}
              {mode.type !== 'raw' && suggestions.length > 0 && (
                <div className="px-5 py-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textFaint }}>Co-Pilot</h4>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className="p-2.5 rounded-lg border text-xs" style={{
                        background: s.severity === 'warning' ? 'rgba(251,191,36,0.05)' : s.severity === 'success' ? 'rgba(52,211,153,0.05)' : theme.bgElevated,
                        borderColor: s.severity === 'warning' ? 'rgba(251,191,36,0.2)' : s.severity === 'success' ? 'rgba(52,211,153,0.2)' : theme.border,
                      }}>
                        <p className="font-semibold mb-0.5" style={{ color: s.severity === 'warning' ? '#fbbf24' : s.severity === 'success' ? '#34d399' : theme.textMuted }}>{s.title}</p>
                        <p className="leading-relaxed text-[11px]" style={{ color: theme.textFaint }}>{s.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Lyric Chat */}
      {chatOpen && (
        <LyricChat note={{ ...note, title, lyrics, bpm }} mode={mode} bpm={bpm} personas={personas} flowProfiles={flowProfiles} accent={theme.accent} onClose={() => setChatOpen(false)} />
      )}

      {/* Photo Modal */}
      {photoModal && (
        <PhotoModal
          url={photoModal.photo_url}
          caption={photoModal.caption}
          onClose={() => setPhotoModal(null)}
          onDelete={() => handleDeletePhoto(photoModal)}
        />
      )}

      {/* Manage Personas */}
      {showManageModal && (
        <ManagePersonasModal
          personas={personas}
          onClose={() => setShowManageModal(false)}
          onAdd={handlePersonaAdd}
          onEdit={handlePersonaEdit}
          onDelete={handlePersonaDelete}
        />
      )}
    </div>
  );
}
