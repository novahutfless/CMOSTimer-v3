# CMOSTimer v3 Plugin API

The public documentation is hosted at [speed-cmos.com/v3/docs](https://speed-cmos.com/v3/docs). This file is its source reference for plugin API version `1.1.0`.

CMOSTimer plugins are JavaScript programs executed in the application process with a `cmos` object. Existing snippet plugins remain supported; packaged plugins add metadata, compatibility checks, import/export, runtime diagnostics, and last-known-good recovery.

## Trust and safety

Plugins are **not sandboxed**. A plugin has the same browser privileges as CMOSTimer and can access the DOM, network APIs, and browser storage. Install only code you trust. CMOSTimer validates registrations and isolates registration ownership, but it cannot undo arbitrary side effects performed directly by plugin code.

Plugin registrations are transactional: CMOSTimer waits for startup, then commits widgets, renderers, scramblers, languages, translations, and event listeners together. If startup throws or rejects, registrations are rolled back and `onCleanup` callbacks already supplied by the plugin run. A failed edit automatically runs the last-known-good version when one is available.

## Quick start

Paste this into **Settings → Plugins**:

```javascript
cmos.toast(`Plugin API ${cmos.apiVersion}`);

const unsubscribe = cmos.on('solveAdded', solve => {
  console.log('New solve:', solve.time, solve.scramble);
});

cmos.registerWidget('hello-widget', 'Hello', container => {
  container.textContent = `Session: ${cmos.getState().currentSessionId}`;

  // This cleanup belongs to this particular render/mount.
  return () => {
    container.textContent = '';
  };
});

cmos.onCleanup(() => {
  // Runs once when the whole plugin is disabled, replaced, or removed.
  unsubscribe();
});
```

Top-level `await` is supported. Startup remains in the `loading` state until the returned promise settles:

```javascript
const accepted = await cmos.prompt('Enable the example integration?', 'yes');
if (accepted !== 'yes') throw new Error('Setup cancelled');
cmos.toast('Integration ready');
```

Avoid startup promises that never settle: they prevent later plugin reloads from being processed.

## Compatibility and packages

`cmos.apiVersion` is the current semantic API version. Packaged plugins can declare their minimum compatible major version through `apiVersion`. CMOSTimer refuses to run a package requiring a newer major and shows it as `incompatible`.

The editor imports and exports `.cmos-plugin.json` files with this shape:

```json
{
  "format": "cmostimer-plugin",
  "formatVersion": 1,
  "plugin": {
    "id": "example.plugin",
    "name": "Example Plugin",
    "version": "1.0.0",
    "description": "An example integration",
    "apiVersion": "1.1.0",
    "code": "cmos.toast('Ready');",
    "enabled": false
  }
}
```

Imports are always disabled initially so the user can inspect them before execution. Runtime state and startup errors appear beside each plugin in Settings.

## State

### `cmos.getState()`

Returns a current state snapshot every time it is called. It includes `currentSessionId`, `sessions`, normalized `solves`, `settings`, `statsConfig`, `goals`, `plugins`, and `updatedAt`. Treat returned objects as read-only; use API actions for changes.

```javascript
const state = cmos.getState();
const current = state.sessions.find(session => session.id === state.currentSessionId);
```

### `cmos.getTimerState()`

Returns one of `IDLE`, `INSPECTION`, `HOLDING`, `READY`, `RUNNING`, `STOPPED`, `LOCKED`, or `MANUAL_ENTRY`.

### `cmos.getTimerElapsed()`

Returns the current solve elapsed time in milliseconds while running, the stopped time while stopped, and `0` otherwise. Widgets can poll this with `requestAnimationFrame`; the event API deliberately does not emit every animation frame.

### `cmos.getCurrentScramble()`

Returns the current relay-aware scramble as `string[][]`. A normal single-puzzle scramble is the first array.

## Timer and solve actions

### `cmos.startInspection()`

Enters inspection from an idle timer. It throws if inspection is disabled or another timing state is active.

### `cmos.startTimer()`

Starts timing immediately. This is intended for hardware and controller integrations; normal UI plugins should let the user operate the timer.

### `cmos.stopTimer(input?)`

Stops a running timer, stores the solve, and returns its solve id. Returns `null` if the timer is not running and no explicit time was supplied.

```javascript
const solveId = cmos.stopTimer({
  time: 10342,
  inspectionTime: 4210,
  phases: [
    { duration: 2100, cumulative: 2100 },
    { duration: 8242, cumulative: 10342 }
  ],
  penalty: 'NONE'
});
```

### `cmos.cancelTimer()`

Returns the timer to idle without recording a solve.

### `cmos.addSolve(timeMs, penalty?)`

Adds a solve to the current session and returns its id. This backward-compatible shorthand uses `inspectionTime: -1`.

### `cmos.addSolveWithDetails(input)`

Adds a solve with `time`, optional `inspectionTime`, optional phase splits, and an optional penalty. Supported penalties are `NONE`, `PLUS_TWO`, `PLUS_FOUR`, `PLUS_SIX`, `PLUS_EIGHT`, `PLUS_TEN`, `PLUS_TWELVE`, `PLUS_FOURTEEN`, `PLUS_SIXTEEN`, `DNF`, and `DNS`.

### `cmos.updateSolve(id, partialSolve)` / `cmos.deleteSolves(ids, sessionId?)`

Updates solve metadata or removes solves. Passing `sessionId` only removes references from that session; omitting it deletes the solve globally. Session locks are a UI safeguard and do not form a plugin permission boundary.

### `cmos.nextScramble()` / `cmos.previousScramble()`

Moves through scramble history. Generating the next scramble uses the current session's scrambler configuration.

### `cmos.setCurrentSession(sessionId)`

Switches sessions and throws for an unknown id.

### `cmos.updateSettings(partialSettings)`

Shallow-merges settings. See [SETTINGS_REFERENCE.md](./SETTINGS_REFERENCE.md) for supported fields.

## Events

`cmos.on(event, callback)` subscribes and returns an unsubscribe function. Registrations are plugin-owned and are also removed automatically during cleanup.

| Event | Payload |
| --- | --- |
| `stateChanged` | Current full state snapshot |
| `timerStateChanged` | Timer state string |
| `scrambleChanged` | Current `string[][]` scramble |
| `sessionChanged` | `{ currentSessionId, session }` |
| `solveAdded` | Added `Solve` object |

Callbacks are isolated: an exception is logged without stopping other plugins' listeners.

## Namespaced storage

Each plugin receives JSON storage isolated by its plugin id:

```javascript
const count = cmos.storage.get('launchCount', 0);
cmos.storage.set('launchCount', count + 1);
cmos.storage.remove('oldSetting');
```

Values must be JSON-serializable. Storage persists across plugin disable/re-enable and is mirrored to native storage where available. Removing a plugin does not automatically erase its data, allowing safe reinstalls.

## UI and interaction

- `cmos.toast(message)` displays a transient message.
- `await cmos.alert(message)` displays an app modal.
- `await cmos.prompt(message, defaultValue?)` returns user input or `null`.

## Extension registrations

### `cmos.registerWidget(id, name, render, legacyCleanup?)`

Registers a dashboard widget. `render(container)` may return a cleanup function. Returning cleanup is preferred because every mount gets its own cleanup instance. The fourth argument remains supported for older plugins.

```javascript
cmos.registerWidget('clock', 'Clock', container => {
  const interval = setInterval(() => {
    container.textContent = new Date().toLocaleTimeString();
  }, 1000);
  return () => clearInterval(interval);
});
```

### `cmos.registerScrambleRenderer(type, render, legacyCleanup?)`

Registers a visualizer. `render(container, scramble, config)` may return per-render cleanup. It runs again whenever the scramble or visualizer configuration changes.

### `cmos.registerScrambler(definition)`

Registers `{ id, name, category, visualizer, generate(length?, customConfig?) }`. Built-in and other-plugin ids cannot be replaced. `generate` must return a move-token array.

### `cmos.registerLanguage(definition)`

Registers `{ code, name, localizedNames?, translations? }`. Built-in and other-plugin language codes cannot be replaced.

### `cmos.registerTranslations(languageCode, translations)`

Adds translations to a built-in or plugin language. Missing keys fall back to the selected built-in dictionary and then English.

## Lifecycle and recovery

`cmos.onCleanup(callback)` registers plugin-level cleanup. It runs at most once for a particular startup when the plugin is disabled, removed, replaced, or rolled back.

Use two cleanup scopes correctly:

- Return cleanup from widget/renderer functions for DOM listeners, observers, and timers created by that render.
- Use `onCleanup` for plugin-wide resources created during startup.

When an edited version fails startup, CMOSTimer cleans up its partial work and attempts the previous known-good source. The editor reports `fallback` and retains the new source so it can be repaired. A plugin may also be `loading`, `active`, `disabled`, `error`, or `incompatible`.

## Current limitations

- Plugins are trusted in-process code, not workers or security sandboxes.
- There is no package dependency resolver or remote marketplace.
- Plugin code is JavaScript; TypeScript must be compiled before packaging.
- The event API reports state changes, but it is not intended as a high-frequency timer display clock. Render elapsed time locally from timer start/stop events when needed.
