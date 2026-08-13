# CMOSTimer v3 Plugin API

The public documentation is hosted at [speed-cmos.com/v3/docs](https://speed-cmos.com/v3/docs). This reference describes plugin API `2.0.0`.

CMOSTimer runs each enabled plugin in a dedicated Web Worker. Plugin code receives an asynchronous `cmos` capability API, not application objects, the DOM, `window`, or native Tauri/Capacitor bridges. Messages, registrations, and UI output are validated by the host.

API 2 is intentionally not compatible with the old synchronous, DOM-based API.

## Security model

Worker isolation is a substantial boundary, not a perfect security sandbox. A plugin cannot directly read or change CMOSTimer's DOM or JavaScript state, but ordinary worker globals may still include `fetch`, WebSocket, timers, IndexedDB, and nested workers, depending on the browser or WebView. A plugin can also use the API to modify or delete timer data. Review plugins before enabling them.

CMOSTimer fails closed when dedicated module workers are unavailable: the plugin is marked `unsupported`; it is never silently run in the page. Browser deployments must allow the bundled worker script and dynamic JavaScript compilation in the worker through their Content Security Policy. Current web, Tauri, and Capacitor builds bundle the same module-worker runtime, but actual support still depends on the browser/WebView version.

Registrations are transactional. CMOSTimer waits for startup and commits all registrations together. If startup throws or rejects, it rolls them back and runs registered cleanup callbacks. A failed edit falls back to the last-known-good source when one exists.

## Quick start

Paste this into **Settings -> Plugins**:

```javascript
await cmos.toast(`Plugin API ${cmos.apiVersion}`);

cmos.on('solveAdded', solve => {
  void cmos.toast(`Recorded ${(solve.time / 1000).toFixed(2)}s`);
});

cmos.registerWidget('hello', 'Hello', async () => ({
  type: 'text',
  text: `Session: ${(await cmos.getState()).currentSessionId}`,
  tone: 'accent'
}));
```

Top-level `await` is supported. Startup remains `loading` until it settles. Avoid promises that never settle because they prevent that plugin reload from completing.

## Async API rule

All state, action, dialog, storage, and refresh methods cross the worker boundary and return promises. Use `await` (or explicitly handle the promise). Registration methods and `on(...)` are synchronous because they only stage worker-local callbacks.

```javascript
const state = await cmos.getState();
await cmos.storage.set('enabled', true);
await cmos.nextScramble();
```

Data crossing the API boundary must be structured-cloneable and requests are limited to 1 MB. UI trees are additionally bounded by depth, node count, and text length.

## Compatibility and packages

`cmos.apiVersion` reports the semantic API version. Packages declare their required API with `apiVersion`; the major version must match. Imports are disabled until the user reviews and enables them.

```json
{
  "format": "cmostimer-plugin",
  "formatVersion": 1,
  "plugin": {
    "id": "example.plugin",
    "name": "Example Plugin",
    "version": "1.0.0",
    "description": "An isolated example",
    "apiVersion": "2.0.0",
    "code": "await cmos.toast('Ready')",
    "enabled": false
  }
}
```

Runtime states are `disabled`, `loading`, `active`, `fallback`, `error`, `incompatible`, and `unsupported`.

## State methods

| Method | Resolves to |
| --- | --- |
| `getState()` | Fresh snapshot with sessions, solves, settings, stats, goals, plugins, and `currentSessionId` |
| `getTimerState()` | Current timer state such as `IDLE`, `INSPECTION`, `RUNNING`, or `STOPPED` |
| `getTimerElapsed()` | Elapsed milliseconds while running, stopped time while stopped, otherwise `0` |
| `getCurrentScramble()` | Relay-aware scramble as `string[][]` |

Treat snapshots as read-only. They are copies, and changes to them do not affect CMOSTimer.

## Timer, solve, and app actions

Every method below returns a promise:

- `startInspection()` starts inspection from idle.
- `startTimer()` starts timing immediately.
- `stopTimer(input?)` stops and stores a solve, resolving to its id or `null`. Input may contain `time`, `inspectionTime`, `phases`, and `penalty`.
- `cancelTimer()` returns to idle without storing a solve.
- `addSolve(timeMs, penalty?)` stores a simple solve and resolves to its id.
- `addSolveWithDetails({ time, inspectionTime?, phases?, penalty? })` preserves detailed timing data.
- `updateSolve(id, updates)` updates solve metadata.
- `deleteSolves(ids, sessionId?)` removes solve references from a session or deletes globally when no session is supplied.
- `nextScramble()` and `previousScramble()` navigate scramble history.
- `setCurrentSession(id)` switches to an existing session.
- `updateSettings(partial)` shallow-merges supported settings. See [SETTINGS_REFERENCE.md](./SETTINGS_REFERENCE.md).
- `toast(message)`, `alert(message)`, and `prompt(message, default?)` use host UI. `prompt` resolves to a string or `null`.

These capabilities are not permissions: an enabled plugin can call all of them.

## Events

`cmos.on(name, callback)` subscribes and immediately returns an unsubscribe function. Event callbacks may be async. All subscriptions are also removed when the worker is stopped.

| Event | Payload |
| --- | --- |
| `stateChanged` | Full state snapshot |
| `timerStateChanged` | Timer state string |
| `scrambleChanged` | Current `string[][]` scramble |
| `sessionChanged` | `{ currentSessionId, session }` |
| `solveAdded` | Added solve |

Events are delivered across the worker boundary and are unsuitable for animation-frame timing. Use `getTimerElapsed()` for occasional reads; widget rendering is intentionally host-controlled.

## Namespaced storage

```javascript
const count = await cmos.storage.get('launchCount', 0);
await cmos.storage.set('launchCount', count + 1);
await cmos.storage.remove('oldSetting');
```

Values must be structured-cloneable and JSON-compatible. Storage is namespaced by plugin id, persists while disabled, and may be mirrored to native storage. Removing a plugin does not automatically erase its values.

## Declarative UI

Plugins never receive DOM elements. Widget and scramble-renderer callbacks return an allowlisted UI tree. Text is inserted with `textContent`; HTML, script, style, URLs, arbitrary attributes, and DOM event handlers are not accepted.

```javascript
cmos.registerWidget('counter', 'Counter', async () => {
  const count = await cmos.storage.get('count', 0);
  return {
    type: 'container', direction: 'column', align: 'center', gap: 'medium',
    children: [
      { type: 'text', text: `Count: ${count}`, size: 'large' },
      { type: 'button', text: 'Increment', action: 'increment', tone: 'accent' }
    ]
  };
}, async action => {
  if (action !== 'increment') return;
  const count = await cmos.storage.get('count', 0);
  await cmos.storage.set('count', count + 1);
  await cmos.refreshWidget('counter');
});
```

Supported nodes:

- A string, or `{ type: 'text', text, tone?, size? }`.
- `{ type: 'button', text, action, tone?, disabled? }`.
- `{ type: 'container', direction?, align?, gap?, children }`.
- `{ type: 'spacer', size? }`.

Tones are `default`, `muted`, `accent`, `success`, `warning`, and `danger`. Sizes/gaps are `small`, `medium`, and `large`. Directions are `row`/`column`; alignment is `start`, `center`, `end`, or `stretch`.

`registerScrambleRenderer(type, async (scramble, config) => node)` uses the same UI tree.

## Declarative scramblers and localization

Custom scramblers describe a bounded move set rather than supplying host-executed code:

```javascript
cmos.registerScrambler({
  id: 'ru-training',
  name: 'R/U Training',
  category: 'Subsets',
  visualizer: '3x3x3',
  moves: ['R', "R'", 'U', "U'"],
  opposites: ["R R'", "U U'"],
  length: 20
});
```

- `registerLanguage({ code, name, localizedNames?, translations? })` registers a language.
- `registerTranslations(languageCode, dictionary)` extends a language.

Built-in and other-plugin ids cannot be replaced.

## Lifecycle and recovery

`cmos.onCleanup(callback)` registers worker-side cleanup for resources such as timers, sockets, or devices. It runs at most once when that startup is disabled, removed, replaced, or rolled back; the worker is then terminated. Widget renders need no DOM cleanup because plugins never own host DOM.

When edited source fails, CMOSTimer cleans its partial work and attempts the previous known-good source. The new source remains in the editor for repair.

## Current limitations

- Worker isolation is not a universal browser security boundary; worker network and storage globals can remain available.
- There is no per-capability permission prompt, dependency resolver, or remote marketplace.
- Packages contain JavaScript; compile TypeScript and dependencies into one source before packaging.
- Browsers/WebViews without dedicated module workers cannot run plugins and show `unsupported`.
- A restrictive deployment CSP must permit the bundled worker and the worker's dynamic code compilation.
