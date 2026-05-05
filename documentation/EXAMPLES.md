# Plugin Examples

You can paste these directly into **Settings > Plugins**.

## Example 1: Hello World

```javascript
cmos.toast('Plugin System Loaded!');
console.log(cmos.getState());
```

## Example 2: Auto Theme Switcher

```javascript
const totalSolves = Object.keys(cmos.getState().solves).length;

if (totalSolves > 100) {
  cmos.updateSettings({ theme: 'orange' });
  cmos.toast('Orange theme unlocked');
}
```

## Example 3: Widget With Proper Cleanup

```javascript
let interval = null;

cmos.registerWidget(
  'session_counter',
  'Session Counter',
  (container) => {
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.color = 'white';
    container.style.fontSize = '24px';

    const render = () => {
      const state = cmos.getState();
      const session = state.sessions.find(s => s.id === state.currentSessionId);
      const count = session ? session.solveIds.length : 0;
      container.textContent = `Session solves: ${count}`;
    };

    render();
    interval = setInterval(render, 500);
  },
  () => {
    if (interval) clearInterval(interval);
    interval = null;
  }
);
```

## Example 4: Cleanup Via `onCleanup`

```javascript
const interval = setInterval(() => {
  console.log('tick');
}, 1000);

cmos.onCleanup(() => {
  clearInterval(interval);
});
```

## Example 5: Add a Language

```javascript
cmos.registerLanguage({
  code: 'pirate',
  name: 'Pirate',
  localizedNames: {
    en: 'Pirate',
    de: 'Piratisch'
  },
  translations: {
    'btn.cancel': 'Belay',
    'settings.title': "Cap'n Settings"
  }
});
```

## Example 6: Add Translations to an Existing Language

```javascript
cmos.registerTranslations('eo', {
  'myplugin.title': 'Mia kromprogramo',
  'myplugin.ready': 'Preta'
});
```

## Example 7: Custom Scrambler

```javascript
cmos.registerScrambler({
  id: 'tiny_demo',
  name: 'Tiny Demo',
  category: 'Subsets',
  visualizer: '3x3',
  generate: () => ['R', 'U', "R'", "U'"]
});
```

## Example 8: Custom Renderer

```javascript
cmos.registerScrambleRenderer(
  'demo-visualizer',
  (container, scramble) => {
    container.style.color = 'white';
    container.style.padding = '12px';
    container.textContent = `Custom render: ${scramble.join(' ')}`;
  }
);
```

## Example 9: Prompt + Action

```javascript
(async () => {
  const value = await cmos.prompt('Add solve in milliseconds', '12345');
  if (value === null) return;

  const time = Number(value);
  if (Number.isFinite(time) && time >= 0) {
    cmos.addSolve(time);
    cmos.toast('Solve added');
  } else {
    await cmos.alert('Invalid number');
  }
})();
```

## Notes

- Plugins are reloaded automatically when their code changes.
- Plugin startup is transactional. If registration fails or the plugin throws, partial registrations are rolled back.
- You do not need to refresh the page to stop a plugin. Disable or edit it and CMOSTimer will run cleanup automatically.
