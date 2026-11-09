import React from 'react';
import { LayoutDashboard, Film, Mic2, Settings, Terminal, Radio } from 'lucide-react';
import { HealthCheckResponse } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  health: HealthCheckResponse | null;
  isBackendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  health,
  isBackendOnline,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Projects & Studio', icon: LayoutDashboard },
    { id: 'cutscenes', label: 'Cutscenes', icon: Film, badge: 'Ready' },
    { id: 'voices', label: 'Voice Lab', icon: Mic2, badge: 'Phase 4' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-studio-800 border-r border-studio-700 flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-studio-700">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
          <Mic2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
            GameVoiceOver
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Studio
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">AI Cutscene Voiceover</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-studio-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-750 text-slate-400 border border-studio-600 font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-studio-700 bg-studio-900/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            Backend API
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isBackendOnline
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            {isBackendOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {health && (
          <div className="space-y-1 text-[11px] text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>SQLite DB:</span>
              <span className="text-slate-300 capitalize">{health.database}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" /> port 8000
              </span>
              <span>FastAPI</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
