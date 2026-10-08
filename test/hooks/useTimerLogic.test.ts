import { beforeEach, describe, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));
vi.mock('react', () => ({
 useRef: (value: unknown) => ({ current: value }),
 useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) hooks.cleanups.push(cleanup); }
}));
import { useTimerLogic } from '../../hooks/useTimerLogic';
import { DEFAULT_SETTINGS } from '../../store/defaults';
import { TimerState, StartInputMethod } from '../../types';
let listeners: Record<string, (event: KeyboardEvent) => void>;
beforeEach(() => {
 hooks.cleanups.splice(0).forEach(cleanup => cleanup());
 listeners = {};
 vi.stubGlobal('window', { addEventListener: (type: string, handler: (event: KeyboardEvent) => void) => { listeners[type] = handler; }, removeEventListener: vi.fn() });
});
function setup(state = TimerState.IDLE) {
 const callbacks = { onTimerStart: vi.fn(), onTimerStop: vi.fn(), onInspectionStart: vi.fn(), onPrepare: vi.fn(), onReady: vi.fn(), onCancelPrepare: vi.fn(), onSplit: vi.fn() };
 useTimerLogic(state, { ...DEFAULT_SETTINGS, startInput: StartInputMethod.SPACE, inspectionEnabled: false, holdToStart: false }, 1, callbacks);
 return callbacks;
}
function key(target = { tagName: 'BUTTON', closest: () => null }, repeat = false) {
 return { code: 'Space', target, repeat, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}
describe('timer keyboard defaults', () => {
 it('consumes Space on a focused session button on both press and release', () => {
  const callbacks = setup(TimerState.READY);
  const down = key(), up = key();
  listeners.keydown!(down); listeners.keyup!(up);
  expect(down.preventDefault).toHaveBeenCalledOnce();
  expect(up.preventDefault).toHaveBeenCalledOnce();
  expect(callbacks.onTimerStart).toHaveBeenCalledOnce();
 });
 it('consumes repeated Space without triggering the timer twice', () => {
  const callbacks = setup(); const down = key(), repeat = key(undefined, true);
  listeners.keydown!(down); listeners.keydown!(repeat);
  expect(repeat.preventDefault).toHaveBeenCalledOnce();
  expect(callbacks.onReady).toHaveBeenCalledOnce();
 });
 it.each(['input', 'dialog'])('preserves keyboard interaction in an %s', kind => {
  const callbacks = setup();
  const event = key({ tagName: kind === 'input' ? 'INPUT' : 'BUTTON', closest: () => kind === 'dialog' ? {} as never : null });
  listeners.keydown!(event);
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(callbacks.onReady).not.toHaveBeenCalled();
 });
});
