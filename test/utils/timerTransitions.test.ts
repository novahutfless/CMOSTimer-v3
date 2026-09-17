import { describe, expect, it } from 'vitest';
import { StartInputMethod, TimerState } from '../../types';
import { areTimerStartKeysReady, isTimerStartKey, nextTimerPressIntent, nextTimerReleaseIntent } from '../../utils/timerTransitions';

const settings = (overrides: Partial<{ startInput: StartInputMethod; inspectionEnabled: boolean; holdToStart: boolean }> = {}) => ({
	startInput: StartInputMethod.SPACE, inspectionEnabled: false, holdToStart: true, ...overrides
});

describe('timer transitions', () => {
	it('recognizes configured trigger keys and dual-control readiness', () => {
		expect(isTimerStartKey(StartInputMethod.SPACE, 'Space')).toBe(true);
		expect(isTimerStartKey(StartInputMethod.SPACE, 'KeyA')).toBe(false);
		expect(isTimerStartKey(StartInputMethod.NEAR_SPACE, 'KeyX')).toBe(true);
		expect(areTimerStartKeysReady(StartInputMethod.CTRL_CTRL, new Set(['ControlLeft']))).toBe(false);
		expect(areTimerStartKeysReady(StartInputMethod.CTRL_CTRL, new Set(['ControlLeft', 'ControlRight']))).toBe(true);
	});

	it('models inspection, preparation, ready, split, and locked transitions', () => {
		expect(nextTimerPressIntent(TimerState.IDLE, settings({ inspectionEnabled: true }), new Set())).toBe('INSPECTION');
		expect(nextTimerPressIntent(TimerState.INSPECTION, settings({ holdToStart: true }), new Set())).toBe('PREPARE');
		expect(nextTimerPressIntent(TimerState.IDLE, settings({ holdToStart: false }), new Set())).toBe('READY');
		expect(nextTimerPressIntent(TimerState.RUNNING, settings(), new Set())).toBe('SPLIT');
		expect(nextTimerPressIntent(TimerState.LOCKED, settings(), new Set())).toBe('IGNORE');
	});

	it('models release behavior without browser events', () => {
		expect(nextTimerReleaseIntent(TimerState.READY, false)).toBe('START');
		expect(nextTimerReleaseIntent(TimerState.HOLDING, false)).toBe('CANCEL_TO_IDLE');
		expect(nextTimerReleaseIntent(TimerState.HOLDING, true)).toBe('CANCEL_TO_INSPECTION');
		expect(nextTimerReleaseIntent(TimerState.RUNNING, false)).toBe('IGNORE');
	});
});
