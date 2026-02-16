import React, { useState, useEffect } from 'react';
import Console from './components/Console';
import ConfigPanel from './components/ConfigPanel';
import type { WorldFact, Constraint, LogEntry, EidolonModule, GameEngine } from './types';
import { queryEidolon } from './services/geminiService';
import { Ghost, AlertTriangle } from 'lucide-react';
import { DialogBridge } from './engines/DialogBridge';

// Default module — story.z8 is served from /public
const STORY_MODULE: EidolonModule = {
  name: "Story",
  description: "Interactive fiction story (Z-Machine).",
  version: "1.0",
  engineType: "z-machine",
  intro: "",
  authorStyle: "Standard Interactive Fiction. Terse, descriptive, second-person, neutral tone.",
  facts: [],
  constraints: [],
};

export default function App() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration State
  const [activeModule, setActiveModule] = useState<EidolonModule>(STORY_MODULE);
  const [facts, setFacts] = useState<WorldFact[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [authorStyle, setAuthorStyle] = useState<string>("");
  
  // Engine State
  const engineRef = React.useRef<GameEngine | null>(null);

  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setApiKeyMissing(true);
    }
    fetch('/story.z8')
      .then(res => res.arrayBuffer())
      .then(buf => handleLoadModule({ ...STORY_MODULE, binaryData: new Uint8Array(buf) }));
  }, []);

  const handleLoadModule = async (module: EidolonModule) => {
    setActiveModule(module);
    setAuthorStyle(module.authorStyle);
    setConstraints(module.constraints.map((c, i) => ({ ...c, id: c.id || `constraint-${i}` })));
    setFacts(module.facts.map((f, i) => ({ ...f, id: f.id || `fact-${i}` })));

    let initLogText = module.intro;

    // Initialize Engine
    if (module.engineType === 'z-machine' && module.binaryData) {
       engineRef.current = new DialogBridge(module.binaryData);
       const startText = await engineRef.current.start();
       initLogText = module.intro ? `${module.intro}\n\n${startText}` : startText;
    } else {
       engineRef.current = null; // Use simulated parser in module data
       initLogText = `[MODULE LOADED: ${module.name}]\n${module.intro}`;
    }

    setLogs([{
        id: 'init',
        type: 'parser',
        text: initLogText,
        timestamp: Date.now()
    }]);
  };

  const handleCommand = async () => {
    if (!input.trim()) return;
    if (apiKeyMissing) {
        alert("API Key is missing. Check logs or environment variables.");
        return;
    }

    const command = input.trim();
    setInput('');
    
    const playerLog: LogEntry = {
      id: Date.now().toString(),
      type: 'player',
      text: command,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, playerLog]);

    let parserResponse: string | null = null;
    let isFallback = true;
    let newFactsFromEngine: WorldFact[] = [];
    let llmReasoning: string | undefined;

    setIsLoading(true);

    try {
      if (engineRef.current) {
        const engineResult = await engineRef.current.execute(command);
        parserResponse = engineResult.output;
        isFallback = engineResult.isFallback;
        if (engineResult.stateSnapshot && engineResult.stateSnapshot.length > 0) {
          newFactsFromEngine = engineResult.stateSnapshot;
        }
      } else {
        // Fallback for modules with a static simulated parser dictionary.
        const lowerCmd = command.toLowerCase();
        const simulatedParser = activeModule.simulatedParser || {};
        if (simulatedParser[lowerCmd]) {
          parserResponse = simulatedParser[lowerCmd];
          isFallback = false;
        }
      }

      if (!isFallback && parserResponse !== null) {
        setLogs(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'parser',
          text: parserResponse,
          timestamp: Date.now()
        }]);
        if (newFactsFromEngine.length > 0) {
          setFacts(prev => {
            const dynamicFacts = prev.filter(f => f.isDynamic);
            return [...newFactsFromEngine, ...dynamicFacts];
          });
        }

      } else {
        // EIDOLON FALLBACK: parser did not handle the command.
        const history = logs.map(l => `${l.type.toUpperCase()}: ${l.text}`);
        const currentFactsForLLM = newFactsFromEngine.length > 0 ? newFactsFromEngine : facts;
        const llmResponse = await queryEidolon(command, history, currentFactsForLLM, constraints, authorStyle);

        parserResponse = llmResponse.narrative;
        const mechanicalActions = llmResponse.mechanicalActions || [];
        const narrativeFacts = llmResponse.narrativeFacts || [];
        llmReasoning = llmResponse.reasoning;

        for (const action of mechanicalActions) {
            if (engineRef.current) {
                await engineRef.current.execute(action);
            }
        }
        const eidolonLog: LogEntry = {
          id: (Date.now() + 2).toString(),
          type: 'eidolon',
          text: parserResponse,
          metadata: llmReasoning,
          timestamp: Date.now()
        };
        setLogs(prev => [...prev, eidolonLog]);

        // Inject invented facts back into the running game via eidolon_note.
        if (narrativeFacts.length > 0 && engineRef.current) {
            const injectedFacts: WorldFact[] = [];

            for (const fact of narrativeFacts) {
                const cmd = `eidolon_note ${fact.object} ${fact.value}`;
                await engineRef.current.execute(cmd);

                injectedFacts.push({
                    id: `llm-${Date.now()}-${fact.object}`,
                    key: `tag:${fact.object}`,
                    value: fact.value,
                    isDynamic: true
                });
            }

            setFacts(prev => [...prev, ...injectedFacts]);
        }

      }

    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        text: "Error contacting Eidolon core.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (apiKeyMissing) {
      return (
        <div className="flex items-center justify-center h-screen bg-black text-white p-4">
            <div className="max-w-md text-center space-y-4 border border-red-900 bg-red-950/20 p-8 rounded-lg">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                <h1 className="text-xl font-bold font-mono">API Key Missing</h1>
                <p className="text-gray-400">The Eidolon engine requires a valid Gemini API key to function. Please set <code className="text-red-300">VITE_GEMINI_API_KEY</code> in your .env file.</p>            </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-gray-200 font-sans">
      {/* Sidebar: Configuration */}
      <div className="w-1/3 min-w-[320px] max-w-[450px] flex flex-col h-full bg-void-900 border-r border-eidolon-900/30">
        <div className="p-4 border-b border-eidolon-900/30 flex items-center gap-2 bg-void-950">
          <Ghost className="text-eidolon-400" />
          <h1 className="font-mono text-lg font-bold tracking-wider text-eidolon-100">EIDOLON</h1>
          <span className="text-[10px] text-eidolon-600 bg-eidolon-950 px-1 rounded border border-eidolon-900 ml-auto">DEV_BUILD</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConfigPanel 
            facts={facts} 
            setFacts={setFacts}
            constraints={constraints}
            setConstraints={setConstraints}
            authorStyle={authorStyle}
            setAuthorStyle={setAuthorStyle}
            onLoadModule={handleLoadModule}
          />
        </div>
      </div>

      {/* Main: Game Console */}
      <div className="flex-1 h-full p-4 bg-void-950 flex flex-col justify-center items-center relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 50% 50%, #14b8a6 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
             }} 
        />
        <div className="w-full max-w-4xl h-full max-h-[90vh] z-10">
          <Console 
            logs={logs}
            input={input}
            setInput={setInput}
            onSubmit={handleCommand}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}