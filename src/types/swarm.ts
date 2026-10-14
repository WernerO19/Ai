export type DotId = 'spark' | 'nova' | 'aura' | 'echo';

export type AgentStatus = 'idle' | 'executing' | 'error';

export interface DotAgent {
  id: DotId;
  callsign: string;
  name: string;
  role: string;
  specialty: string;
  color: string;
  accentColor: string;
  badgeBg: string;
  voiceConfig: {
    pitch: number;
    rate: number;
    preferredVoiceName?: string;
  };
  stats: {
    tasksCompleted: number;
    tokensConsumed: number;
    avgLatencyMs: number;
    deliverablesProduced: number;
  };
  status: AgentStatus;
  currentThought: string;
}

export type MessageRole = 'user' | 'agent' | 'system';

export interface DeliverableFile {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  mimeType: string;
  generatedBy: DotId | 'user';
  generatedAt: number;
  taskId?: string;
}

export interface SwarmMessage {
  id: string;
  agentId?: DotId;
  role: MessageRole;
  content: string;
  timestamp: number;
  tokens: number;
  deliverableFile?: DeliverableFile;
  codeSnippet?: string;
  codeLang?: string;
  isStreaming?: boolean;
  error?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedDotId: DotId;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  deliverableFile?: DeliverableFile;
  outputContent?: string;
  outputFileName?: string;
  isRunning?: boolean;
  error?: string;
}

export interface VirtualProcess {
  pid: number;
  dotId: DotId;
  name: string;
  cpu: number;
  mem: number;
  status: 'running' | 'sleeping' | 'stopped';
}

export interface VirtualFile {
  path: string;
  name: string;
  content: string;
  size: number;
  type: 'file' | 'dir';
  updatedAt: number;
}

export interface TerminalLogEntry {
  id: string;
  timestamp: number;
  dotId: DotId;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  command?: string;
}

export interface UserNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export interface SwarmMetricPoint {
  timestamp: number;
  tokensPerSec: number;
  totalTokens: number;
  activeProcesses: number;
}

export type AIProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'openrouter' 
  | 'deepseek' 
  | 'groq' 
  | 'ollama';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  apiKey: string;
  baseUrl?: string;
  selectedModel: string;
  availableModels: string[];
  enabled: boolean;
  requiresKey: boolean;
}

export interface CustomTerminalCommand {
  id: string;
  name: string;
  description: string;
  outputTemplate: string;
  category?: 'dev' | 'security' | 'ops' | 'custom';
  createdAt: number;
}

export interface SwarmConfig {
  activeProvider: AIProvider;
  providers: Record<AIProvider, ProviderConfig>;
  ttsEnabled: boolean;
  soundEffectsEnabled: boolean;
}
