import React, { useState, useRef, useEffect } from 'react';
import { SwarmMessage, DotId, DotAgent, AIProvider } from '../types/swarm';
import { AgentBadge } from './AgentBadge';
import { 
  Send, Volume2, Copy, Check, Download, 
  Trash2, AlertCircle, Sparkles, FileText, FileCode, CheckCircle2 
} from 'lucide-react';
import { audioService } from '../services/audio';
import { downloadTextFile } from '../utils/fileDownload';

interface SwarmFeedProps {
  messages: SwarmMessage[];
  agents: Record<DotId, DotAgent>;
  speakingDot: DotId | null;
  isRunningMission: boolean;
  activeMission: string;
  activeProvider: AIProvider;
  onDispatchMission: (prompt: string, targetAgent?: DotId) => void;
  onStopMission: () => void;
  onClearFeed: () => void;
}

export const SwarmFeed: React.FC<SwarmFeedProps> = ({
  messages,
  agents,
  speakingDot,
  isRunningMission,
  activeMission,
  activeProvider,
  onDispatchMission,
  onStopMission,
  onClearFeed,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [targetAgent, setTargetAgent] = useState<DotId | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRunningMission]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isRunningMission) return;
    onDispatchMission(inputPrompt.trim(), targetAgent === 'all' ? undefined : targetAgent);
    setInputPrompt('');
    audioService.playChirp('chirp');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    audioService.playChirp('chirp');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadDeliverable = (deliverable: NonNullable<SwarmMessage['deliverableFile']>) => {
    downloadTextFile(deliverable.name, deliverable.content, deliverable.mimeType || 'text/plain');
    audioService.playChirp('success');
  };

  return (
    <div className="w-full h-full flex flex-col rounded-xl bg-[#0f172a] border border-slate-800 shadow-sm overflow-hidden">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0b0f19]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunningMission ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
              Agent Execution & Deliverables Console
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#070a12] text-slate-400 border border-slate-800">
            Provider: {activeProvider}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClearFeed}
              className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
              title="Clear feed messages"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs bg-[#0b0f19]/40"
      >
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 text-cyan-500/40 mb-3" />
            <p className="font-mono text-sm text-slate-300 font-medium">Autonomous Agent Console Ready</p>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Dispatch any prompt or task below (e.g. &quot;Send me a funny note&quot;, &quot;Write a microservice in Python&quot;, &quot;Audit JWT auth token handlers&quot;).
              The agent will execute via the real LLM and generate a downloadable deliverable file.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.role === 'agent';
            const agent = msg.agentId ? agents[msg.agentId] : null;

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-2xl bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 text-cyan-100">
                    <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-cyan-400 mb-1">
                      <span className="font-semibold uppercase">User Directive</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm select-text whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col gap-2 max-w-3xl">
                <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700/80 transition-colors shadow-sm">
                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      {msg.agentId && (
                        <AgentBadge
                          dotId={msg.agentId}
                          size="sm"
                          status={agent?.status}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-100 text-xs">
                            {agent ? agent.name : 'System Agent'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            [{agent ? agent.callsign : 'SYS'}]
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {agent ? agent.role : 'Autonomous Execution'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">
                        {msg.tokens} tokens • {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>

                      {/* TTS Speak */}
                      {agent && (
                        <button
                          onClick={() => {
                            if (msg.agentId) {
                              audioService.speak(msg.content, msg.agentId, agent.voiceConfig.pitch, agent.voiceConfig.rate);
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="Read aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        title="Copy content"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Main Output Content */}
                  <div className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap select-text py-1">
                    {msg.content}
                  </div>

                  {/* PROMINENT DELIVERABLE ARTIFACT CARD */}
                  {msg.deliverableFile && (
                    <div className="mt-3 p-3 rounded-lg bg-[#070a12] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono text-xs font-semibold text-slate-100 flex items-center gap-2">
                            <span>{msg.deliverableFile.name}</span>
                            <span className="text-[10px] font-mono text-cyan-400 font-normal">
                              ({msg.deliverableFile.size} bytes)
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Generated Deliverable Artifact • Saved to Workspace Files
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDeliverable(msg.deliverableFile!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Download Deliverable</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error banner if any */}
                  {msg.error && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{msg.error}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Execution Indicator */}
        {isRunningMission && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Executing directive: &quot;{activeMission}&quot;...</span>
            </div>
            <button
              onClick={onStopMission}
              className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono cursor-pointer"
            >
              Abort Directive
            </button>
          </div>
        )}
      </div>

      {/* Input Dispatch Console */}
      <div className="p-3 border-t border-slate-800 bg-[#0b0f19]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 shrink-0">Target:</span>
            <select
              value={targetAgent}
              onChange={(e) => setTargetAgent(e.target.value as DotId | 'all')}
              className="px-2.5 py-1 rounded-md bg-[#070a12] border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Collaborative Swarm (All 4 Nodes)</option>
              <option value="spark">Spark [ARCH-01] Systems Architect</option>
              <option value="nova">Nova [SEC-02] Security Auditor</option>
              <option value="aura">Aura [QA-03] Test Architect</option>
              <option value="echo">Echo [DOC-04] Technical Scribe</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="e.g. Send me a funny note, or Architect auth middleware, or Write a Python script..."
              disabled={isRunningMission}
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#070a12] border border-slate-700/80 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isRunningMission}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
