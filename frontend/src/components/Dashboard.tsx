import React, { useState } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  Clock, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  Search, 
  RefreshCw,
  Film,
  AudioLines
} from 'lucide-react';
import { Project } from '../types';

interface DashboardProps {
  projects: Project[];
  isLoading: boolean;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  isLoading,
  onOpenCreateModal,
  onDeleteProject,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        setDeletingId(id);
        await onDeleteProject(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-studio-900">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-700/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Voiceover Projects</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage cutscene audio dubbing pipelines, dialogue lines, and AI character voices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-slate-400 hover:text-white border border-studio-700 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-studio-800/90 border border-studio-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Projects</p>
            <p className="text-2xl font-bold text-white mt-1">{projects.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-studio-800/90 border border-studio-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pipeline Engine</p>
            <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>FastAPI + SQLite</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Phase 1 Baseline Ready</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Film className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-studio-800/90 border border-studio-700/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Voiceover AI</p>
            <p className="text-sm font-semibold text-indigo-300 mt-1">Gnani Timbre v3.0</p>
            <p className="text-[11px] text-slate-500 mt-0.5">13 Voices with Emotion Tags</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <AudioLines className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 bg-studio-800 border border-studio-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredProjects.length} of {projects.length}
        </span>
      </div>

      {/* Projects Grid / List */}
      {filteredProjects.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-studio-700/70 rounded-2xl bg-studio-800/40 p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">No voiceover projects yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Get started by creating your first cutscene project. You will be able to extract dialogue and assign voice actors in upcoming phases.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 transition"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-2xl bg-studio-800 border border-studio-700 hover:border-indigo-500/50 transition-all p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header with Status and ID */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-studio-750 text-indigo-400 border border-studio-700">
                    {project.id}
                  </span>
                  {getStatusBadge(project.status)}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Footer info & actions */}
              <div className="mt-5 pt-4 border-t border-studio-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatDate(project.created_at)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    disabled={deletingId === project.id}
                    title="Delete project"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => alert(`Project ${project.name} selected. Video cutscene upload will be enabled in Phase 2!`)}
                    className="px-2.5 py-1.5 bg-studio-700 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-lg flex items-center gap-1 text-xs font-medium transition"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
