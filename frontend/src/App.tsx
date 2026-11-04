import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { fetchHealth, fetchProjects, createProject, deleteProject } from './services/api';
import { Project, HealthCheckResponse } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Poll or check health
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

  // Load project list from SQLite via FastAPI
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkServerHealth();
    loadProjects();

    // Check health every 15 seconds
    const interval = setInterval(checkServerHealth, 15000);
    return () => clearInterval(interval);
  }, [checkServerHealth, loadProjects]);

  const handleCreateProject = async (name: string, description: string) => {
    const newProj = await createProject(name, description);
    setProjects((prev) => [newProj, ...prev]);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-studio-900 text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        health={health}
        isBackendOnline={isBackendOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {currentTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            isLoading={isLoading}
            onOpenCreateModal={() => setIsModalOpen(true)}
            onDeleteProject={handleDeleteProject}
            onRefresh={() => {
              checkServerHealth();
              loadProjects();
            }}
          />
        )}

        {currentTab === 'cutscenes' && (
          <div className="flex-1 p-8 flex items-center justify-center text-center">
            <div className="max-w-md p-6 bg-studio-800 border border-studio-700 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-2">Cutscene Upload & Extraction</h3>
              <p className="text-sm text-slate-400">
                This workspace will be introduced in <strong>Phase 2</strong>: Cutscene video upload, FFmpeg frame extraction, and speech track separation.
              </p>
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
          <div className="flex-1 p-8 space-y-6 max-w-3xl">
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
