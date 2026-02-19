# Eidolon: IF Fallback Engine

**Eidolon** is a hybrid Interactive Fiction engine. It pairs a traditional parser (a Dialog story compiled to Z-Machine bytecode) with a Gemini LLM that acts as a fallback narrator. When the parser cannot handle a player command, Eidolon invokes the LLM, which invents a coherent response, respects current world state, and injects new facts back into the running game.

## Architecture

```
Player input
    │
    ▼
DialogBridge                    src/engines/DialogBridge.ts
    │  Runs Bocfel (Z-Machine WASM interpreter via emglken)
    │  Feeds the story binary to the VM via an in-memory virtual filesystem
    │  Parses [EIDOLON_STATE] / [EIDOLON_FALLBACK] tags from VM output
    │
    ├─ parser handled it ──▶ display output, update sidebar state
    │
    └─ [EIDOLON_FALLBACK] ──▶ geminiService.queryEidolon()
                                │  Input: command, recent history, world facts,
                                │         constraints, author style
                                │  Output: narrative, mechanical actions, invented facts
                                │
                                ├─ mechanical actions ──▶ DialogBridge.execute()
                                └─ invented facts ──▶ sidebar + eidolon_note command
```

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```

2. Optionally create `.env.local` at the project root with a Gemini API key for local development:
   ```
   VITE_GEMINI_API_KEY=your_key_here
   ```
   If no environment key is set, you can enter one at runtime using the **Gemini API Key** field in the sidebar.

3. Start the dev server:
   ```
   npm run dev
   ```

The default story (`public/CloakOfDarkness.z8`) loads automatically at startup. Additional stories can be loaded from the **Story Library** in the sidebar, or by uploading your own `.z5`/`.z8` file.

---

## Writing Eidolon-Compatible Dialog Stories

To integrate a Dialog story with Eidolon, include the Eidolon library at the top of your `.dg` source file:

```dialog
include Eidolon.dg
```

`Eidolon.dg` is provided in the `public/` folder of this repository. It supplies:

- **`eidolon_note`** — lets the LLM attach narrative facts to game objects
- **`eidolon_force`** — lets the LLM execute mechanical game commands
- **`eidolon_fallback`** — catch-all action that fires when the parser cannot handle input, triggering the LLM
- **`dump-eidolon-state`** — serialises world state (location, visible objects, inventory, narrative facts) as JSON for the sidebar

### Compiling

Compile your `.dg` source to a Z-Machine binary using the Dialog compiler, passing `Eidolon.dg` on the include path:

```
dialogc -I public/ story.dg -o public/CloakOfDarkness.z8
```

Place the output in `public/` and it will be served by Vite. Load it in the app via **Story Library** or the **Import Story File** upload button.

### Protocol Reference

| Tag / Command | Direction | Purpose |
|---|---|---|
| `[EIDOLON_STATE]...[/EIDOLON_STATE]` | Dialog → Bridge | Emitted after every turn. Bridge parses the JSON and updates the sidebar. |
| `[EIDOLON_FALLBACK]...[/EIDOLON_FALLBACK]` | Dialog → Bridge | Emitted when no parser action matched. Bridge discards VM output and invokes the LLM. |
| `eidolon_note <object> <words>` | Bridge → Dialog | LLM injects a narrative fact onto a game object. |
| `eidolon_force <command>` | Bridge → Dialog | LLM executes a mechanical game command (e.g. `take lamp`). |

---

## Public Assets

| File | Purpose |
|---|---|
| `asyncglk.js` | Async Glk runtime required by Bocfel |
| `bocfel.js` | Z-Machine interpreter JS wrapper |
| `bocfel.wasm` | Z-Machine interpreter WASM binary |
| `CloakOfDarkness.z8` | Default compiled Dialog story |
| `Eidolon.dg` | Eidolon integration library — include this in your Dialog source |
