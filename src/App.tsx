import React, { useState, useEffect, useRef } from 'react';
import { 
  DotId, DotAgent, SwarmMessage, KanbanTask, 
  CustomTerminalCommand, SwarmConfig, AIProvider, 
  DeliverableFile, TaskStatus 
} from './types/swarm';
import { dbService } from './services/db';
import { audioService } from './services/audio';
import { AIService } from './services/aiService';
import { ChatPane } from './components/ChatPane';
import { DeliverableCanvas } from './components/DeliverableCanvas';
import { WorkspaceFiles } from './components/WorkspaceFiles';
import { AgentTerminal } from './components/AgentTerminal';
import { KanbanBoard } from './components/KanbanBoard';
import { ApiVaultModal } from './components/ApiVaultModal';
import { DotBlobAvatar } from './components/DotBlobAvatar';
import { 
  FileText, Files, Terminal, Kanban, Settings, 
  Volume2, VolumeX, Download, Key, Sparkles, RefreshCw, Layers 
} from 'lucide-react';
import { downloadTextFile } from './utils/fileDownload';

const INITIAL_DOTS: Record<DotId, DotAgent> = {
  echo: {
    id: 'echo',
    callsign: 'DOC-04',
    name: 'Alfred',
    role: 'Executive Scribe & Operations',
    specialty: 'Deliverables, user notes, humor & memos, executive proposals',
    color: '#f59e0b',
    accentColor: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-700',
    voiceConfig: { pitch: 1.0, rate: 1.0 },
    stats: { tasksCompleted: 8, tokensConsumed: 12400, avgLatencyMs: 24, deliverablesProduced: 5 },
    status: 'idle',
    currentThought: 'Ready to draft deliverables and notes on your behalf.',
  },
  spark: {
    id: 'spark',
    callsign: 'ARCH-01',
    name: 'Spark',
    role: 'Systems Architect & Code',
    specialty: 'High-performance reactive software, algorithms, zero-copy pipelines',
    color: '#3b82f6',
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700',
    voiceConfig: { pitch: 1.15, rate: 1.1 },
    stats: { tasksCompleted: 14, tokensConsumed: 22100, avgLatencyMs: 19, deliverablesProduced: 9 },
    status: 'idle',
    currentThought: 'Standing by to architect solutions and generate clean code.',
  },
  nova: {
    id: 'nova',
    callsign: 'SEC-02',
    name: 'Nova',
    role: 'Security & Zero-Trust Auditor',
    specialty: 'Vulnerability audits, cryptographic validation, threat modeling',
    color: '#8b5cf6',
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700',
    voiceConfig: { pitch: 0.9, rate: 0.98 },
    stats: { tasksCompleted: 11, tokensConsumed: 16800, avgLatencyMs: 31, deliverablesProduced: 6 },
    status: 'idle',
    currentThought: 'Active security scanners monitoring attack surfaces.',
  },
  aura: {
    id: 'aura',
    callsign: 'QA-03',
    name: 'Aura',
    role: 'Staff QA & Test Verification',
    specialty: 'Test harnesses, boundary conditions, chaos assertion suites',
    color: '#10b981',
    accentColor: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    voiceConfig: { pitch: 1.05, rate: 1.05 },
    stats: { tasksCompleted: 12, tokensConsumed: 15300, avgLatencyMs: 21, deliverablesProduced: 8 },
    status: 'idle',
    currentThought: 'Test suites synchronized. Ready to fuzz and assert.',
  },
};

const INITIAL_CONFIG: SwarmConfig = {
  activeProvider: 'gemini',
  providers: {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini (Built-in Server)',
      apiKey: '',
      selectedModel: 'gemini-3.1-flash-lite',
      availableModels: ['gemini-3.1-flash-lite', 'gemini-3.8-flash'],
      enabled: true,
      requiresKey: false,
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      apiKey: '',
      selectedModel: 'gpt-4o',
      availableModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
      enabled: true,
      requiresKey: true,
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic Claude',
      apiKey: '',
      selectedModel: 'claude-3-7-sonnet',
      availableModels: ['claude-3-7-sonnet', 'claude-3-5-haiku'],
      enabled: true,
      requiresKey: true,
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      apiKey: '',
      selectedModel: 'meta-llama/llama-3.3-70b-instruct',
      availableModels: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-r1'],
      enabled: true,
      requiresKey: true,
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      apiKey: '',
      selectedModel: 'deepseek-chat',
      availableModels: ['deepseek-chat', 'deepseek-reasoner'],
      enabled: true,
      requiresKey: true,
    },
    groq: {
      id: 'groq',
      name: 'Groq Cloud',
      apiKey: '',
      selectedModel: 'llama-3.3-70b-versatile',
      availableModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
      enabled: true,
      requiresKey: true,
    },
    ollama: {
      id: 'ollama',
      name: 'Ollama (Local)',
      apiKey: 'ollama',
      baseUrl: 'http://localhost:11434',
      selectedModel: 'llama3',
      availableModels: ['llama3', 'mistral', 'qwen2.5-coder'],
      enabled: true,
      requiresKey: false,
    },
  },
  ttsEnabled: true,
  soundEffectsEnabled: true,
};

type RightPaneView = 'canvas' | 'files' | 'terminal' | 'tasks';

export default function App() {
  const [dots, setDots] = useState<Record<DotId, DotAgent>>(INITIAL_DOTS);
  const [activeDotId, setActiveDotId] = useState<DotId>('echo');
  const [config, setConfig] = useState<SwarmConfig>(INITIAL_CONFIG);
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [rightView, setRightView] = useState<RightPaneView>('canvas');
  const [activeDeliverable, setActiveDeliverable] = useState<DeliverableFile | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<DeliverableFile[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [customCommands, setCustomCommands] = useState<CustomTerminalCommand[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Initialize from storage or defaults
  useEffect(() => {
    async function loadData() {
      const savedTasks = await dbService.getAllTasks();
      const savedCommands = await dbService.getCustomCommands();
      const savedConfig = await dbService.getConfig('swarm_settings');

      if (savedConfig) setConfig(savedConfig);
      if (savedCommands.length > 0) {
        setCustomCommands(savedCommands);
      } else {
        // Seed default commands
        const initialCmds: CustomTerminalCommand[] = [
          {
            id: 'cmd-status',
            name: 'health_check',
            description: 'Verify node services and API provider latency',
            outputTemplate: 'SYSTEM HEALTH CHECK: ALL NODES OPERATIONAL\n- Gemini Provider: CONNECTED\n- Workspace Disk: OK\n- Active Dot: ONLINE',
            category: 'ops',
            createdAt: Date.now(),
          },
          {
            id: 'cmd-proposal',
            name: 'proposal_summary',
            description: 'Output executive summary for Alder Logistics',
            outputTemplate: 'Alder Logistics - Expansion Proposal\n500 -> 750 seats | $360,000 proposed annual value\nNext steps: SSO validation, security review, commercial approval.',
            category: 'dev',
            createdAt: Date.now(),
          },
        ];
        setCustomCommands(initialCmds);
        await dbService.saveCustomCommands(initialCmds);
      }

      // Initial task seed if empty
      if (savedTasks.length === 0) {
        const seedTask: KanbanTask = {
          id: `task-init-1`,
          title: 'Send me a funny note',
          description: 'Draft a short, witty developer humor note ready for download as a text deliverable.',
          status: 'todo',
          priority: 'medium',
          assignedDotId: 'echo',
          tags: ['humor', 'deliverable', 'note'],
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now(),
        };
        await dbService.saveTask(seedTask);
        setTasks([seedTask]);
      } else {
        setTasks(savedTasks);
      }

      // Seed initial deliverable sample
      const sampleDeliverable: DeliverableFile = {
        id: 'file-sample-1',
        name: 'funny_note.txt',
        path: '/workspace/echo/funny_note.txt',
        content: `Why do programmers prefer dark mode?\nBecause light attracts bugs!\n\n(Generated with love by your Dot, Alfred ☕)`,
        size: 118,
        mimeType: 'text/plain',
        generatedBy: 'echo',
        generatedAt: Date.now() - 1800000,
      };
      setWorkspaceFiles([sampleDeliverable]);
      setActiveDeliverable(sampleDeliverable);
    }

    loadData().catch(console.error);
  }, []);

  // Main task/message execution through the real AI engine
  const handleExecutePrompt = async (promptText: string, targetDotId?: DotId) => {
    const dotId = targetDotId || activeDotId;
    const dot = dots[dotId];

    setIsExecuting(true);
    audioService.playChirp('chirp');

    // Add user message
    const userMsg: SwarmMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
      tokens: Math.ceil(promptText.length / 4),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Update dot status
    setDots((prev) => ({
      ...prev,
      [dotId]: { ...prev[dotId], status: 'executing' },
    }));

    try {
      const result = await AIService.executeAgent({
        task: promptText,
        dotId,
        activeProvider: config.activeProvider,
        providerConfigs: config.providers,
        recentMessages: messages,
      });

      // Update dot stats
      setDots((prev) => ({
        ...prev,
        [dotId]: {
          ...prev[dotId],
          status: 'idle',
          stats: {
            ...prev[dotId].stats,
            tasksCompleted: prev[dotId].stats.tasksCompleted + 1,
            tokensConsumed: prev[dotId].stats.tokensConsumed + result.tokens,
            deliverablesProduced: prev[dotId].stats.deliverablesProduced + 1,
          },
        },
      }));

      // Deliverable file
      const deliverable = result.deliverableFile;

      // Add agent message to chat
      const agentMsg: SwarmMessage = {
        id: `agent-${Date.now()}`,
        agentId: dotId,
        role: 'agent',
        content: result.text,
        timestamp: Date.now(),
        tokens: result.tokens,
        deliverableFile: deliverable,
        codeSnippet: result.codeSnippet,
        codeLang: result.codeLang,
      };
      setMessages((prev) => [...prev, agentMsg]);

      // Add to workspace files and make active on the canvas!
      setWorkspaceFiles((prev) => [
        deliverable,
        ...prev.filter((f) => f.name.toLowerCase() !== deliverable.name.toLowerCase()),
      ]);
      setActiveDeliverable(deliverable);
      setRightView('canvas'); // Automatically focus deliverable canvas on the right!

      // Play audio chirp and optional TTS
      audioService.playChirp('success');
      if (config.ttsEnabled) {
        audioService.speak(result.text, dotId, dot.voiceConfig.pitch, dot.voiceConfig.rate);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      audioService.playChirp('alert');
      setDots((prev) => ({
        ...prev,
        [dotId]: { ...prev[dotId], status: 'idle' },
      }));

      const errorMsg: SwarmMessage = {
        id: `err-${Date.now()}`,
        agentId: dotId,
        role: 'agent',
        content: `Execution failed: ${err.message || 'Error communicating with AI engine'}. Please verify your API configuration.`,
        timestamp: Date.now(),
        tokens: 0,
        error: err.message,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Run a task from the Kanban Board
  const handleRunTaskWithAgent = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    await handleExecutePrompt(`${task.title}. ${task.description}`, task.assignedDotId);

    // Update task to done
    const updated: KanbanTask = {
      ...task,
      status: 'done',
      updatedAt: Date.now(),
    };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    await dbService.saveTask(updated);
  };

  // Save/Update Deliverable File
  const handleSaveFile = (file: DeliverableFile) => {
    setWorkspaceFiles((prev) => [
      file,
      ...prev.filter((f) => f.id !== file.id && f.name.toLowerCase() !== file.name.toLowerCase()),
    ]);
    if (activeDeliverable?.id === file.id || activeDeliverable?.name === file.name) {
      setActiveDeliverable(file);
    }
    audioService.playChirp('terminal');
  };

  // Delete Deliverable File
  const handleDeleteFile = (fileId: string) => {
    setWorkspaceFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeDeliverable?.id === fileId) {
      setActiveDeliverable(workspaceFiles.find((f) => f.id !== fileId) || null);
    }
    audioService.playChirp('terminal');
  };

  // Custom command handlers
  const handleAddCustomCommand = async (cmdData: Omit<CustomTerminalCommand, 'id' | 'createdAt'>) => {
    const newCmd: CustomTerminalCommand = {
      ...cmdData,
      id: `cmd-${Date.now()}`,
      createdAt: Date.now(),
    };
    const updated = [newCmd, ...customCommands.filter((c) => c.name !== newCmd.name)];
    setCustomCommands(updated);
    await dbService.saveCustomCommands(updated);
  };

  const handleDeleteCustomCommand = async (id: string) => {
    const updated = customCommands.filter((c) => c.id !== id);
    setCustomCommands(updated);
    await dbService.saveCustomCommands(updated);
  };

  return (
    <div className="min-h-screen bg-[#f3f2ed] text-zinc-900 flex flex-col font-sans selection:bg-amber-200 selection:text-zinc-900">
      {/* Top Application Bar (macOS / OpenAI Web App Header) */}
      <header className="w-full bg-white border-b border-stone-200 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          {/* macOS traffic light window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
          </div>

          <div className="flex items-center gap-2">
            <DotBlobAvatar dotId={activeDotId} size="sm" />
            <h1 className="font-semibold text-sm tracking-tight text-zinc-900">
              OpenAI Dots Workspace
            </h1>
            <span className="text-[11px] font-mono text-zinc-400">/</span>
            <span className="text-xs text-zinc-600 font-medium">
              {activeDeliverable ? activeDeliverable.name : 'Workspace'}
            </span>
          </div>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-2">
          {/* Active provider pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-mono text-zinc-700">
            <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="uppercase text-[10px] font-semibold">{config.activeProvider}</span>
          </div>

          {/* Settings / API Vault Modal trigger */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-xs font-medium text-zinc-700 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">API Config</span>
          </button>

          {/* Audio TTS Toggle */}
          <button
            onClick={() => {
              const next = !config.ttsEnabled;
              setConfig((c) => ({ ...c, ttsEnabled: next }));
              audioService.setMute(!next);
            }}
            className={`p-1.5 rounded-full border text-xs transition-colors cursor-pointer ${
              config.ttsEnabled
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-stone-200 text-stone-400'
            }`}
            title={config.ttsEnabled ? 'Dot Speech: ON' : 'Dot Speech: MUTED'}
          >
            {config.ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Dual-Pane Window (inspired by OpenAI Dots screenshot!) */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1700px] w-full mx-auto p-2 sm:p-4 gap-3">
        {/* LEFT PANE: The Dot Conversation (420px - 480px width) */}
        <div className="w-full md:w-[460px] lg:w-[480px] h-[520px] md:h-[calc(100vh-80px)] rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden flex flex-col shrink-0">
          <ChatPane
            messages={messages}
            activeDot={dots[activeDotId]}
            dots={dots}
            onSelectDot={setActiveDotId}
            isExecuting={isExecuting}
            onSendMessage={handleExecutePrompt}
            onSelectDeliverable={(file) => {
              setActiveDeliverable(file);
              setRightView('canvas');
            }}
          />
        </div>

        {/* RIGHT PANE: Live Workspace & Deliverables Canvas */}
        <div className="flex-1 h-[600px] md:h-[calc(100vh-80px)] rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          {/* Right Pane Navigation Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-[#faf9f5]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRightView('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  rightView === 'canvas'
                    ? 'bg-white text-zinc-900 shadow-xs border border-stone-200'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Deliverable Canvas</span>
                {activeDeliverable && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
                )}
              </button>

              <button
                onClick={() => setRightView('files')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  rightView === 'files'
                    ? 'bg-white text-zinc-900 shadow-xs border border-stone-200'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Files className="w-3.5 h-3.5 text-blue-600" />
                <span>Workspace Files</span>
                <span className="px-1.5 py-0.2 rounded-full bg-stone-200/80 text-stone-700 text-[10px] font-mono">
                  {workspaceFiles.length}
                </span>
              </button>

              <button
                onClick={() => setRightView('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  rightView === 'terminal'
                    ? 'bg-white text-zinc-900 shadow-xs border border-stone-200'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-600" />
                <span>Terminal & Commands</span>
              </button>

              <button
                onClick={() => setRightView('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  rightView === 'tasks'
                    ? 'bg-white text-zinc-900 shadow-xs border border-stone-200'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Kanban className="w-3.5 h-3.5 text-purple-600" />
                <span>Tasks Kanban</span>
              </button>
            </div>

            {/* Quick Action: Download Active File */}
            {activeDeliverable && (
              <button
                onClick={() => {
                  downloadTextFile(
                    activeDeliverable.name,
                    activeDeliverable.content,
                    activeDeliverable.mimeType || 'text/plain'
                  );
                  audioService.playChirp('success');
                }}
                className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                title={`Download ${activeDeliverable.name}`}
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Download {activeDeliverable.name}</span>
              </button>
            )}
          </div>

          {/* Right Pane Body View */}
          <div className="flex-1 overflow-hidden">
            {/* View 1: Deliverable Canvas (Default) */}
            {rightView === 'canvas' && (
              <DeliverableCanvas
                activeFile={activeDeliverable}
                onSaveFile={handleSaveFile}
                activeDotId={activeDotId}
              />
            )}

            {/* View 2: Workspace Files Explorer */}
            {rightView === 'files' && (
              <div className="h-full overflow-y-auto p-4 bg-[#faf9f5]">
                <WorkspaceFiles
                  files={workspaceFiles}
                  onSaveFile={handleSaveFile}
                  onDeleteFile={handleDeleteFile}
                />
              </div>
            )}

            {/* View 3: Terminal & Commands */}
            {rightView === 'terminal' && (
              <AgentTerminal
                currentDot={activeDotId}
                activeProvider={config.activeProvider}
                workspaceFiles={workspaceFiles}
                onSaveFile={handleSaveFile}
                onDeleteFile={handleDeleteFile}
                customCommands={customCommands}
                onAddCustomCommand={handleAddCustomCommand}
                onDeleteCustomCommand={handleDeleteCustomCommand}
              />
            )}

            {/* View 4: Tasks Kanban */}
            {rightView === 'tasks' && (
              <div className="h-full overflow-y-auto p-4 bg-[#faf9f5]">
                <KanbanBoard
                  tasks={tasks}
                  onAddTask={async (taskData) => {
                    const newTask: KanbanTask = {
                      ...taskData,
                      id: `task-${Date.now()}`,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    await dbService.saveTask(newTask);
                    setTasks((prev) => [newTask, ...prev]);
                  }}
                  onUpdateTaskStatus={async (taskId, newStatus) => {
                    const target = tasks.find((t) => t.id === taskId);
                    if (!target) return;
                    const updated: KanbanTask = { ...target, status: newStatus, updatedAt: Date.now() };
                    await dbService.saveTask(updated);
                    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
                  }}
                  onDeleteTask={async (taskId) => {
                    await dbService.deleteTask(taskId);
                    setTasks((prev) => prev.filter((t) => t.id !== taskId));
                  }}
                  onRunTaskWithAgent={handleRunTaskWithAgent}
                  onSaveTaskOutput={async (taskId, content, fileName) => {
                    const target = tasks.find((t) => t.id === taskId);
                    if (!target) return;
                    const updated: KanbanTask = {
                      ...target,
                      outputContent: content,
                      outputFileName: fileName,
                      updatedAt: Date.now(),
                    };
                    await dbService.saveTask(updated);
                    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Provider Config Modal */}
      <ApiVaultModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSaveConfig={async (newConfig) => {
          setConfig(newConfig);
          await dbService.saveConfig('swarm_settings', newConfig);
        }}
      />
    </div>
  );
}
