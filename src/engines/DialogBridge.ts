import * as emglken from 'emglken';
import { GameEngine, EngineResponse, WorldFact } from "../types";

export class DialogBridge implements GameEngine {
  private vm: any = null;
  private binary: Uint8Array;
  private isLoaded: boolean = false;
  private outputBuffer: string[] = [];
  private currentGen: number = 0;
  private waitingWindow: number = 0;

  constructor(binary: Uint8Array) {
    this.binary = binary;
    this.initializeVM();
  }

  private async initializeVM() {
    try {
      const emglkenAny = emglken as any;
      const BocfelFactory = emglkenAny.Bocfel || emglkenAny.default?.Bocfel;
      
      if (!BocfelFactory) throw new Error("Bocfel engine not found.");

      console.log("[Bridge] Instantiating WASM...");

      const storyFileName = "story.z8";

      this.vm = await BocfelFactory({
        locateFile: (path: string) => path.endsWith('.wasm') ? '/bocfel.wasm' : path
      });

      const options = {
        Dialog: {
          async: true,
          // The Rust layer expects an object with a 'storyfile' key from both get_dirs and set_storyfile_dir.
          get_dirs: () => ({ storyfile: "/", system_cwd: "/", temp: "/", working: "/" }),
          set_storyfile_dir: (path: string) => ({ storyfile: path, working: path }),
          read: (path: string) => {
             console.log(`[FS_READ] "${path}"`);
             if (path === storyFileName || path.endsWith("/" + storyFileName)) {
                 return Promise.resolve(this.binary);
             }
             return Promise.resolve(null);
          },
          write: () => Promise.resolve(),
          delete: () => Promise.resolve(),
          exists: (path: string) => {
              if (path === storyFileName || path.endsWith("/" + storyFileName)) return Promise.resolve(true);
              return Promise.resolve(false);
          },
        },
        GlkOte: {
          init: (opts: any) => {
             console.log("[GlkOte] Handshake.");
             if (opts && opts.accept) {
                // Bind accept for input handling
                (this.vm as any).accept = opts.accept;

                // Send init event to wake up the engine
                opts.accept({
                    type: 'init',
                    gen: 0,
                    metrics: { width: 80, height: 24 },
                    support: ['timer', 'hyperlinks']
                });
             }
          },
          update: (data: any) => this.handleGlkUpdate(data),
        },
        // argv[1] is the story filename — Bocfel reads this and passes it to set_storyfile_dir().
        arguments: [storyFileName],
      };

      if (typeof this.vm.start === 'function') {
        this.vm.start(options);
        this.isLoaded = true;
      }

    } catch (e) {
      console.error("[Bridge] Error:", e);
      this.isLoaded = false;
    }
  }

  private handleGlkUpdate(data: any) {
    if (data?.gen !== undefined) this.currentGen = data.gen;
    if (data?.input?.length > 0) {
      const lineInput = data.input.find((i: any) => i.type === 'line');
      if (lineInput?.id !== undefined) this.waitingWindow = lineInput.id;
    }
    if (!data || !data.content) return;

    data.content.forEach((win: any) => {
      if (win.text) {
        win.text.forEach((line: any) => {
          if (line.content) {
            const textSegment = line.content
              .map((c: any) => (typeof c === 'string' ? c : (c.text || "")))
              .join("");
            
            if (textSegment) this.outputBuffer.push(textSegment);
          }
        });
      }
    });
  }

  public async start(): Promise<string> {
    // Wait for the engine to boot and produce text
    for (let i = 0; i < 50; i++) {
        if (this.isLoaded && this.outputBuffer.length > 0) break;
        await new Promise(r => setTimeout(r, 100));
    }
    return this.flushOutput();
  }

  public async execute(command: string): Promise<EngineResponse> {
    if (!this.isLoaded) return { output: "System Offline.", isFallback: true };

    this.outputBuffer = [];
    
    if ((this.vm as any).accept) {
        (this.vm as any).accept({
            type: 'line',
            gen: this.currentGen,
            window: this.waitingWindow,
            value: command.toLowerCase().trim()
        });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const rawOutput = this.flushOutput();

    const stateRegex = /\[EIDOLON_STATE\]([\s\S]*?)\[\/EIDOLON_STATE\]/;
    const stateMatch = rawOutput.match(stateRegex);
    let currentSnapshot: WorldFact[] = [];
    if (stateMatch) {
        currentSnapshot = this.parseStateJson(stateMatch[1]);
    }

    const fallbackRegex = /\[EIDOLON_FALLBACK\]([\s\S]*?)\[\/EIDOLON_FALLBACK\]/;
    const fallbackMatch = rawOutput.match(fallbackRegex);

    if (fallbackMatch) {
        return {
            output: "",
            isFallback: true,
            stateSnapshot: this.parseStateJson(fallbackMatch[1])
        };
    }

    const cleanOutput = rawOutput.replace(stateRegex, "").trim();

    return {
        output: cleanOutput,
        isFallback: false,
        stateSnapshot: currentSnapshot
    };
  }

  private parseStateJson(jsonStr: string): WorldFact[] {
      try {
          // Remove trailing commas in lists and objects that Dialog might produce
          let cleanedJson = jsonStr.replace(/,(\s*[\]}])/g, '$1');
          
          // Fix for empty arrays which might be output as [null] by Dialog
          // We want [] instead if there are no items
          cleanedJson = cleanedJson.replace(/\[\s*null\s*\]/g, '[]');

          const data = JSON.parse(cleanedJson);
          const facts: WorldFact[] = [];
          
          if(data.location) facts.push({ id: 'loc', key: 'Location', value: data.location, isDynamic: false });

          if (Array.isArray(data.visible) && data.visible.length > 0) {
              facts.push({ id: 'vis', key: 'Visible', value: data.visible.filter(Boolean).join(', '), isDynamic: false });
          } else if (data.visible === null) {
              facts.push({ id: 'vis', key: 'Visible', value: 'Nothing', isDynamic: false });
          }

          if (Array.isArray(data.inventory) && data.inventory.length > 0) {
              facts.push({ id: 'inv', key: 'Inventory', value: data.inventory.filter(Boolean).join(', '), isDynamic: false });
          } else if (data.inventory === null) {
              facts.push({ id: 'inv', key: 'Inventory', value: 'Nothing', isDynamic: false });
          }

          // Narrative facts injected by Eidolon — stored as individual sidebar entries.
          if (data.tags && Object.keys(data.tags).length > 0) {
              for (const tagKey in data.tags) {
                  if (tagKey !== "_ignore") { 
                    facts.push({
                    id: `tag-${tagKey}`,
                    key: `tag:${tagKey}`,
                    value: data.tags[tagKey],
                    isDynamic: true
                    });                  
                }
              }
          }
          
          return facts;
      } catch (e) {
          console.warn("State Parse Error:", e);
          console.warn("Attempting to parse:", jsonStr); // Log the malformed string
          return [];
      }
  }

  private flushOutput(): string {
    const text = this.outputBuffer.join("\n").trim();
    this.outputBuffer = [];
    return text;
  }

  public getState(): WorldFact[] { return []; }
}