# CMOSTimer Plugin Examples

See the complete API reference at [speed-cmos.com/v3/docs](https://speed-cmos.com/v3/docs). These API 2 examples can be pasted into **Settings -> Plugins**.

## Solve notification

```javascript
cmos.on('solveAdded', solve => {
  void cmos.toast(`Recorded ${(solve.time / 1000).toFixed(2)}s`);
});
```

## Timer-state widget

```javascript
let timerState = await cmos.getTimerState();

cmos.registerWidget('timer-state', 'Timer State', () => ({
  type: 'text', text: timerState, tone: 'accent', size: 'large'
}));

cmos.on('timerStateChanged', async state => {
  timerState = state;
  await cmos.refreshWidget('timer-state');
});
```

## Persistent counter

```javascript
cmos.registerWidget('counter', 'Counter', async () => ({
  type: 'button',
  text: `Count: ${await cmos.storage.get('count', 0)}`,
  action: 'increment',
  tone: 'accent'
}), async action => {
  if (action !== 'increment') return;
  const count = await cmos.storage.get('count', 0);
  await cmos.storage.set('count', count + 1);
  await cmos.refreshWidget('counter');
});
```

## Async startup and cleanup

```javascript
const name = await cmos.prompt('Integration name?', 'My timer');
if (!name) throw new Error('A name is required');

const heartbeat = setInterval(() => console.log(`${name} alive`), 30_000);
cmos.onCleanup(() => clearInterval(heartbeat));
await cmos.toast(`${name} connected`);
```

## Custom scrambler and renderer

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

cmos.registerScrambleRenderer('text-only', async scramble => ({
  type: 'text', text: scramble.join(' '), size: 'large'
}));
```

## External controller transport

```javascript
// Requires the single "network" permission.
const response = await cmos.network.fetch({ url: 'https://controller.example/command' });
if (response.status === 200 && response.body === 'start') await cmos.startTimer();
```

## Session and statistics command

```javascript
cmos.registerCommand({
  id: 'training-summary',
  name: 'Training summary',
  defaultBinding: 'Alt+KeyS'
}, async () => {
  const stats = await cmos.getStatistics({ type: 'AVERAGE', size: 12 });
  await cmos.toast(`Current ao12: ${stats.current ?? 'not enough solves'}`);
});

const sessionId = await cmos.createSession({
  name: 'Plugin training',
  scramblerId: '3x3x3'
});
await cmos.updateSession(sessionId, { locked: false, tags: ['training'] });
```
