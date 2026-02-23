import { GameEngine, EngineResponse, WorldFact, AaWindowUpdate, AaResource } from '../types';

// aaengine.js (public/aaengine.js) sets window.aaengine when executed as a
// plain script. We load it once and share the module across all bridge instances.
let engineModule: any = null;

function loadAaEngine(): Promise<any> {
  if (engineModule) return Promise.resolve(engineModule);
  return new Promise((resolve, reject) => {
    if ((window as any).aaengine) {
      engineModule = (window as any).aaengine;
      resolve(engineModule);
      return;
    }
    const script = document.createElement('script');
    script.src = '/aaengine.js';
    script.onload = () => {
      engineModule = (window as any).aaengine;
      if (engineModule) {
        resolve(engineModule);
      } else {
        reject(new Error('[AaMachineBridge] aaengine.js loaded but window.aaengine was not set.'));
      }
    };
    script.onerror = () => reject(new Error('[AaMachineBridge] Failed to load /aaengine.js'));
    document.head.appendChild(script);
  });
}

export class AaMachineBridge implements GameEngine {
  private binary: Uint8Array;
  private engine: any = null;
  private vmStatus: number = -1;
  private io: any = null;
  private isReady = false;

  // --- Output buffers ---
  private mainBuffer: string[] = [];
  private statusBuffer: string[] = [];
  private pendingLinks: string[] = [];
  private pendingResources: AaResource[] = [];

  // Self-link accumulation (the displayed text IS the command)
  private inSelfLink = false;
  private selfLinkStr = '';

  // Active style bitmask: bit 1 = bold, bit 2 = italic, bit 3 = fixed-width.
  // Exposed so future renderers can inspect it without re-parsing text.
  public currentStyle = 0;

  // -------------------------------------------------------------------------
  // A-machine hooks — attach these before calling start() to receive events.
  // -------------------------------------------------------------------------

  /** Called whenever a top or inline status window is updated. */
  public onWindowUpdate?: (update: AaWindowUpdate) => void;

  /** Called when the story embeds a resource (image, audio, video). */
  public onResourceEmbed?: (resource: AaResource) => void;

  /**
   * Called after each engine step with all clickable command suggestions
   * available at that point in the story. Empty array means none were offered.
   */
  public onLinksAvailable?: (commands: string[]) => void;

  /** Called once after load with the story's title and author metadata. */
  public onMetadata?: (title: string, author: string) => void;

  constructor(binary: Uint8Array) {
    this.binary = binary;
  }

  // -------------------------------------------------------------------------
  // GameEngine interface
  // -------------------------------------------------------------------------

  async start(): Promise<string> {
    this.engine = await loadAaEngine();
    this.io = this.buildIo();

    this.engine.prepare_story(
      this.binary,
      this.io,
      undefined, // random seed — undefined means the engine picks one
      true,      // quit: expose the QUIT action
      true,      // toparea: top status window is supported
      true,      // inlinearea: inline status windows are supported
    );

    // Styles must be fetched after prepare_story and set on the io object so
    // that enter_div / leave_div can read CSS margin values for spacing.
    this.io.styles = this.engine.get_styles();

    // Emit story metadata if available.
    try {
      const meta = this.engine.get_metadata();
      if (this.onMetadata && meta) {
        this.onMetadata(meta.title || '', meta.author || '');
      }
    } catch (_) { /* story may omit the META chunk */ }

    // Start the VM — synchronous; returns when the engine first needs input.
    this.vmStatus = this.engine.vm_start();
    this.isReady = true;

    this.dispatchEvents();
    return this.flushMain();
  }

  async execute(command: string): Promise<EngineResponse> {
    if (!this.isReady || !this.engine) {
      return { output: 'System Offline.', isFallback: true };
    }

    this.resetBuffers();

    if (this.vmStatus === this.engine.status.get_input) {
      this.vmStatus = this.engine.vm_proceed_with_input(command.toLowerCase().trim());
    }

    this.dispatchEvents();
    const rawOutput = this.flushMain();

    // Parse Eidolon protocol tags embedded by Dialog stories that include
    // Eidolon.dg, whether compiled for Z-machine or A-machine.
    const stateRegex   = /\[EIDOLON_STATE\]([\s\S]*?)\[\/EIDOLON_STATE\]/;
    const fallbackRegex = /\[EIDOLON_FALLBACK\]([\s\S]*?)\[\/EIDOLON_FALLBACK\]/;

    const stateMatch   = rawOutput.match(stateRegex);
    const fallbackMatch = rawOutput.match(fallbackRegex);

    const snapshot = stateMatch ? this.parseStateJson(stateMatch[1]) : [];

    if (fallbackMatch) {
      return {
        output: '',
        isFallback: true,
        stateSnapshot: this.parseStateJson(fallbackMatch[1]),
      };
    }

    return {
      output: rawOutput.replace(stateRegex, '').trim(),
      isFallback: false,
      stateSnapshot: snapshot,
    };
  }

  getState(): WorldFact[] { return []; }

  // -------------------------------------------------------------------------
  // IO object — full implementation of the Å-machine IO interface.
  //
  // The engine calls these callbacks synchronously during vm_start() and
  // vm_proceed_with_input(). Everything is collected into buffers that are
  // flushed and dispatched once the engine yields back to the caller.
  // -------------------------------------------------------------------------

  private buildIo(): any {
    const bridge = this;

    return {
      hidden: false,
      styles: [] as any[],

      // Internal state flags on the io object itself so they can be reset
      // via resetBuffers() without rebuilding the object.
      _inStatus: false,
      _statusAreaId: 0 as number, // 0 = top bar, 1 = inline
      _didLine: false,
      _didPar: false,

      // --- Core text output ---

      print(str: string) {
        if (this.hidden) return;
        this._didLine = false;
        this._didPar = false;
        // Accumulate self-link command text in parallel with normal print.
        if (bridge.inSelfLink) bridge.selfLinkStr += str.toLowerCase();
        if (this._inStatus) {
          bridge.statusBuffer.push(str);
        } else {
          bridge.mainBuffer.push(str);
        }
      },

      space()           { this.print(' '); },
      space_n(n: number){ this.print(' '.repeat(Math.max(0, n))); },

      line() {
        if (this.hidden) return;
        // Deduplicate: only emit one newline until more text is printed.
        if (!this._didPar && !this._didLine) {
          const buf = this._inStatus ? bridge.statusBuffer : bridge.mainBuffer;
          buf.push('\n');
          this._didLine = true;
        }
      },

      par() {
        if (this.hidden) return;
        if (!this._didPar) {
          const buf = this._inStatus ? bridge.statusBuffer : bridge.mainBuffer;
          if (!this._didLine) buf.push('\n');
          buf.push('\n');
          this._didPar = true;
          this._didLine = false;
        }
      },

      flush() {},

      reset() {
        this.hidden = false;
        this._inStatus = false;
        this._didLine = false;
        this._didPar = false;
        bridge.mainBuffer = [];
        bridge.statusBuffer = [];
        bridge.pendingLinks = [];
        bridge.pendingResources = [];
        bridge.currentStyle = 0;
      },

      // --- Style flags ---
      // bit 0x02 = bold, 0x04 = italic, 0x08 = fixed-width.
      // Stored as a bitmask so future text renderers can apply them.

      setstyle (s: number) { bridge.currentStyle |=  s; },
      resetstyle(s: number) { bridge.currentStyle &= ~s; },
      unstyle  ()           { bridge.currentStyle  =  0; },

      // --- Layout / structural containers ---

      clear() {
        bridge.mainBuffer = [];
        this._didLine = false;
        this._didPar = false;
      },

      clear_all() {
        bridge.mainBuffer = [];
        bridge.statusBuffer = [];
        this._didLine = false;
        this._didPar = false;
      },

      // Deactivate pending clickable links (e.g. after a new turn begins).
      clear_links() { bridge.pendingLinks = []; },

      // Called to hide stale content above the current scroll position.
      clear_old() {},

      // Called to collapse a div into a "[+]" reveal button.
      // Hook here in the future to surface collapsible content to the UI.
      clear_div() {},

      enter_div(id: number) {
        if (this.hidden || this._inStatus) return;
        // Use the div's CSS margin-top to decide how much vertical space to add.
        const mt = this.styles[id]?.['margin-top'];
        if (mt && mt !== '0' && mt !== '0em') {
          this.par();
        } else {
          this.line();
        }
      },

      leave_div(id: number) {
        if (this.hidden || this._inStatus) return;
        const mb = this.styles[id]?.['margin-bottom'];
        if (mb && mb !== '0' && mb !== '0em') {
          this.par();
        } else {
          this.line();
        }
      },

      // Spans carry CSS class styling (colour, font).
      // No-op for now; hook here to wrap output segments with style metadata.
      enter_span(_id: number) {},
      leave_span()            {},

      leave_all() {
        this._inStatus = false;
        this.hidden = false;
        this._didLine = false;
        this._didPar = false;
      },

      // --- Status windows ---
      // area 0 = top persistent bar (location, score, etc.)
      // area 1 = inline status block within the main scroll area

      enter_status(area: number, _id: number) {
        this._inStatus = true;
        this._statusAreaId = area;
        this.hidden = false;
        bridge.statusBuffer = [];
      },

      leave_status() {
        const content = bridge.statusBuffer.join('').trim();
        this._inStatus = false;
        if (bridge.onWindowUpdate) {
          bridge.onWindowUpdate({
            id: this._statusAreaId === 0 ? 'status-top' : 'status-inline',
            content,
          });
        }
      },

      // --- Hyperlinks (clickable command suggestions) ---
      // Returning true tells the engine to emit enter_link / leave_link pairs,
      // giving us the command string for each suggestion in the output.

      have_links() { return true; },

      enter_link(str: string) {
        // str = the command to send; print() will supply the display text.
        bridge.pendingLinks.push(str);
      },
      leave_link() {},

      // Self-link: the text the player reads IS the command (collected in print).
      enter_self_link() {
        bridge.inSelfLink  = true;
        bridge.selfLinkStr = '';
      },
      leave_self_link() {
        if (bridge.selfLinkStr) bridge.pendingLinks.push(bridge.selfLinkStr);
        bridge.inSelfLink  = false;
        bridge.selfLinkStr = '';
      },

      // External resource hyperlinks (URLs embedded in story text).
      // Hook enter_link_res / leave_link_res here to make them openable.
      enter_link_res(_res: any) {},
      leave_link_res()          {},

      // --- Embedded resources (images, audio, video) ---
      // Returning false causes the engine to always call embed_res() and pass
      // the alt-text, letting us decide how to render every resource type.

      can_embed_res(_res: any) { return false; },

      embed_res(res: any) {
        const resource = bridge.classifyResource(res);
        bridge.pendingResources.push(resource);
        if (bridge.onResourceEmbed) bridge.onResourceEmbed(resource);
        // Inline alt-text fallback until a richer renderer is wired in.
        this.print(`[${res.alt || 'resource'}]`);
      },

      // --- Progress bar ---
      // Rendered as ASCII for now; replace with a real bar component later.

      progressbar(p: number, total: number) {
        const pct    = total > 0 ? Math.round((p / total) * 100) : 0;
        const filled = Math.round(pct / 5);
        this.print(`[${'#'.repeat(filled)}${'.'.repeat(20 - filled)}] ${pct}%`);
        this.line();
      },

      // --- Save / restore ---
      // TODO: implement via IndexedDB (web storage) or a file-download trigger.

      save(_filedata: Uint8Array) {
        console.warn('[AaMachineBridge] Save not yet implemented.');
        return false;
      },

      restore() {
        console.warn('[AaMachineBridge] Restore not yet implemented.');
      },

      // --- Transcript ---
      // The engine asks whether to enable/disable scripting.
      // Return false to decline; hook script_on to integrate transcript export.

      script_on()  { return false; },
      script_off() {},

      // --- Debug tracing ---
      trace(_str: string) {},
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Fire deferred per-step events to subscribers. Called after each VM step. */
  private dispatchEvents() {
    if (this.onLinksAvailable && this.pendingLinks.length > 0) {
      this.onLinksAvailable([...this.pendingLinks]);
    }
    this.pendingLinks = [];
  }

  /** Return the accumulated main-window text and clear the buffer. */
  private flushMain(): string {
    const text = this.mainBuffer.join('').trim();
    this.mainBuffer = [];
    return text;
  }

  /** Reset all buffers and IO state flags before processing a new command. */
  private resetBuffers() {
    this.mainBuffer    = [];
    this.statusBuffer  = [];
    this.pendingLinks  = [];
    this.pendingResources = [];
    if (this.io) {
      this.io._didLine = false;
      this.io._didPar  = false;
    }
  }

  /** Classify a resource by file extension for the onResourceEmbed hook. */
  private classifyResource(res: any): AaResource {
    const url: string = res.url || '';
    const alt: string = res.alt || '';
    let type: 'image' | 'audio' | 'video' | 'unknown' = 'unknown';
    if      (/\.(png|jpe?g|gif|webp|svg)$/i.test(url))     type = 'image';
    else if (/\.(ogg|mp3|wav|flac|aac|m4a)$/i.test(url))   type = 'audio';
    else if (/\.(mp4|webm|ogv)$/i.test(url))                type = 'video';
    return { url, alt, type };
  }

  /**
   * Parse Eidolon-protocol JSON embedded by Dialog stories compiled with
   * Eidolon.dg — identical structure whether targeting Z-machine or A-machine.
   */
  private parseStateJson(jsonStr: string): WorldFact[] {
    try {
      const cleaned = jsonStr
        .replace(/,(\s*[\]}])/g, '$1')
        .replace(/\[\s*null\s*\]/g, '[]');
      const data = JSON.parse(cleaned);
      const facts: WorldFact[] = [];

      if (data.location) {
        facts.push({ id: 'loc', key: 'Location', value: data.location, isDynamic: false });
      }
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
      if (data.tags) {
        for (const key in data.tags) {
          if (key !== '_ignore') {
            facts.push({ id: `tag-${key}`, key: `tag:${key}`, value: data.tags[key], isDynamic: true });
          }
        }
      }
      return facts;
    } catch (e) {
      console.warn('[AaMachineBridge] State parse error:', e, jsonStr);
      return [];
    }
  }
}
