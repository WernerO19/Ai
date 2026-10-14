import React, { useState, useRef, useEffect } from 'react';
import { SwarmMessage, DotId, DotAgent, AIProvider, DeliverableFile } from '../types/swarm';
import { DotBlobAvatar } from './DotBlobAvatar';
import { 
  Send, Volume2, Download, Copy, Check, Plus, 
  ArrowUp, Sparkles, Mic, FileText, ChevronRight, Phone 
} from 'lucide-react';
import { audioService } from '../services/audio';
import { downloadTextFile } from '../utils/fileDownload';

interface ChatPaneProps {
  messages: SwarmMessage[];
  activeDot: DotAgent;
  dots: Record<DotId, DotAgent>;
  onSelectDot: (id: DotId) => void;
  isExecuting: boolean;
  onSendMessage: (text: string) => void;
  onSelectDeliverable: (file: DeliverableFile) => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  activeDot,
  dots,
  onSelectDot,
  isExecuting,
  onSendMessage,
  onSelectDeliverable,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExecuting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isExecuting) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    audioService.playChirp('chirp');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    audioService.playChirp('chirp');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterChips = [
    'Send me a funny note',
    'Draft a project proposal',
    'Write a Python utility script',
    'Security audit checklist',
  ];

  return (
    <div className="h-full flex flex-col bg-[#fdfdfb] border-r border-stone-200/90 relative">
      {/* Top Header with Dot Profile */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200/80 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <DotBlobAvatar
              dotId={activeDot.id}
              size="md"
              status={isExecuting ? 'executing' : 'idle'}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-900">
                {activeDot.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200">
                {activeDot.callsign}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{isExecuting ? `${activeDot.name} is thinking...` : activeDot.role}</span>
            </div>
          </div>
        </div>

        {/* Switch Dot Selector */}
        <div className="flex items-center gap-1">
          {(Object.keys(dots) as DotId[]).map((id) => (
            <button
              key={id}
              onClick={() => {
                onSelectDot(id);
                audioService.playChirp('chirp');
              }}
              className={`p-1 rounded-xl transition-all ${
                activeDot.id === id
                  ? 'bg-stone-100 ring-2 ring-stone-900/10'
                  : 'opacity-50 hover:opacity-100'
              }`}
              title={`Switch to ${dots[id].name} (${dots[id].role})`}
            >
              <DotBlobAvatar dotId={id} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={scrollRef}
        className="flex-1 p-5 overflow-y-auto space-y-4 font-sans text-xs"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100 mb-4">
              <DotBlobAvatar dotId={activeDot.id} size="lg" />
            </div>
            <h3 className="font-semibold text-base text-zinc-800">
              {activeDot.name} is your dedicated AI Dot
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1 mb-6 leading-relaxed">
              Always-on, ready to handle tasks, draft proposals, write code, or send notes directly to your live deliverable canvas.
            </p>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <span className="text-[11px] font-medium text-zinc-400 text-left px-1">Try asking:</span>
              {starterChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    onSendMessage(chip);
                    audioService.playChirp('chirp');
                  }}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 text-xs text-zinc-700 font-medium transition-all shadow-xs hover:border-stone-300 flex items-center justify-between cursor-pointer"
                >
                  <span>&quot;{chip}&quot;</span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              // User Bubble: Warm apricot/sand like in OpenAI screenshot!
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] bg-[#f8eedd] text-stone-900 rounded-2xl rounded-tr-sm px-4 py-3 shadow-xs">
                    <p className="text-xs sm:text-sm font-sans leading-relaxed select-text whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <span className="block text-right text-[10px] text-stone-400 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            // Dot Bubble: Crisp clean card with actions
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[90%] bg-white border border-stone-200/90 rounded-2xl rounded-tl-sm p-4 text-zinc-800 shadow-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <DotBlobAvatar dotId={msg.agentId || activeDot.id} size="sm" />
                      <span className="font-semibold text-xs text-zinc-900">
                        {dots[msg.agentId || activeDot.id]?.name || 'Dot'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const dot = dots[msg.agentId || activeDot.id];
                          if (dot) {
                            audioService.speak(msg.content, dot.id, dot.voiceConfig.pitch, dot.voiceConfig.rate);
                          }
                        }}
                        className="p-1 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title="Read note aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="text-xs sm:text-sm font-sans text-zinc-800 leading-relaxed whitespace-pre-wrap select-text py-1">
                    {msg.content}
                  </div>

                  {/* Deliverable Action Banner inside message */}
                  {msg.deliverableFile && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                        <div className="overflow-hidden">
                          <span className="block font-mono text-xs font-semibold text-zinc-900 truncate">
                            {msg.deliverableFile.name}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            {msg.deliverableFile.size} bytes • Deliverable Ready
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onSelectDeliverable(msg.deliverableFile!)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-zinc-700 text-xs font-medium transition-colors"
                        >
                          View in Canvas
                        </button>
                        <button
                          onClick={() => {
                            downloadTextFile(
                              msg.deliverableFile!.name,
                              msg.deliverableFile!.content,
                              msg.deliverableFile!.mimeType || 'text/plain'
                            );
                            audioService.playChirp('success');
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
                          title="Download file directly"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isExecuting && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/50 text-amber-800 text-xs max-w-xs animate-pulse">
            <DotBlobAvatar dotId={activeDot.id} size="sm" status="executing" />
            <span className="font-medium">{activeDot.name} is writing your deliverable...</span>
          </div>
        )}
      </div>

      {/* Bottom Message Input Bar */}
      <div className="p-4 border-t border-stone-200/80 bg-white">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message or directive to your Dot..."
            disabled={isExecuting}
            className="w-full pl-4 pr-12 py-3 rounded-full bg-[#f4f3ee] text-zinc-900 text-xs sm:text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 border border-transparent focus:border-stone-300 transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isExecuting}
            className="absolute right-2 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer shadow-xs"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
