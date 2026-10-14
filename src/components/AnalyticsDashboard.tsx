import React, { useState, useEffect } from 'react';
import { DotAgent, DotId, SwarmMetricPoint } from '../types/swarm';
import { dbService } from '../services/db';
import { CuteDotAvatar } from './CuteDotAvatar';
import { 
  BarChart3, PieChart, Activity, Database, Download, 
  Trash2, RefreshCw, Cpu, HardDrive, CheckCircle2 
} from 'lucide-react';
import { audioService } from '../services/audio';

interface AnalyticsDashboardProps {
  agents: Record<DotId, DotAgent>;
  metrics: SwarmMetricPoint[];
  onRefreshStats?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  agents,
  metrics,
  onRefreshStats,
}) => {
  const [dbStats, setDbStats] = useState({
    taskCount: 0,
    logCount: 0,
    noteCount: 0,
    telemetryCount: 0,
    storageEstimatedKb: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [metrics]);

  const fetchStats = async () => {
    const stats = await dbService.getInspectorStats();
    setDbStats(stats);
  };

  const handleExport = async () => {
    setIsExporting(true);
    audioService.playChirp('success');
    const json = await dbService.exportFullDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shemdots_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleResetDB = async () => {
    if (confirm('Are you sure you want to wipe local IndexedDB state? This resets all tasks, logs, and notes.')) {
      await dbService.resetDatabase();
      audioService.playChirp('alert');
      fetchStats();
      if (onRefreshStats) onRefreshStats();
      window.location.reload();
    }
  };

  const dots: DotId[] = ['spark', 'nova', 'aura', 'echo'];

  const totalTokens = dots.reduce((sum, d) => sum + agents[d].stats.tokensConsumed, 0) || 1;
  const totalTasks = dots.reduce((sum, d) => sum + agents[d].stats.tasksCompleted, 0) || 1;

  // Render SVG velocity curve
  const points = metrics.length > 1 ? metrics : [
    { timestamp: Date.now() - 40000, tokensPerSec: 4200, totalTokens: 1000, consensusIndex: 90, activeProcesses: 3 },
    { timestamp: Date.now() - 30000, tokensPerSec: 8900, totalTokens: 2500, consensusIndex: 94, activeProcesses: 4 },
    { timestamp: Date.now() - 20000, tokensPerSec: 14200, totalTokens: 5200, consensusIndex: 97, activeProcesses: 4 },
    { timestamp: Date.now() - 10000, tokensPerSec: 12100, totalTokens: 7800, consensusIndex: 98, activeProcesses: 5 },
    { timestamp: Date.now(), tokensPerSec: 16500, totalTokens: 9600, consensusIndex: 99, activeProcesses: 4 },
  ];

  const maxTokensPerSec = Math.max(...points.map(p => p.tokensPerSec), 18000);
  const chartWidth = 500;
  const chartHeight = 140;

  const polylineCoords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * chartWidth;
    const y = chartHeight - (p.tokensPerSec / maxTokensPerSec) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const areaCoords = `${polylineCoords} ${chartWidth},${chartHeight} 0,${chartHeight}`;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>SWARM TELEMETRY & DATABASE INSPECTOR</span>
          </h2>
          <p className="text-xs text-slate-400">Live consensus velocity, token share, and IndexedDB persistence</p>
        </div>

        <button
          onClick={fetchStats}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          title="Refresh Telemetry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid: Workload Distribution & Token Consumption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workload Distribution */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Task Workload Distribution</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Tasks by Dot</span>
          </div>

          <div className="space-y-3">
            {dots.map((d) => {
              const count = agents[d].stats.tasksCompleted;
              const pct = Math.round((count / totalTasks) * 100);
              const barColor = {
                spark: 'bg-cyan-400',
                nova: 'bg-fuchsia-400',
                aura: 'bg-emerald-400',
                echo: 'bg-amber-400',
              }[d];

              return (
                <div key={d} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 capitalize flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${barColor}`} />
                      {agents[d].name}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {count} tasks ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token Consumption Share */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-fuchsia-400" />
              <span>Token Consumption Share</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Total: {(totalTokens / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="space-y-3">
            {dots.map((d) => {
              const tokens = agents[d].stats.tokensConsumed;
              const pct = Math.round((tokens / totalTokens) * 100);
              const barColor = {
                spark: 'bg-cyan-500',
                nova: 'bg-fuchsia-500',
                aura: 'bg-emerald-500',
                echo: 'bg-amber-500',
              }[d];

              return (
                <div key={d} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 capitalize flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${barColor}`} />
                      {agents[d].name}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {(tokens / 1000).toFixed(1)}k tokens ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Speed & Velocity Curve */}
      <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Swarm Velocity & Token Processing Rate</span>
          </h3>
          <span className="text-[11px] font-mono text-cyan-400">
            Peak: {maxTokensPerSec.toLocaleString()} tokens/s
          </span>
        </div>

        {/* SVG Chart */}
        <div className="w-full h-36 relative mt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="30" x2={chartWidth} y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

            {/* Area Fill */}
            <polygon points={areaCoords} fill="url(#velocityGradient)" />

            {/* Line */}
            <polyline
              points={polylineCoords}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2">
          <span>T - 60s</span>
          <span>T - 30s</span>
          <span>CURRENT STREAM</span>
        </div>
      </div>

      {/* Database Inspector Card */}
      <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              IndexedDB Storage Inspector
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleResetDB}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset DB</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Tasks Saved</span>
            <span className="text-lg font-bold font-mono text-slate-100">{dbStats.taskCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Logs Archived</span>
            <span className="text-lg font-bold font-mono text-slate-100">{dbStats.logCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">User Notes</span>
            <span className="text-lg font-bold font-mono text-slate-100">{dbStats.noteCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Storage Footprint</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{dbStats.storageEstimatedKb} KB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
