import React from 'react';
import { DotAgent, DotId } from '../types/swarm';
import { AgentBadge } from './AgentBadge';
import { Terminal, Send, CheckCircle2, ShieldCheck, Activity, Cpu, FileText } from 'lucide-react';
import { audioService } from '../services/audio';

interface SwarmArenaProps {
  agents: Record<DotId, DotAgent>;
  speakingDot: DotId | null;
  selectedDot: DotId;
  onSelectDot: (id: DotId) => void;
  onOpenTerminal: (id: DotId) => void;
  onPromptAgent?: (id: DotId) => void;
}

export const SwarmArena: React.FC<SwarmArenaProps> = ({
  agents,
  speakingDot,
  selectedDot,
  onSelectDot,
  onOpenTerminal,
  onPromptAgent,
}) => {
  const dots: DotId[] = ['spark', 'nova', 'aura', 'echo'];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Active Autonomous Agent Roster
          </h2>
          <p className="text-xs text-slate-400">
            Dedicated specialized nodes executing tasks with real LLM reasoning.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {dots.map((id) => {
          const agent = agents[id];
          const isSelected = selectedDot === id;
          const isSpeaking = speakingDot === id;
          const isExecuting = agent.status === 'executing';

          const borderColors = {
            spark: isSelected ? 'border-cyan-500/80 bg-[#0d1726]' : 'border-slate-800 hover:border-slate-700 bg-[#0f172a]',
            nova: isSelected ? 'border-fuchsia-500/80 bg-[#170e24]' : 'border-slate-800 hover:border-slate-700 bg-[#0f172a]',
            aura: isSelected ? 'border-emerald-500/80 bg-[#0c1a17]' : 'border-slate-800 hover:border-slate-700 bg-[#0f172a]',
            echo: isSelected ? 'border-amber-500/80 bg-[#1a150c]' : 'border-slate-800 hover:border-slate-700 bg-[#0f172a]',
          }[id];

          return (
            <div
              key={id}
              onClick={() => onSelectDot(id)}
              className={`rounded-xl border ${borderColors} p-4 transition-all duration-200 flex flex-col justify-between shadow-sm cursor-pointer relative overflow-hidden`}
            >
              {/* Top Row: Badge & Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <AgentBadge
                      dotId={id}
                      size="md"
                      status={agent.status}
                      isSpeaking={isSpeaking}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-slate-100">
                          {agent.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {agent.callsign}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-medium truncate max-w-[130px]">
                        {agent.role}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      isExecuting
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : agent.status === 'error'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isExecuting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    {isExecuting ? 'EXECUTING' : 'READY'}
                  </span>
                </div>

                {/* Specialty Description */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {agent.specialty}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 py-2 px-2.5 rounded-lg bg-[#070a12] border border-slate-800/80 mb-3 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Tasks Done</span>
                    <span className="text-slate-200 font-semibold">{agent.stats.tasksCompleted}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Deliverables</span>
                    <span className="text-cyan-400 font-semibold">{agent.stats.deliverablesProduced}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTerminal(id);
                    audioService.playChirp('terminal');
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Terminal</span>
                </button>

                {onPromptAgent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPromptAgent(id);
                      audioService.playChirp('chirp');
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3 text-cyan-400" />
                    <span>Direct Task</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
