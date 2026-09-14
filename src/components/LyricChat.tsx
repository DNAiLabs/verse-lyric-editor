import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, TrendingUp } from 'lucide-react';
import { supabase, type Note, type ChatMessage, type ActiveMode, type Persona, type FlowProfile } from '@/lib/supabase';
import { analyzeLyrics } from '@/lib/lyrics';
import { generateLyricResponse } from '@/lib/copilot';

interface LyricChatProps {
  note: Note;
  mode: ActiveMode;
  bpm: number;
  personas: Persona[];
  flowProfiles: FlowProfile[];
  accent: string;
  onClose: () => void;
}

export function LyricChat({ note, mode, bpm, accent, onClose }: LyricChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('note_id', note.id)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Failed to load chat:', error);
      } else {
        setMessages((data ?? []) as ChatMessage[]);
      }
      setLoading(false);
    })();
  }, [note.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const userMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      note_id: note.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const lines = analyzeLyrics(note.lyrics);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const response = generateLyricResponse(text, lines, mode, bpm, history);

    const assistantMsg: ChatMessage = {
      id: 'temp-ai-' + Date.now(),
      note_id: note.id,
      role: 'assistant',
      content: response,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    await supabase.from('chat_messages').insert([
      { note_id: note.id, role: 'user', content: text },
      { note_id: note.id, role: 'assistant', content: response },
    ]);

    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full flex flex-col border-l animate-slide-in-right"
        style={{ background: '#0a0a0b', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
              <Sparkles className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lyric</h3>
              <p className="text-[10px] text-zinc-500">AI Studio Assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-3" style={{ background: `${accent}15` }}>
                <Sparkles className="w-6 h-6" style={{ color: accent }} />
              </div>
              <p className="text-sm text-zinc-400 font-medium mb-1">Hey, I'm Lyric.</p>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-[260px] mx-auto">
                Ask me for feedback on your flow, help brainstorming a hook, or tips on channeling a specific style.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'rounded-br-md text-white'
                      : 'rounded-bl-md text-zinc-300'
                  }`}
                  style={msg.role === 'user'
                    ? { background: accent, color: '#000' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 space-y-1.5">
            {['Give me feedback on my bars', 'Help me write a hook', 'How\'s my flow?', 'Analyze my rhyme scheme'].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-400 border transition-colors hover:text-white"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Lyric..."
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-transform active:scale-90 disabled:opacity-40"
              style={{ background: accent, color: '#000' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
