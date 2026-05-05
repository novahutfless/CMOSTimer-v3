# CMOSTimer v3 Plugin API Reference

CMOSTimer plugins are JavaScript snippets executed in-process and given a `cmos` object.

Important:
- Plugins are not sandboxed in a security sense. They run in the app process.
- Plugin registrations are transactional. If a plugin throws during startup, its partial registrations are rolled back.
- Plugin-owned widgets, renderers, scramblers, and localizations are cleaned up automatically when the plugin is disabled, changed, or removed.
- Plugin ids must be unique per extension point. A plugin cannot override built-in languages or built-in scramblers.

## The `cmos` Object

### State

#### `cmos.getState()`
Returns a snapshot of the current application state.

Key fields on the returned `FullStateData`:
- `currentSessionId`
- `sessions`
- `solves`
- `settings`
- `statsConfig`
- `goals`
- `plugins`
- `updatedAt`

```javascript
const state = cmos.getState();
console.log(state.currentSessionId);
console.log(Object.keys(state.solves).length);
```

### Actions

#### `cmos.addSolve(timeMs, penalty?)`
Adds a solve to the current session.

`penalty` can be any `Penalty` string, including:
- `'NONE'`
- `'PLUS_TWO'`
- `'PLUS_FOUR'`
- `'PLUS_SIX'`
- `'PLUS_EIGHT'`
- `'PLUS_TEN'`
- `'PLUS_TWELVE'`
- `'PLUS_FOURTEEN'`
- `'PLUS_SIXTEEN'`
- `'DNF'`
- `'DNS'`

```javascript
cmos.addSolve(10500);
cmos.addSolve(0, 'DNF');
```

#### `cmos.updateSettings(partialSettings)`
Shallow-merges settings into the current app settings.

```javascript
cmos.updateSettings({
  theme: 'blue',
  inspectionEnabled: false
});
```

#### `cmos.toast(message)`
Shows a toast notification.

```javascript
cmos.toast('Hello from my plugin');
```

#### `cmos.alert(message)`
Opens a modal alert and resolves when dismissed.

```javascript
await cmos.alert('Done');
```

#### `cmos.prompt(message, defaultValue?)`
Opens a modal prompt and resolves to the entered value or `null`.

```javascript
const name = await cmos.prompt('Session name?', 'Practice');
```

### Registration

#### `cmos.registerWidget(id, name, renderFn, cleanupFn?)`
Registers a custom dashboard widget.

- `id`: unique widget id
- `name`: label shown in the UI
- `renderFn(container)`: called when the widget mounts
- `cleanupFn()`: optional cleanup for timers, listeners, etc.

```javascript
cmos.registerWidget(
  'simple_counter',
  'Simple Counter',
  (container) => {
    container.innerHTML = '<div style="color:white">Hello</div>';
  }
);
```

#### `cmos.registerScrambleRenderer(visualizerType, renderFn, cleanupFn?)`
Registers a custom scramble renderer for a visualizer type string.

This is used by `ScrambleDisplay` when a scramble's visualizer type matches your `visualizerType`.

```javascript
cmos.registerScrambleRenderer(
  'my-puzzle',
  (container, scramble, config) => {
    container.textContent = `Moves: ${scramble.join(' ')}`;
  }
);
```

#### `cmos.registerScrambler(definition)`
Registers a plugin-owned scrambler.

Definition fields:
- `id`
- `name`
- `category`
- `visualizer`
- `generate(length?, customConfig?)`

Notes:
- Built-in scrambler ids cannot be overridden.
- Another plugin's scrambler id cannot be reused.

```javascript
cmos.registerScrambler({
  id: 'my_subset',
  name: 'My Subset',
  category: 'Subsets',
  visualizer: '3x3',
  generate: () => ['R', 'U', "R'"]
});
```

#### `cmos.registerLanguage(definition)`
Registers a new language so it appears in the UI language selector and `lang <code>` command.

Definition fields:
- `code`
- `name`
- `localizedNames?`
- `translations?`

Notes:
- Built-in languages cannot be overridden.
- Another plugin's language code cannot be reused.
- If `translations` is provided here, they are registered immediately for that language.

```javascript
cmos.registerLanguage({
  code: 'pirate',
  name: 'Pirate',
  localizedNames: {
    en: 'Pirate',
    de: 'Piratisch'
  },
  translations: {
    'btn.cancel': 'Belay'
  }
});
```

#### `cmos.registerTranslations(languageCode, translations)`
Registers or extends translations for an existing language.

This can target:
- a built-in language like `'en'`, `'de'`, `'eo'`
- a language registered by the same plugin
- a language registered by another plugin

Undefined keys fall back to the built-in selected-language dictionary and then to English.

```javascript
cmos.registerTranslations('eo', {
  'myplugin.title': 'Mia Ilo'
});
```

### Lifecycle

#### `cmos.onCleanup(callback)`
Registers a cleanup callback for the plugin.

The callback is run when the plugin is disabled, removed, or replaced. Cleanup callbacks are wrapped to run at most once.

```javascript
const interval = setInterval(() => {
  // ...
}, 1000);

cmos.onCleanup(() => clearInterval(interval));
```

## Practical Notes

- Widgets and custom renderers receive raw DOM containers, not React components.
- `getState()` is a snapshot. If your widget needs live updates, poll or run your own interval.
- Registration validation is strict: empty ids, empty names, invalid translation payloads, and invalid function fields will throw.
- If your plugin throws during startup, the plugin is not partially installed.

## Current Built-In Languages

- `'en'`
- `'de'`
- `'eo'`

Plugin-added languages are supported as well.
