import React, { useState } from 'react';
import { KanbanTask, TaskStatus, TaskPriority, DotId } from '../types/swarm';
import { CuteDotAvatar } from './CuteDotAvatar';
import { 
  Plus, Trash2, ArrowRight, ArrowLeft, 
  Download, Play, CheckCircle2, Clock, AlertCircle, 
  FileText, X, Sparkles, RefreshCw, Eye 
} from 'lucide-react';
import { audioService } from '../services/audio';
import { downloadTextFile, sanitizeFilename } from '../utils/fileDownload';

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onAddTask: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onRunTaskWithAgent: (taskId: string) => Promise<void>;
  onSaveTaskOutput: (taskId: string, outputContent: string, outputFileName?: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onRunTaskWithAgent,
  onSaveTaskOutput,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDot, setNewDot] = useState<DotId>('spark');
  const [newTags, setNewTags] = useState('agent, deliverable');
  const [runImmediately, setRunImmediately] = useState(false);

  // Inspector detail modal
  const [inspectedTask, setInspectedTask] = useState<KanbanTask | null>(null);
  const [detailOutput, setDetailOutput] = useState('');
  const [detailFileName, setDetailFileName] = useState('');

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const columns: { id: TaskStatus; title: string; badgeColor: string }[] = [
    { id: 'todo', title: 'BACKLOG', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700' },
    { id: 'in_progress', title: 'IN PROGRESS', badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
    { id: 'review', title: 'REVIEW & AUDIT', badgeColor: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30' },
    { id: 'done', title: 'COMPLETED & VERIFIED', badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  ];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const taskTitle = newTitle.trim();
    const taskDesc = newDesc.trim() || 'Task deliverable required.';
    const filename = sanitizeFilename(taskTitle, 'txt');

    onAddTask({
      title: taskTitle,
      description: taskDesc,
      status: 'todo',
      priority: newPriority,
      assignedDotId: newDot,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      outputFileName: filename,
    });

    audioService.playChirp('success');
    setNewTitle('');
    setNewDesc('');
    setIsModalOpen(false);
  };

  const handleDownloadTask = (task: KanbanTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const filename = task.outputFileName || sanitizeFilename(task.title, 'txt');
    const content = task.outputContent 
      ? task.outputContent 
      : `TASK DELIVERABLE SPECIFICATION\n` +
        `========================================\n` +
        `Title: ${task.title}\n` +
        `Assigned Agent: ${task.assignedDotId.toUpperCase()}\n` +
        `Status: ${task.status.toUpperCase()}\n` +
        `Priority: ${task.priority.toUpperCase()}\n` +
        `Date: ${new Date(task.updatedAt).toISOString()}\n` +
        `========================================\n\n` +
        `Description:\n${task.description}\n`;

    downloadTextFile(filename, content);
    audioService.playChirp('terminal');
  };

  const handleExecuteTask = async (task: KanbanTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExecutingTaskId(task.id);
    audioService.playChirp('chirp');

    try {
      await onRunTaskWithAgent(task.id);
      audioService.playChirp('success');
    } catch (err: any) {
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setExecutingTaskId(null);
    }
  };

  const openInspector = (task: KanbanTask) => {
    setInspectedTask(task);
    setDetailOutput(task.outputContent || '');
    setDetailFileName(task.outputFileName || sanitizeFilename(task.title, 'txt'));
  };

  const saveInspectedChanges = () => {
    if (!inspectedTask) return;
    onSaveTaskOutput(inspectedTask.id, detailOutput, detailFileName);
    setInspectedTask(prev => prev ? { ...prev, outputContent: detailOutput, outputFileName: detailFileName } : null);
    audioService.playChirp('terminal');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onUpdateTaskStatus(taskId, status);
      audioService.playChirp('terminal');
    }
    setDraggedTaskId(null);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">CRIT</span>;
      case 'high':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">HIGH</span>;
      case 'medium':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">MED</span>;
      case 'low':
        return <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017]/90 rounded-xl border border-slate-800 p-4 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
              Agent Task Deliverables & Kanban
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {tasks.length} Active Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Create tasks, dispatch to agents, and download deliverables directly to disk
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-y-auto">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-[#080a0f] rounded-xl border border-slate-800/80 p-3 min-h-[350px] overflow-hidden"
            >
              {/* Column Title */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/60">
                <span className="text-xs font-mono font-bold tracking-wider text-slate-300">
                  {col.title}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${col.badgeColor}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-[11px] font-mono text-slate-600 border border-dashed border-slate-800/80 rounded-lg">
                    No items in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isExecuting = executingTaskId === task.id;
                    const hasOutput = Boolean(task.outputContent);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => openInspector(task)}
                        className="p-3 rounded-lg bg-[#0e121a] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm group"
                      >
                        {/* Header: Title & Priority */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-slate-200 text-xs line-clamp-2">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {getPriorityBadge(task.priority)}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTask(task.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-400 mb-2 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Output Status Pill */}
                        {hasOutput && (
                          <div className="mb-2 p-1.5 rounded bg-emerald-950/30 border border-emerald-800/40 text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                            <span className="truncate">✓ Deliverable: {task.outputFileName || 'file.txt'}</span>
                            <span className="text-[9px] text-emerald-400/80 shrink-0">
                              {task.outputContent?.length || 0} B
                            </span>
                          </div>
                        )}

                        {/* Footer: Agent + Actions (Run & Download) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                            <CuteDotAvatar dotId={task.assignedDotId} size="sm" />
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                              {task.assignedDotId}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Run with Agent Button */}
                            <button
                              type="button"
                              disabled={isExecuting}
                              onClick={(e) => handleExecuteTask(task, e)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                                isExecuting
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                              }`}
                              title="Execute task with assigned agent"
                            >
                              {isExecuting ? (
                                <>
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  <span>Running</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Execute</span>
                                </>
                              )}
                            </button>

                            {/* Direct Download File Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadTask(task, e)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                              title="Download deliverable file directly to disk"
                            >
                              <Download className="w-2.5 h-2.5 text-cyan-400" />
                              <span>File</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e121a] border border-slate-800 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold font-mono text-slate-100 uppercase tracking-wider">
                Create Task / Directive
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">
                  Task Directive (e.g. "Send me a funny note" or "Implement token validator")
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. send me a funny note"
                  className="w-full bg-[#080a0f] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">
                  Detailed Requirements / Scope
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Specific prompt constraints or instructions for the agent..."
                  className="w-full bg-[#080a0f] border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">
                    Assigned Agent
                  </label>
                  <select
                    value={newDot}
                    onChange={(e) => setNewDot(e.target.value as DotId)}
                    className="w-full bg-[#080a0f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="spark">Spark (Architecture & Code)</option>
                    <option value="nova">Nova (Security & Audit)</option>
                    <option value="aura">Aura (QA & Test Automation)</option>
                    <option value="echo">Echo (Documentation & Notes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-[#080a0f] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Deliverable Inspector Modal */}
      {inspectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0e121a] border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CuteDotAvatar dotId={inspectedTask.assignedDotId} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-mono">
                    {inspectedTask.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">
                    Status: {inspectedTask.status} | Priority: {inspectedTask.priority}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTask({
                    ...inspectedTask,
                    outputContent: detailOutput,
                    outputFileName: detailFileName,
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Deliverable File</span>
                </button>
                <button
                  onClick={() => setInspectedTask(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scope / Instructions */}
            <div className="mb-3 p-3 rounded-lg bg-[#080a0f] border border-slate-800/80 text-xs text-slate-300">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Directive Scope</span>
              <p>{inspectedTask.description}</p>
            </div>

            {/* Filename Input */}
            <div className="mb-3">
              <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">
                Output File Name (download target)
              </label>
              <input
                type="text"
                value={detailFileName}
                onChange={(e) => setDetailFileName(e.target.value)}
                className="w-full bg-[#080a0f] border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                <span>DELIVERABLE CONTENT (EDITABLE)</span>
                <span>{detailOutput.length} characters</span>
              </div>
              <textarea
                value={detailOutput}
                onChange={(e) => setDetailOutput(e.target.value)}
                placeholder="Agent deliverable output content will appear here when executed, or type content manually..."
                className="w-full flex-1 bg-[#080a0f] border border-slate-800 rounded-lg p-3 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
              <button
                onClick={() => handleExecuteTask(inspectedTask)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                <span>Re-Execute with Agent</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectedTask(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={saveInspectedChanges}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-white text-slate-950 font-mono text-xs font-bold"
                >
                  Save Deliverable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
