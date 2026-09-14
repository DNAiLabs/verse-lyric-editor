import { useState } from 'react';
import { X, Plus, Pencil, Trash2, User } from 'lucide-react';
import type { Persona } from '@/lib/supabase';

interface ManagePersonasModalProps {
  personas: Persona[];
  onClose: () => void;
  onAdd: (persona: Omit<Persona, 'id' | 'created_at' | 'is_default'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<Persona>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface EditingState {
  mode: 'add' | 'edit';
  id?: string;
  name: string;
  description: string;
  flow_style: string;
  rhyme_density: string;
}

const RHYME_DENSITY_OPTIONS = ['Low', 'Medium', 'High', 'Very High', 'Complex'];

export function ManagePersonasModal({
  personas,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: ManagePersonasModalProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customCount = personas.filter((p) => !p.is_default).length;
  const maxReached = personas.length >= 10;

  const startAdd = () => {
    setError(null);
    setEditing({
      mode: 'add',
      name: '',
      description: '',
      flow_style: '',
      rhyme_density: 'Medium',
    });
  };

  const startEdit = (p: Persona) => {
    setError(null);
    setEditing({
      mode: 'edit',
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      flow_style: p.flow_style ?? '',
      rhyme_density: p.rhyme_density ?? 'Medium',
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError('Persona name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing.mode === 'add') {
        await onAdd({
          name: editing.name.trim(),
          description: editing.description.trim() || null,
          flow_style: editing.flow_style.trim() || null,
          rhyme_density: editing.rhyme_density,
        });
      } else if (editing.id) {
        await onEdit(editing.id, {
          name: editing.name.trim(),
          description: editing.description.trim() || null,
          flow_style: editing.flow_style.trim() || null,
          rhyme_density: editing.rhyme_density,
        });
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save persona.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const persona = personas.find((p) => p.id === id);
    if (!persona || persona.is_default) return;
    if (!confirm(`Delete persona "${persona.name}"?`)) return;
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete persona.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Manage Personas</h2>
              <p className="text-xs text-zinc-400">
                {personas.length}/10 personas · {customCount} custom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!editing && (
            <>
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{p.name}</span>
                      {p.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Default
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      {p.flow_style && <span>Flow: {p.flow_style}</span>}
                      {p.rhyme_density && <span>Density: {p.rhyme_density}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(p)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!p.is_default && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!maxReached && (
                <button
                  onClick={startAdd}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add New Persona</span>
                </button>
              )}
              {maxReached && (
                <p className="text-center text-sm text-zinc-500 py-2">
                  Maximum of 10 personas reached. Delete one to add another.
                </p>
              )}
            </>
          )}

          {editing && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Persona Name
                </label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. MF DOOM"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Short bio / style summary"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Flow Style
                </label>
                <input
                  value={editing.flow_style}
                  onChange={(e) => setEditing({ ...editing, flow_style: e.target.value })}
                  placeholder="e.g. Laid-back, boom-bap pocket"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Rhyme Density
                </label>
                <div className="flex flex-wrap gap-2">
                  {RHYME_DENSITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEditing({ ...editing, rhyme_density: opt })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        editing.rhyme_density === opt
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 text-zinc-900 font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editing.mode === 'add' ? 'Add Persona' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
