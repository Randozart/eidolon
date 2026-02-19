import React, { useState, useRef } from 'react';
import { WorldFact, Constraint, EidolonModule } from '../types';
import { Plus, Trash2, Wand2, Lock, Globe, Feather, Info, Package, FileCode, BookOpen, Play } from 'lucide-react';
import { analyzeAuthorStyle } from '../services/geminiService';

interface PresetEntry {
  id: string;
  name: string;
  description: string;
  url: string;
  authorStyle: string;
}

const PRESET_LIBRARY: PresetEntry[] = [
  {
    id: 'cloak-of-darkness',
    name: 'Cloak of Darkness',
    description: 'A short demonstration adventure by Roger Firth. The canonical "Hello World" of Interactive Fiction.',
    url: '/CloakOfDarkness.z8',
    authorStyle: 'Standard Interactive Fiction. Terse, descriptive, second-person, neutral tone.',
  },
];

interface ConfigPanelProps {
  facts: WorldFact[];
  setFacts: React.Dispatch<React.SetStateAction<WorldFact[]>>;
  constraints: Constraint[];
  setConstraints: React.Dispatch<React.SetStateAction<Constraint[]>>;
  authorStyle: string;
  setAuthorStyle: (s: string) => void;
  onLoadModule: (module: EidolonModule) => void;
  runtimeApiKey?: string;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  facts,
  setFacts,
  constraints,
  setConstraints,
  authorStyle,
  setAuthorStyle,
  onLoadModule,
  runtimeApiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'facts' | 'constraints' | 'style' | 'modules'>('facts');
  const [newFactKey, setNewFactKey] = useState('');
  const [newFactValue, setNewFactValue] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  /* const jsonInputRef = useRef<HTMLInputElement>(null); */
  const zCodeInputRef = useRef<HTMLInputElement>(null);

  const addFact = () => {
    if (!newFactKey.trim() || !newFactValue.trim()) return;
    setFacts(prev => [...prev, {
      id: Date.now().toString(),
      key: newFactKey,
      value: newFactValue,
      isDynamic: false
    }]);
    setNewFactKey('');
    setNewFactValue('');
  };

  const removeFact = (id: string) => {
    setFacts(prev => prev.filter(f => f.id !== id));
  };

  const addConstraint = () => {
    if (!newConstraint.trim()) return;
    setConstraints(prev => [...prev, {
      id: Date.now().toString(),
      description: newConstraint
    }]);
    setNewConstraint('');
  };

  const removeConstraint = (id: string) => {
    setConstraints(prev => prev.filter(c => c.id !== id));
  };

  const handleAnalyzeStyle = async () => {
    setIsAnalyzing(true);
    const style = await analyzeAuthorStyle(sampleText, runtimeApiKey);
    setAuthorStyle(style);
    setIsAnalyzing(false);
  };

  const handleLoadPreset = async (preset: PresetEntry) => {
    setLoadingPreset(preset.id);
    try {
      const res = await fetch(preset.url);
      const buf = await res.arrayBuffer();
      const module: EidolonModule = {
        name: preset.name,
        description: preset.description,
        version: '1.0',
        authorStyle: preset.authorStyle,
        facts: [],
        constraints: [],
        intro: '',
        engineType: 'z-machine',
        binaryData: new Uint8Array(buf),
      };
      onLoadModule(module);
    } catch (err) {
      console.error('Failed to load preset:', err);
    } finally {
      setLoadingPreset(null);
    }
  };

  /* const handleExport = () => {
    const moduleData: EidolonModule = {
      name: "Exported Session",
      description: "Snapshot of current Eidolon configuration.",
      version: "1.0",
      authorStyle,
      facts,
      constraints,
      intro: "Session restored.",
      simulatedParser: {}
    };
    const blob = new Blob([JSON.stringify(moduleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eidolon-module-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }; */

  /* const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.facts && json.constraints && json.authorStyle) {
           onLoadModule(json as EidolonModule);
        } else {
           alert("Invalid module format: Missing required fields (facts, constraints, authorStyle).");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }; */

  const handleZCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            const buffer = event.target.result as ArrayBuffer;
            const uint8 = new Uint8Array(buffer);
            
            // Create a pseudo-module wrapping this binary
            const zModule: EidolonModule = {
                name: file.name,
                description: "Loaded from binary file.",
                version: "1.0",
                authorStyle: "Unknown. Please configure or analyze style.",
                facts: [],
                constraints: [],
                intro: `[Loaded Binary: ${file.name}]`,
                engineType: 'z-machine',
                binaryData: uint8
            };
            onLoadModule(zModule);
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-void-900 border-r border-eidolon-900/30">
      
      {/* Tabs */}
      <div className="flex border-b border-eidolon-900/30">
        <button
          onClick={() => setActiveTab('modules')}
          className={`p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'modules' ? 'text-eidolon-400 border-b-2 border-eidolon-400 bg-eidolon-950/20' : 'text-gray-500 hover:text-gray-300'}`}
          title="Modules"
        >
          <Package size={16} />
        </button>
        <button
          onClick={() => setActiveTab('facts')}
          className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'facts' ? 'text-eidolon-400 border-b-2 border-eidolon-400 bg-eidolon-950/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Globe size={14} /> World
        </button>
        <button
          onClick={() => setActiveTab('constraints')}
          className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'constraints' ? 'text-eidolon-400 border-b-2 border-eidolon-400 bg-eidolon-950/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Lock size={14} /> Rules
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'style' ? 'text-eidolon-400 border-b-2 border-eidolon-400 bg-eidolon-950/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Feather size={14} /> Voice
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* MODULES TAB */}
        {activeTab === 'modules' && (
           <div className="space-y-6">
             <div className="p-3 bg-blue-950/20 rounded border border-blue-900/50 text-xs text-blue-300 flex items-start gap-2">
              <Package size={14} className="mt-0.5 shrink-0" />
              <p>Load prewritten adventures (Modules) or save your current configuration.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
               {/* Z-CODE IMPORT */}
               <div className="bg-void-950 p-4 rounded border border-purple-900/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-purple-200 font-bold text-sm">
                    <FileCode size={16} /> Import Story File
                  </div>
                  <p className="text-xs text-gray-500">Load a compiled Dialog story file (.z5, .z8).</p>
                  <button
                    onClick={() => zCodeInputRef.current?.click()}
                    className="bg-purple-800 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Select Story File
                  </button>
                  <input type="file" accept=".z5,.z8,.ulx" ref={zCodeInputRef} className="hidden" onChange={handleZCodeUpload} />
               </div>

               {/* PRESET LIBRARY */}
               <div className="bg-void-950 p-4 rounded border border-eidolon-900/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-eidolon-200 font-bold text-sm">
                    <BookOpen size={16} /> Story Library
                  </div>
                  <p className="text-xs text-gray-500">Preset adventure modules ready to play.</p>
                  <div className="flex flex-col gap-2">
                    {PRESET_LIBRARY.map(preset => (
                      <div key={preset.id} className="flex items-start justify-between gap-3 p-3 bg-void-900 rounded border border-gray-800">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-eidolon-200">{preset.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{preset.description}</div>
                        </div>
                        <button
                          onClick={() => handleLoadPreset(preset)}
                          disabled={loadingPreset === preset.id}
                          className="shrink-0 bg-eidolon-700 hover:bg-eidolon-600 disabled:bg-gray-700 text-white py-1.5 px-3 rounded text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Play size={11} />
                          {loadingPreset === preset.id ? 'Loading…' : 'Load'}
                        </button>
                      </div>
                    ))}
                  </div>
               </div>

               {/* JSON IMPORT — disabled for initial release
               <div className="bg-void-950 p-4 rounded border border-eidolon-900/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-eidolon-200 font-bold text-sm">
                    Import JSON Module
                  </div>
                  <p className="text-xs text-gray-500">Load a .json file containing world facts, constraints, and simulation data.</p>
               </div>
               */}

               {/* EXPORT — disabled for initial release
               <div className="bg-void-950 p-4 rounded border border-eidolon-900/50 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-eidolon-200 font-bold text-sm">
                    Export Configuration
                  </div>
                  <p className="text-xs text-gray-500">Save the current World Facts, Constraints, and Style to a JSON file.</p>
               </div>
               */}
            </div>
           </div>
        )}
        
        {/* FACTS TAB */}
        {activeTab === 'facts' && (
          <div className="space-y-4">
            <div className="p-3 bg-eidolon-950/20 rounded border border-eidolon-900/50 text-xs text-eidolon-300 flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>Define the static truth of the world. Eidolon will use these facts to ground its hallucinations. New facts invented by the AI will appear here.</p>
            </div>

            <div className="space-y-2">
              {facts.map(fact => (
                <div key={fact.id} className={`p-2 rounded border flex justify-between items-center ${fact.isDynamic ? 'bg-purple-900/20 border-purple-800/50' : 'bg-void-800 border-gray-700'}`}>
                  <div className="overflow-hidden">
                    <div className={`text-xs font-mono font-bold ${fact.isDynamic ? 'text-purple-300' : 'text-eidolon-300'}`}>{fact.key}</div>
                    <div className="text-sm text-gray-300 truncate">{fact.value}</div>
                  </div>
                  <button onClick={() => removeFact(fact.id)} className="text-gray-600 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-800 grid gap-2">
              <input
                placeholder="Key (e.g. 'Room Description')"
                className="bg-void-950 border border-gray-700 rounded p-2 text-sm text-white focus:border-eidolon-500 outline-none"
                value={newFactKey}
                onChange={(e) => setNewFactKey(e.target.value)}
              />
              <textarea
                placeholder="Value (e.g. 'A damp cellar with stone walls.')"
                className="bg-void-950 border border-gray-700 rounded p-2 text-sm text-white focus:border-eidolon-500 outline-none h-20 resize-none"
                value={newFactValue}
                onChange={(e) => setNewFactValue(e.target.value)}
              />
              <button
                onClick={addFact}
                className="bg-eidolon-700 hover:bg-eidolon-600 text-white rounded py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Fact
              </button>
            </div>
          </div>
        )}

        {/* CONSTRAINTS TAB */}
        {activeTab === 'constraints' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-950/20 rounded border border-red-900/50 text-xs text-red-300 flex items-start gap-2">
              <Lock size={14} className="mt-0.5 shrink-0" />
              <p>Hard boundaries. Eidolon is forbidden from violating these rules, even if trying to be creative.</p>
            </div>

            <div className="space-y-2">
              {constraints.map(c => (
                <div key={c.id} className="p-2 rounded bg-void-800 border border-gray-700 flex justify-between items-center">
                  <span className="text-sm text-gray-300">{c.description}</span>
                  <button onClick={() => removeConstraint(c.id)} className="text-gray-600 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-800 flex gap-2">
              <input
                placeholder="Ex: The player cannot fly."
                className="flex-1 bg-void-950 border border-gray-700 rounded p-2 text-sm text-white focus:border-eidolon-500 outline-none"
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addConstraint()}
              />
              <button
                onClick={addConstraint}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-4">
             <div className="p-3 bg-eidolon-950/20 rounded border border-eidolon-900/50 text-xs text-eidolon-300 flex items-start gap-2">
              <Wand2 size={14} className="mt-0.5 shrink-0" />
              <p>Describe the author's voice manually, or paste a sample text to have the AI extract the style.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Current Voice Instruction</label>
              <textarea
                value={authorStyle}
                onChange={(e) => setAuthorStyle(e.target.value)}
                className="w-full h-32 bg-void-950 border border-eidolon-800 rounded p-3 text-sm text-eidolon-100 focus:outline-none focus:ring-1 focus:ring-eidolon-500"
              />
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Analyze from Sample</label>
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="Paste a paragraph of your game's writing here..."
                className="w-full h-24 bg-void-950 border border-gray-700 rounded p-2 text-sm text-gray-400 focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={handleAnalyzeStyle}
                disabled={isAnalyzing || !sampleText}
                className="w-full bg-eidolon-700 disabled:bg-gray-800 hover:bg-eidolon-600 text-white rounded py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>Analyzing...</>
                ) : (
                  <><Wand2 size={14} /> Extract Style</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;