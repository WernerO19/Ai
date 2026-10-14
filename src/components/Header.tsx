import React from 'react';
import { AIProvider } from '../types/swarm';
import { 
  Terminal, Kanban, Files, Activity, Key, 
  Volume2, VolumeX, Plus, Zap, CheckCircle2
} from 'lucide-react';
import { audioService } from '../services/audio';

export type MainNavView = 'arena' | 'tasks' | 'files' | 'terminal' | 'telemetry';

interface HeaderProps {
  currentView: MainNavView;
  onChangeView: (view: MainNavView) => void;
  activeProvider: AIProvider;
  onOpenVault: () => void;
  ttsEnabled: boolean;
  onToggleTTS: () => void;
  isExecuting: boolean;
  onNewTaskModal?: () => void;
  filesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onChangeView,
  activeProvider,
  onOpenVault,
  ttsEnabled,
  onToggleTTS,
  isExecuting,
  onNewTaskModal,
  filesCount = 0,
}) => {
  const navItems: { id: MainNavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'arena', label: 'Agents & Swarm Hub', icon: <Zap className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks & Deliverables', icon: <Kanban className="w-4 h-4" /> },
    { id: 'files', label: 'Workspace Files', icon: <Files className="w-4 h-4" />, badge: filesCount },
    { id: 'terminal', label: 'Terminal & Commands', icon: <Terminal className="w-4 h-4" /> },
    { id: 'telemetry', label: 'System Telemetry', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <header className="w-full bg-[#0b0f19] border-b border-slate-800/80 sticky top-0 z-40 px-5 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & System Node Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-xs text-cyan-400">
              SD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-100 text-sm tracking-wider">
                  SHEMDOTS
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-semibold">
                  Agent Workstation
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  {isExecuting ? 'Agents Executing' : 'Engine Online'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-cyan-400 font-medium">Node v20.x TSX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center bg-[#070a12] p-1 rounded-lg border border-slate-800">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  audioService.playChirp('chirp');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* Active Model Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#070a12] border border-slate-800 text-xs font-mono text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">LLM:</span>
            <span className="text-cyan-400 font-medium uppercase">{activeProvider}</span>
          </div>

          {/* New Task Button */}
          {onNewTaskModal && (
            <button
              onClick={() => {
                onNewTaskModal();
                audioService.playChirp('chirp');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
              <span>New Task</span>
            </button>
          )}

          {/* API Configuration Button */}
          <button
            onClick={() => {
              onOpenVault();
              audioService.playChirp('chirp');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            title="Configure AI API Providers"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">API Config</span>
          </button>

          {/* TTS Speech Toggle */}
          <button
            onClick={() => {
              onToggleTTS();
              audioService.playChirp('chirp');
            }}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
              ttsEnabled
                ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'
                : 'bg-[#0f172a] border-slate-700/80 text-slate-500'
            }`}
            title={ttsEnabled ? 'Agent Voice Audio: ON' : 'Agent Voice Audio: MUTED'}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
