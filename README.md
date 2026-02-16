# Eidolon: IF Fallback Engine

**Eidolon** is a hybrid Interactive Fiction engine. It pairs a traditional parser (a Dialog story compiled to Z-Machine bytecode) with a Gemini LLM that acts as a fallback narrator. When the parser cannot handle a player command, Eidolon invokes the LLM, which invents a coherent response, respects current world state, and injects new facts back into the running game.

## Architecture

```
Player input
    │
    ▼
DialogBridge                    src/engines/DialogBridge.ts
    │  Runs Bocfel (Z-Machine WASM interpreter via emglken)
    │  Feeds story.z8 binary to the VM via an in-memory virtual filesystem
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

2. Create `.env.local` at the project root:
   ```
   VITE_GEMINI_API_KEY=your_key_here
   ```

3. Start the dev server:
   ```
   npm run dev
   ```

The default story (`public/story.z8`) loads automatically at startup.

---

## Writing Eidolon-Compatible Dialog Stories

To integrate a Dialog story with Eidolon, your `.dg` source must include two blocks:

- **The Eidolon Layer** — wires up the protocol commands and installs the state-emitter hook
- **The JSON State Exporter** — serialises world state after each turn

### The Eidolon Layer

```dialog
%% ===========================================================================
%% Eidolon Layer
%% ===========================================================================
(dynamic (object $ has narrative $))

%% eidolon_note: called by the LLM to attach a narrative fact to a game object.
(grammar [eidolon_note [object] [any]] for [eidolon_note $ $])

(perform [eidolon_note $Obj $Words])
    *(object $Obj)
    (now) ($Obj has narrative $Words)
    [ACK_INJECTION] (line)

%% eidolon_force: called by the LLM to execute an arbitrary game command.
(grammar [eidolon_do [any]] for [eidolon_force $])

(perform [eidolon_force $Words])
    (try $Words)
    [ACK_INJECTION] (line)

%% Fallback action: catches any input the parser cannot understand.
%% Marked very unlikely so Dialog only selects it as a last resort.
(understand $Words as [eidolon_fallback])
    ($Words = [$ | $])

(very unlikely [eidolon_fallback])

(allow [eidolon_fallback])
    (true)

(perform [eidolon_fallback])
    (line)
    \[EIDOLON_FALLBACK\]
    (dump-eidolon-state)
    \[\/EIDOLON_FALLBACK\] (line)
    (stop)

%% After every successful action, emit a state snapshot for the sidebar.
(after [any $Action])
    ($Action = $Action)
    \[EIDOLON_STATE\]
    (dump-eidolon-state)
    \[\/EIDOLON_STATE\] (line)
```

### The JSON State Exporter

This defines `(dump-eidolon-state)`, which emits location, visible objects, inventory, and Eidolon-injected narrative facts as a JSON object. `DialogBridge` parses this to populate the world state sidebar.

```dialog
%% ===================================================================
%% JSON State Exporter
%% ===================================================================

(dump-eidolon-state)
    \{\" (no space)
    (current player $P)
    (if) ($P has parent $Loc) (then)
        location\":\ \" (no space)
        (name $Loc) (no space)
        \"\,\ \" (no space)
    (endif)
    visible\":\ \[ (no space)
    (exhaust) (dump-visible-json)
    null (no space)
    \]\,\ \" (no space)
    inventory\":\ \[ (no space)
    (exhaust) (dump-inventory-json)
    null (no space)
    \]\,\ \" (no space)
    narrative\":\ \{ (no space)
    (exhaust) (dump-narrative-json)
    \"_ignore\" (no space)
    \:\ null (no space)
    \} (no space)
    \} (no space)

(dump-visible-json)
    (current player $P)
    ($P has parent $Loc)
    *(everything $Obj)
    ($Obj is in room $Loc)
    ($Obj \= $P)
    \" (no space)
    (name $Obj) (no space)
    \"\, (no space)

(dump-inventory-json)
    (current player $P)
    *(everything $Item)
    ($Item is in room $P)
    \" (no space)
    (name $Item) (no space)
    \"\, (no space)

(dump-narrative-json)
    *(object $Obj has narrative $Fact)
    \" (no space)
    (name $Obj) (no space)
    \" (no space)
    \:\ \" (no space)
    (print words $Fact) (no space)
    \"\, (no space)
```

### Protocol Reference

| Tag / Command | Direction | Purpose |
|---|---|---|
| `[EIDOLON_STATE]...[/EIDOLON_STATE]` | Dialog → Bridge | Emitted after every turn. Bridge parses the JSON and updates the sidebar. |
| `[EIDOLON_FALLBACK]...[/EIDOLON_FALLBACK]` | Dialog → Bridge | Emitted when no parser action matched. Bridge discards VM output and invokes the LLM. |
| `eidolon_note <object> <words>` | Bridge → Dialog | LLM injects a narrative fact onto a game object. |
| `eidolon_force <command>` | Bridge → Dialog | LLM executes a mechanical game command (e.g. `take lamp`). |

### Compiling

Compile your `.dg` source to `.z8` using the Dialog compiler:

```
dialogc story.dg -o story.z8
```

Place the output at `public/story.z8`.

---

## Public Assets

| File | Purpose |
|---|---|
| `asyncglk.js` | Async Glk runtime required by Bocfel |
| `bocfel.js` | Z-Machine interpreter JS wrapper |
| `bocfel.wasm` | Z-Machine interpreter WASM binary |
| `story.z8` | Compiled Dialog story |
