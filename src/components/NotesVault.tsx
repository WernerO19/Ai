import React, { useState } from 'react';
import { UserNote } from '../types/swarm';
import { 
  FileEdit, Plus, Trash2, Tag, Eye, Code, 
  Save, Check, Sparkles, BookOpen, Download 
} from 'lucide-react';
import { audioService } from '../services/audio';
import { downloadTextFile, sanitizeFilename } from '../utils/fileDownload';

interface NotesVaultProps {
  notes: UserNote[];
  onSaveNote: (note: UserNote) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesVault: React.FC<NotesVaultProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [editTitle, setEditTitle] = useState(notes[0]?.title || '');
  const [editContent, setEditContent] = useState(notes[0]?.content || '');
  const [editTags, setEditTags] = useState(notes[0]?.tags.join(', ') || '');
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeNote = notes.find(n => n.id === selectedNoteId);

  const handleSelectNote = (n: UserNote) => {
    setSelectedNoteId(n.id);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditTags(n.tags.join(', '));
  };

  const handleCreateNew = () => {
    const newNote: UserNote = {
      id: Date.now().toString(),
      title: 'New Swarm Directive Note',
      content: `# Swarm Directive Specifications
- Author: Commander
- Target: Autonomous Nodes
- Date: ${new Date().toLocaleDateString()}

## Objective
Write your notes, architectural requirements, or deployment specs here...`,
      tags: ['specs', 'swarm'],
      updatedAt: Date.now(),
    };

    onSaveNote(newNote);
    handleSelectNote(newNote);
    audioService.playChirp('success');
  };

  const handleSave = () => {
    if (!selectedNoteId) return;

    const updated: UserNote = {
      id: selectedNoteId,
      title: editTitle.trim() || 'Untitled Note',
      content: editContent,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: Date.now(),
    };

    onSaveNote(updated);
    audioService.playChirp('terminal');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
      {/* Sidebar: Notes List */}
      <div className="w-full md:w-64 p-3 flex flex-col bg-slate-950/40">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Notes Vault
            </h3>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
            title="Create New Note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No notes yet. Click + to create one.
            </div>
          ) : (
            notes.map((n) => {
              const isSelected = n.id === selectedNoteId;
              return (
                <button
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-200'
                      : 'hover:bg-slate-900/80 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs truncate">{n.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                    <span>{n.tags.slice(0, 2).map(t => `#${t}`).join(' ')}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 flex flex-col bg-slate-950/80 p-4 overflow-hidden">
        {selectedNoteId ? (
          <>
            {/* Header / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note Title..."
                className="bg-transparent font-bold text-slate-100 text-base focus:outline-none focus:border-b border-cyan-500/50 pb-0.5 flex-1 min-w-[200px]"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                    showPreview
                      ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showPreview ? 'Editor' : 'Preview'}</span>
                </button>

                <button
                  onClick={() => {
                    const filename = sanitizeFilename(editTitle || 'note', 'md');
                    downloadTextFile(filename, editContent);
                    audioService.playChirp('terminal');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition-colors"
                  title="Download note as .md file to your computer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download File</span>
                </button>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteNote(selectedNoteId)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-700/60 transition-colors"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tags Input */}
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Tags (e.g. security, api, release)"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/50 w-full max-w-sm"
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {showPreview ? (
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans p-2">
                  {editContent}
                </div>
              ) : (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Markdown content..."
                  className="w-full h-full bg-transparent text-slate-200 text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder-slate-600"
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Select a note or create one to start writing.
          </div>
        )}
      </div>
    </div>
  );
};
