import React, { useState } from 'react';
import { DeliverableFile, DotId } from '../types/swarm';
import { 
  Download, FileText, Code2, FileCode, FileSpreadsheet, 
  Trash2, Copy, Check, Eye, Plus, Search, ExternalLink, RefreshCw 
} from 'lucide-react';
import { downloadTextFile } from '../utils/fileDownload';
import { audioService } from '../services/audio';

interface WorkspaceFilesProps {
  files: DeliverableFile[];
  onSaveFile: (file: DeliverableFile) => void;
  onDeleteFile: (fileId: string) => void;
}

export const WorkspaceFiles: React.FC<WorkspaceFilesProps> = ({
  files,
  onSaveFile,
  onDeleteFile,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<DeliverableFile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileAuthor, setNewFileAuthor] = useState<DotId | 'user'>('user');

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.generatedBy.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
      case 'ts':
      case 'js':
        return <FileCode className="w-5 h-5 text-cyan-400" />;
      case 'json':
        return <Code2 className="w-5 h-5 text-amber-400" />;
      case 'md':
        return <FileSpreadsheet className="w-5 h-5 text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handleCopy = (file: DeliverableFile) => {
    navigator.clipboard.writeText(file.content);
    setCopiedId(file.id);
    audioService.playChirp('chirp');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (file: DeliverableFile) => {
    downloadTextFile(file.name, file.content, file.mimeType || 'text/plain');
    audioService.playChirp('success');
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.includes('.') ? newFileName : `${newFileName}.txt`;
    const newFile: DeliverableFile = {
      id: `file-${Date.now()}`,
      name,
      path: `/workspace/${newFileAuthor}/${name}`,
      content: newFileContent,
      size: new Blob([newFileContent]).size,
      mimeType: 'text/plain',
      generatedBy: newFileAuthor,
      generatedAt: Date.now(),
    };
    onSaveFile(newFile);
    setIsCreatingNew(false);
    setNewFileName('');
    setNewFileContent('');
    audioService.playChirp('success');
  };

  const handleSaveEdit = () => {
    if (!selectedFile) return;
    const updated: DeliverableFile = {
      ...selectedFile,
      name: editName.trim() || selectedFile.name,
      content: editContent,
      size: new Blob([editContent]).size,
    };
    onSaveFile(updated);
    setSelectedFile(updated);
    setIsEditing(false);
    audioService.playChirp('success');
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0f172a] border border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Workspace Deliverables & Files
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Every task deliverable and agent output is automatically saved here. Download any file directly with 1 click.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deliverables..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#070a12] border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52"
            />
          </div>

          <button
            onClick={() => {
              setIsCreatingNew(true);
              audioService.playChirp('chirp');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create File</span>
          </button>
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#0c1220] border border-slate-800/80 flex flex-col items-center justify-center">
          <FileText className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-medium text-slate-300">No deliverables yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Dispatch a task in the Agent Hub or Kanban Board (e.g., &quot;Send me a funny note&quot;) to have an agent produce real downloadable deliverables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFiles.map((file) => {
            const authorBadges = {
              spark: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
              nova: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
              aura: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              echo: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              user: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
            }[file.generatedBy] || 'bg-slate-800 text-slate-300 border-slate-700';

            return (
              <div
                key={file.id}
                className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 rounded-lg bg-[#070a12] border border-slate-800 shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-mono text-sm font-semibold text-slate-200 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{file.size} bytes</span>
                          <span>•</span>
                          <span>{new Date(file.generatedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase shrink-0 ${authorBadges}`}>
                      {file.generatedBy}
                    </span>
                  </div>

                  {/* Preview snippet */}
                  <div className="my-2.5 p-2.5 rounded-lg bg-[#070a12] border border-slate-800/80 font-mono text-xs text-slate-300 line-clamp-3 select-text whitespace-pre-wrap leading-relaxed">
                    {file.content || '<empty file>'}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800/80 mt-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-medium text-xs transition-colors cursor-pointer"
                    title="Download file to computer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedFile(file);
                        setEditName(file.name);
                        setEditContent(file.content);
                        setIsEditing(false);
                        audioService.playChirp('chirp');
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Inspect / Edit"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopy(file)}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Copy content"
                    >
                      {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => {
                        onDeleteFile(file.id);
                        audioService.playChirp('terminal');
                      }}
                      className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View & Edit Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0b0f19]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="font-mono text-sm bg-[#070a12] border border-slate-700 px-2 py-0.5 rounded text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                ) : (
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {selectedFile.name}
                  </span>
                )}
                <span className="text-xs text-slate-500 font-mono">
                  ({selectedFile.size} bytes)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-80 p-3 rounded-lg bg-[#070a12] border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
                />
              ) : (
                <pre className="p-4 rounded-lg bg-[#070a12] border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed overflow-x-auto">
                  {selectedFile.content}
                </pre>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0b0f19] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Generated by {selectedFile.generatedBy} on {new Date(selectedFile.generatedAt).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 rounded bg-cyan-600 text-slate-950 font-medium text-xs hover:bg-cyan-500 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    Edit Content
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New File Modal */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0b0f19]">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Create New Workspace File
              </h3>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  File Name (e.g. funny_note.txt, script.py)
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. funny_note.txt"
                  className="w-full px-3 py-2 rounded-lg bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Author / Assigned Node
                </label>
                <select
                  value={newFileAuthor}
                  onChange={(e) => setNewFileAuthor(e.target.value as DotId | 'user')}
                  className="w-full px-3 py-2 rounded-lg bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="user">User (Manual)</option>
                  <option value="spark">Spark [ARCH-01]</option>
                  <option value="nova">Nova [SEC-02]</option>
                  <option value="aura">Aura [QA-03]</option>
                  <option value="echo">Echo [DOC-04]</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  File Content
                </label>
                <textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  rows={6}
                  placeholder="Type or paste file text here..."
                  className="w-full p-3 rounded-lg bg-[#070a12] border border-slate-700 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#0b0f19] flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
                className="px-4 py-1.5 rounded bg-cyan-600 text-slate-950 font-medium text-xs hover:bg-cyan-500 disabled:opacity-40 cursor-pointer"
              >
                Save File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
