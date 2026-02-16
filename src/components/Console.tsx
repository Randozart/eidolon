import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Bot, Ghost, User } from 'lucide-react';

interface ConsoleProps {
  logs: LogEntry[];
  input: string;
  setInput: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const Console: React.FC<ConsoleProps> = ({ logs, input, setInput, onSubmit, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-void-900 border border-eidolon-900/50 rounded-lg shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="bg-void-950 p-3 border-b border-eidolon-900 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-eidolon-400" />
        <span className="text-eidolon-400 text-xs font-mono uppercase tracking-widest">Eidolon Terminal</span>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-sm">
        {logs.length === 0 && (
          <div className="text-gray-500 text-center mt-20 italic">
            Initialize simulation...
            <br />
            Waiting for input.
          </div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-3 ${log.type === 'player' ? 'flex-row-reverse' : ''}`}>
            {/* Icon */}
            <div className={`
              w-8 h-8 rounded flex items-center justify-center shrink-0
              ${log.type === 'player' ? 'bg-gray-800 text-white' : ''}
              ${log.type === 'eidolon' ? 'bg-eidolon-950/50 text-eidolon-400 border border-eidolon-800' : ''}
              ${log.type === 'parser' ? 'bg-void-800 text-gray-400 border border-gray-700' : ''}
              ${log.type === 'system' ? 'bg-red-950/30 text-red-400' : ''}
            `}>
              {log.type === 'player' && <User size={16} />}
              {log.type === 'eidolon' && <Ghost size={16} />}
              {log.type === 'parser' && <Terminal size={16} />}
              {log.type === 'system' && <Bot size={16} />}
            </div>

            {/* Content */}
            <div className={`
              max-w-[80%] rounded-md p-3 leading-relaxed whitespace-pre-wrap
              ${log.type === 'player' ? 'bg-gray-800/50 text-gray-100' : ''}
              ${log.type === 'eidolon' ? 'bg-eidolon-950/10 text-eidolon-100 border-l-2 border-eidolon-500' : ''}
              ${log.type === 'parser' ? 'bg-transparent text-gray-300' : ''}
              ${log.type === 'system' ? 'text-xs text-red-400 font-bold' : ''}
            `}>
               {log.text}
               {log.metadata && (
                 <div className="mt-2 pt-2 border-t border-white/10 text-xs text-eidolon-400/70 italic">
                   Running Thought: {log.metadata}
                 </div>
               )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded bg-eidolon-950/50 flex items-center justify-center border border-eidolon-800">
               <Ghost size={16} className="text-eidolon-400" />
            </div>
            <div className="text-eidolon-500 text-xs flex items-center">
              Consulting the machine spirit...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-void-950 p-4 border-t border-eidolon-900/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Enter command..."
            className="w-full bg-void-900 border border-eidolon-900 text-gray-100 font-mono text-sm rounded-md py-3 pl-4 pr-12 focus:outline-none focus:border-eidolon-500 focus:ring-1 focus:ring-eidolon-500 disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            ↵
          </div>
        </div>
      </div>
    </div>
  );
};

export default Console;