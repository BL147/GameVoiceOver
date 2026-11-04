import React, { useState } from 'react';
import { X, Sparkles, FolderPlus, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project or cutscene title');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-studio-800 border border-studio-700 w-full max-w-lg rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create Voiceover Project</h2>
              <p className="text-xs text-slate-400">Initialize a new cutscene dubbing workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-studio-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Project / Cutscene Name <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eldoria Intro — Act I Cutscene"
              className="w-full bg-studio-900 border border-studio-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description / Synopsis <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the scene, character tone, or notes..."
              className="w-full bg-studio-900 border border-studio-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="bg-studio-750 p-3.5 rounded-xl border border-studio-700/60 flex items-start gap-2.5 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>
              In future phases, you can drag and drop your video cutscene directly into this project to extract scenes, characters, and voice lines.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-studio-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-studio-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'Creating...' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
