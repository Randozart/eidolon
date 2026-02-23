export interface WorldFact {
  id: string;
  key: string;
  value: string;
  isDynamic: boolean; // True if invented by Eidolon
}

export interface Constraint {
  id: string;
  description: string;
}

export interface LogEntry {
  id: string;
  type: 'player' | 'parser' | 'eidolon' | 'system';
  text: string;
  timestamp: number;
  metadata?: string; // For showing reasoning or state changes
}

export interface EidolonResponse {
  mechanicalActions: any[];
  narrativeFacts: any[];
  narrative: string;
  reasoning: string;
}

export interface EngineResponse {
  output: string;
  isFallback: boolean; // True if the engine failed to parse/handle the command
  stateSnapshot?: WorldFact[]; // Optional updated state from engine
}

export interface GameEngine {
  start(): Promise<string> | string;
  execute(command: string): Promise<EngineResponse> | EngineResponse;
  getState(): WorldFact[];
}

// --- A-machine extended types ---

/** Emitted by AaMachineBridge when a status window (top bar or inline) is updated. */
export interface AaWindowUpdate {
  /** 'status-top' = persistent top bar; 'status-inline' = inline block in scroll area. */
  id: 'status-top' | 'status-inline';
  content: string;
}

/** A resource (image, audio, video) embedded in an A-machine story. */
export interface AaResource {
  /** Raw URL from the story: 'file:sound.ogg' for bundled assets, or an external URL. */
  url: string;
  /** Fallback text shown when the resource cannot be rendered. */
  alt: string;
  type: 'image' | 'audio' | 'video' | 'unknown';
}

export interface EidolonModule {
  name: string;
  description: string;
  version: string;
  authorStyle: string;
  facts: WorldFact[];
  constraints: Constraint[];
  intro: string;
  // If 'custom' is set, the app looks for a registered internal engine, otherwise uses simulatedParser
  engineType?: 'simple' | 'z-machine' | 'a-machine';
  binaryData?: Uint8Array; // For actual Z-Machine/Glulx files
  simulatedParser?: Record<string, string>;
}

export enum Tab {
  CONSOLE = 'console',
  CONFIG = 'config',
  DEBUG = 'debug'
}