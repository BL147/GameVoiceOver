import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CutsceneStudio } from './components/CutsceneStudio';
import { CreateProjectModal } from './components/CreateProjectModal';
import { fetchHealth, fetchProjects, createProject, deleteProject } from './services/api';
import { Project, HealthCheckResponse } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Healthcheck polling
  const checkServerHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setIsBackendOnline(true);
    } catch {
      setIsBackendOnline(false);
      setHealth(null);
    }
  }, []);

  // Load project list from backend
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjects();
      setProjects(data);

      // Keep active project in sync if one is currently opened
      setActiveProject((prev) => {
        if (!prev) return null;
        return data.find((p) => p.id === prev.id) || null;
      });
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkServerHealth();
    loadProjects();

    const interval = setInterval(checkServerHealth, 15000);
    return () => clearInterval(interval);
  }, [checkServerHealth, loadProjects]);

  const handleCreateProject = async (name: string, description: string) => {
    const newProj = await createProject(name, description);
    setProjects((prev) => [newProj, ...prev]);
    // Immediately open studio for the new project
    setActiveProject(newProj);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
    }
  };

  const handleProjectUpdated = (updated: Project) => {
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-studio-900 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'dashboard') {
            setActiveProject(null);
          }
        }}
        health={health}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* If a project is actively opened, show the Cutscene Studio */}
        {activeProject ? (
          <CutsceneStudio
            project={activeProject}
            onBack={() => setActiveProject(null)}
            onProjectUpdated={handleProjectUpdated}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                projects={projects}
                isLoading={isLoading}
                onOpenCreateModal={() => setIsModalOpen(true)}
                onOpenProject={(proj) => setActiveProject(proj)}
                onDeleteProject={handleDeleteProject}
                onRefresh={() => {
                  checkServerHealth();
                  loadProjects();
                }}
              />
            )}

            {currentTab === 'cutscenes' && (
              <div className="flex-1 p-8 overflow-y-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Cutscene Vault</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Select a project to inspect its cutscene video, 48kHz audio track, and sampled frames.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => setActiveProject(proj)}
                      className="group p-5 rounded-2xl bg-studio-800 border border-studio-700 hover:border-indigo-500 transition-all cursor-pointer shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-indigo-400 bg-studio-750 px-2 py-0.5 rounded border border-studio-700">
                          {proj.id}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          proj.has_video 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                        }`}>
                          {proj.has_video ? 'Video Ready' : 'Pending Upload'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {proj.name}
                      </h3>
                      {proj.has_video && proj.duration ? (
                        <p className="text-xs text-slate-400">
                          Duration: {proj.duration}s • {proj.width}×{proj.height} • {proj.frames_count} frames
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">No video uploaded yet. Click to upload.</p>
                      )}
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                      No cutscenes found. Create a project to upload your first cutscene!
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentTab === 'voices' && (
              <div className="flex-1 p-8 flex items-center justify-center text-center">
                <div className="max-w-md p-6 bg-studio-800 border border-studio-700 rounded-2xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Gnani Voice Lab</h3>
                  <p className="text-sm text-slate-400">
                    This workspace will be introduced in <strong>Phase 4</strong>: Character voice casting with 13 Timbre v3.0 voices and emotion tag tuning.
                  </p>
                </div>
              </div>
            )}

            {currentTab === 'settings' && (
              <div className="flex-1 p-8 space-y-6 max-w-3xl overflow-y-auto">
                <h2 className="text-2xl font-bold text-white">Studio Settings</h2>
                <div className="p-6 bg-studio-800 border border-studio-700 rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Local Environment</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between py-2 border-b border-studio-700/60">
                      <span className="text-slate-400">Backend Server</span>
                      <span className="font-mono text-xs">http://127.0.0.1:8000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-studio-700/60">
                      <span className="text-slate-400">Database Engine</span>
                      <span className="font-mono text-xs">SQLite (`gamevoiceover.db`)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-studio-700/60">
                      <span className="text-slate-400">Video Processing</span>
                      <span className="font-mono text-xs">FFmpeg 9.0.2 + FFprobe</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">API Documentation</span>
                      <a
                        href="http://127.0.0.1:8000/docs"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        Open Swagger UI ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal for Creating New Projects */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
