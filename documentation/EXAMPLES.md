# CMOSTimer Plugin Examples

See the complete API reference at [speed-cmos.com/v3/docs](https://speed-cmos.com/v3/docs). These examples can be pasted into **Settings → Plugins**.

## Solve notification

```javascript
cmos.on('solveAdded', solve => {
  cmos.toast(`Recorded ${(solve.time / 1000).toFixed(2)}s`);
});
```

## Live timer-state widget

```javascript
cmos.registerWidget('timer-state', 'Timer State', container => {
  const render = state => {
    container.textContent = state;
    container.style.cssText = 'display:grid;place-items:center;height:100%;font-size:2rem';
  };

  render(cmos.getTimerState());
  const unsubscribe = cmos.on('timerStateChanged', render);
  return () => unsubscribe();
});
```

## Persistent counter

```javascript
let count = cmos.storage.get('count', 0);

cmos.registerWidget('counter', 'Counter', container => {
  const button = document.createElement('button');
  button.textContent = `Count: ${count}`;
  const increment = () => {
    count += 1;
    cmos.storage.set('count', count);
    button.textContent = `Count: ${count}`;
  };
  button.addEventListener('click', increment);
  container.replaceChildren(button);
  return () => button.removeEventListener('click', increment);
});
```

## Async startup

```javascript
const deviceName = await cmos.prompt('Controller name?', 'My timer');
if (!deviceName) throw new Error('A controller name is required');

cmos.onCleanup(() => {
  // Disconnect a device or close a transport here.
});

cmos.toast(`${deviceName} connected`);
```

## Custom scrambler and renderer

```javascript
cmos.registerScrambler({
  id: 'ru-training',
  name: 'R/U Training',
  category: 'Subsets',
  visualizer: '3x3x3',
  generate: () => ['R', 'U', "R'", "U'"]
});

cmos.registerScrambleRenderer('text-only', (container, scramble) => {
  container.textContent = scramble.join(' ');
  return () => container.replaceChildren();
});
```

## Hardware-style timing control

```javascript
// Replace these keyboard handlers with messages from your device transport.
const keydown = event => {
  if (event.key === 'F8') cmos.startTimer();
  if (event.key === 'F9') cmos.stopTimer();
  if (event.key === 'F10') cmos.cancelTimer();
};

window.addEventListener('keydown', keydown);
cmos.onCleanup(() => window.removeEventListener('keydown', keydown));
```
