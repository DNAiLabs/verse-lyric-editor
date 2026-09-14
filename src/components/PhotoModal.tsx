import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';

interface PhotoModalProps {
  url: string;
  caption?: string | null;
  onClose: () => void;
  onDelete?: () => void;
}

export function PhotoModal({ url, caption, onClose, onDelete }: PhotoModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(Math.max(1, zoom - 0.25)); }}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(Math.min(3, zoom + 0.25)); }}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
            className="p-2.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <img
        src={url}
        alt={caption ?? 'Photo'}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
      />
      {caption && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/70 max-w-md text-center px-4">
          {caption}
        </p>
      )}
    </div>
  );
}
