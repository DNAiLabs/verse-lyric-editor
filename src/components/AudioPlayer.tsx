import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Repeat, X } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  title: string;
  onRemove?: () => void;
  accent: string;
}

export function AudioPlayer({ url, title, onRemove, accent }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [looping, setLooping] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnd = () => {
      if (!looping) setPlaying(false);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [looping]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setProgress(pct * duration);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl backdrop-blur-md border" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <audio ref={audioRef} src={url} loop={looping} />
      <button
        onClick={toggle}
        className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-transform active:scale-90"
        style={{ background: accent, color: '#000' }}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmt(progress)}</span>
          <div className="flex-1 h-1 rounded-full cursor-pointer" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={seek}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmt(duration)}</span>
        </div>
      </div>
      <button
        onClick={() => setLooping(!looping)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: looping ? accent : 'rgba(255,255,255,0.3)' }}
      >
        <Repeat className="w-3.5 h-3.5" />
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
