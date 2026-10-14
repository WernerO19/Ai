import React, { useState, useRef, useEffect } from 'react';
import { DotId, DotAgent, VirtualFile, CustomTerminalCommand, AIProvider, DeliverableFile } from '../types/swarm';
import { 
  Terminal as TerminalIcon, Play, Trash2, 
  FileText, Plus, X, Download, Copy, Check 
} from 'lucide-react';
import { audioService } from '../services/audio';
import { downloadTextFile } from '../utils/fileDownload';

interface AgentTerminalProps {
  currentDot: DotId;
  activeProvider: AIProvider;
  workspaceFiles: DeliverableFile[];
  onSaveFile: (file: DeliverableFile) => void;
  onDeleteFile: (fileId: string) => void;
  customCommands: CustomTerminalCommand[];
  onAddCustomCommand: (cmd: Omit<CustomTerminalCommand, 'id' | 'createdAt'>) => void;
  onDeleteCustomCommand: (id: string) => void;
}

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  isError?: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({
  currentDot,
  activeProvider,
  workspaceFiles,
  onSaveFile,
  onDeleteFile,
  customCommands,
  onAddCustomCommand,
  onDeleteCustomCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'commands'>('cli');
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'init-1',
      command: 'sysinfo',
      output: `SHEMDOTS AGENT WORKSPACE TERMINAL
Active Node: ${currentDot.toUpperCase()} | AI Provider: ${activeProvider.toUpperCase()} | Mode: Production
Type 'help' to see built-in commands or manage custom commands in the tab above.`,
    },
  ]);
  const [historyList, setHistoryList] = useState<string[]>(['sysinfo']);
  const [navIndex, setNavIndex] = useState(-1);

  // Custom command creation state
  const [isAddingCmd, setIsAddingCmd] = useState(false);
  const [cmdName, setCmdName] = useState('');
  const [cmdDesc, setCmdDesc] = useState('');
  const [cmdOutput, setCmdOutput] = useState('');
  const [cmdCategory, setCmdCategory] = useState<'dev' | 'security' | 'ops' | 'custom'>('custom');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    audioService.playChirp('terminal');
    setHistoryList((prev) => [...prev, trimmed]);
    setNavIndex(-1);

    const parts = trimmed.split(' ');
    const base = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    let output = '';
    let isError = false;

    // Check custom commands
    const customMatch = customCommands.find((c) => c.name.toLowerCase() === base);
    if (customMatch) {
      output = `[CUSTOM COMMAND: ${customMatch.name.toUpperCase()}]\n${customMatch.description}\n---\n${customMatch.outputTemplate}`;
      setHistory((prev) => [...prev, { id: Date.now().toString(), command: trimmed, output, isError: false }]);
      return;
    }

    switch (base) {
      case 'help':
        output = `AVAILABLE SYSTEM & UTILITY COMMANDS:
  ls                     - List all deliverables and files in workspace
  cat <filename>         - View full contents of a file
  download <filename>    - Download file directly to your local computer
  create <file> <text>   - Create a new workspace file with content
  rm <filename>          - Delete a file from the workspace
  date                   - Display current system UTC timestamp
  sysinfo                - Display node engine and provider status
  clear                  - Clear terminal output
  custom                 - Switch to Custom Commands manager

CUSTOM COMMANDS:
${customCommands.length === 0 ? '  (No custom commands yet. Add one in the Custom Commands tab!)' : customCommands.map((c) => `  ${c.name.padEnd(20)} - ${c.description}`).join('\n')}`;
        break;

      case 'clear':
        setHistory([]);
        return;

      case 'date':
        output = new Date().toISOString();
        break;

      case 'sysinfo':
        output = `Host: AI Studio Swarm Agent Workstation
Active Provider: ${activeProvider} (Gemini Live Verified)
Workspace Files Count: ${workspaceFiles.length}
Node: ${currentDot.toUpperCase()}`;
        break;

      case 'ls':
        if (workspaceFiles.length === 0) {
          output = 'Workspace directory is empty. Generate a deliverable in Chat or create a file.';
        } else {
          output = `WORKSPACE DELIVERABLES (${workspaceFiles.length} files):\n` +
            workspaceFiles
              .map((f) => `  ${f.name.padEnd(28)}  ${(f.size + ' B').padStart(10)}  [${f.generatedBy.toUpperCase()}]`)
              .join('\n');
        }
        break;

      case 'cat':
        if (!args) {
          output = 'Usage: cat <filename>\nExample: cat funny_note.txt';
          isError = true;
        } else {
          const file = workspaceFiles.find((f) => f.name.toLowerCase() === args.toLowerCase());
          if (file) {
            output = `--- ${file.name} (${file.size} bytes) ---\n${file.content}`;
          } else {
            output = `File not found: '${args}'. Use 'ls' to see existing files.`;
            isError = true;
          }
        }
        break;

      case 'download':
        if (!args) {
          output = 'Usage: download <filename>\nExample: download funny_note.txt';
          isError = true;
        } else {
          const file = workspaceFiles.find((f) => f.name.toLowerCase() === args.toLowerCase());
          if (file) {
            downloadTextFile(file.name, file.content, file.mimeType || 'text/plain');
            output = `Downloading '${file.name}' to your local computer...`;
          } else {
            output = `File not found: '${args}'. Use 'ls' to view available files.`;
            isError = true;
          }
        }
        break;

      case 'create':
        if (!args) {
          output = 'Usage: create <filename> <content>\nExample: create note.txt Hello world!';
          isError = true;
        } else {
          const spaceIdx = args.indexOf(' ');
          const fName = spaceIdx > -1 ? args.slice(0, spaceIdx) : args;
          const fContent = spaceIdx > -1 ? args.slice(spaceIdx + 1) : '';
          const finalName = fName.includes('.') ? fName : `${fName}.txt`;
          
          const newDeliverable: DeliverableFile = {
            id: `file-${Date.now()}`,
            name: finalName,
            path: `/workspace/${currentDot}/${finalName}`,
            content: fContent,
            size: new Blob([fContent]).size,
            mimeType: 'text/plain',
            generatedBy: currentDot,
            generatedAt: Date.now(),
          };
          onSaveFile(newDeliverable);
          output = `Created file '${finalName}' (${newDeliverable.size} bytes).`;
        }
        break;

      case 'rm':
        if (!args) {
          output = 'Usage: rm <filename>\nExample: rm note.txt';
          isError = true;
        } else {
          const file = workspaceFiles.find((f) => f.name.toLowerCase() === args.toLowerCase());
          if (file) {
            onDeleteFile(file.id);
            output = `Removed file '${file.name}'.`;
          } else {
            output = `File not found: '${args}'.`;
            isError = true;
          }
        }
        break;

      case 'custom':
        setActiveTab('commands');
        output = 'Switched to Custom Commands Manager tab.';
        break;

      default:
        output = `Command not recognized: '${base}'. Type 'help' to view available commands.`;
        isError = true;
        break;
    }

    setHistory((prev) => [...prev, { id: Date.now().toString(), command: trimmed, output, isError }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
      setInputVal('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length === 0) return;
      const nextIndex = navIndex === -1 ? historyList.length - 1 : Math.max(0, navIndex - 1);
      setNavIndex(nextIndex);
      setInputVal(historyList[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (navIndex === -1) return;
      const nextIndex = navIndex + 1;
      if (nextIndex >= historyList.length) {
        setNavIndex(-1);
        setInputVal('');
      } else {
        setNavIndex(nextIndex);
        setInputVal(historyList[nextIndex]);
      }
    }
  };

  const handleCreateCustomCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdName.trim()) return;
    const cleanName = cmdName.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
    onAddCustomCommand({
      name: cleanName,
      description: cmdDesc.trim() || 'Custom terminal command',
      outputTemplate: cmdOutput.trim() || 'Command executed successfully.',
      category: cmdCategory,
    });
    setCmdName('');
    setCmdDesc('');
    setCmdOutput('');
    setIsAddingCmd(false);
    audioService.playChirp('success');
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-slate-100 font-mono text-xs">
      {/* Top Tab Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#070a12]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              activeTab === 'cli'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interactive CLI
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              activeTab === 'commands'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Custom Commands</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-500/30">
              {customCommands.length}
            </span>
          </button>
        </div>

        {activeTab === 'commands' && (
          <button
            onClick={() => setIsAddingCmd(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Command</span>
          </button>
        )}
      </div>

      {/* View 1: Interactive CLI */}
      {activeTab === 'cli' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-3 leading-relaxed">
            {history.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <span>❯</span>
                  <span>{item.command}</span>
                </div>
                <pre
                  className={`pl-4 whitespace-pre-wrap select-text ${
                    item.isError ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {item.output}
                </pre>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Prompt Input Line */}
          <div className="flex items-center gap-2 p-3 border-t border-slate-800/80 bg-[#070a12]">
            <span className="text-cyan-400 font-bold">❯</span>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type command (e.g. ls, cat funny_note.txt, download funny_note.txt, help)..."
              className="flex-1 bg-transparent text-slate-100 text-xs focus:outline-none placeholder-slate-600"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* View 2: Custom Commands Manager */}
      {activeTab === 'commands' && (
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Custom Terminal Commands Registry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define custom commands, scripts, or shortcuts that can be executed directly in the CLI.
                </p>
              </div>
            </div>

            {customCommands.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-slate-800 bg-[#070a12]">
                <p className="text-slate-400">No custom commands yet.</p>
                <button
                  onClick={() => setIsAddingCmd(true)}
                  className="mt-3 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  Create First Command
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-[#0f172a] flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-cyan-400 text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                          {cmd.name}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">
                          [{cmd.category || 'custom'}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">{cmd.description}</p>
                      <pre className="mt-2 p-2 rounded bg-[#070a12] border border-slate-800/80 text-[11px] text-slate-400 whitespace-pre-wrap">
                        {cmd.outputTemplate}
                      </pre>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setActiveTab('cli');
                          executeCommand(cmd.name);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        <span>Run</span>
                      </button>

                      <button
                        onClick={() => {
                          onDeleteCustomCommand(cmd.id);
                          audioService.playChirp('terminal');
                        }}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete this command"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Command Modal */}
      {isAddingCmd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="font-semibold text-slate-100 text-sm">Add Custom Terminal Command</h4>
              <button
                onClick={() => setIsAddingCmd(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomCmd} className="space-y-3 font-sans">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Command Name (e.g. audit_sso, funny_joke, ping_services)
                </label>
                <input
                  type="text"
                  value={cmdName}
                  onChange={(e) => setCmdName(e.target.value)}
                  placeholder="e.g. check_specs"
                  required
                  className="w-full px-3 py-1.5 rounded bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={cmdDesc}
                  onChange={(e) => setCmdDesc(e.target.value)}
                  placeholder="Briefly describe what this command does"
                  className="w-full px-3 py-1.5 rounded bg-[#070a12] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={cmdCategory}
                  onChange={(e) => setCmdCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="custom">Custom</option>
                  <option value="dev">Development</option>
                  <option value="security">Security</option>
                  <option value="ops">Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Output Template / Script Result
                </label>
                <textarea
                  value={cmdOutput}
                  onChange={(e) => setCmdOutput(e.target.value)}
                  rows={4}
                  placeholder="Enter the template or message output when this command runs..."
                  className="w-full p-2.5 rounded bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCmd(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cmdName.trim()}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Save Command
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
