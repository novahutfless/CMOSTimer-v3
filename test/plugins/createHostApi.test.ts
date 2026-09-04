import { describe, expect, it, vi } from 'vitest';
import { createHostApi } from '../../plugins/runtime/createHostApi';
import { Penalty, PluginHostApi, Settings, StatType, TimerState } from '../../types';

const createApi = (): PluginHostApi => createHostApi({
	sessions: [{ id: 'session', name: 'Session', scramblerId: ['3x3x3'], solveIds: ['one', 'two', 'three'] }],
	solves: {
		one: { id: 'one', timestamp: 1, time: 1000, inspectionTime: -1, scramble: [[]], scramblerId: ['3x3x3'], penalty: Penalty.NONE },
		two: { id: 'two', timestamp: 2, time: 2000, inspectionTime: -1, scramble: [[]], scramblerId: ['3x3x3'], penalty: Penalty.NONE },
		three: { id: 'three', timestamp: 3, time: 3000, inspectionTime: -1, scramble: [[]], scramblerId: ['3x3x3'], penalty: Penalty.NONE }
	},
	settings: { shortcuts: {} } as Settings, statsConfig: [], goals: [], plugins: [], currentSessionId: 'session', timerState: TimerState.IDLE,
	getTimerElapsed: () => 0, currentScramble: [], startInspection: vi.fn(), startTimer: vi.fn(), stopTimer: vi.fn(() => null), cancelTimer: vi.fn(),
	addSolve: vi.fn(() => 'solve'), updateSolve: vi.fn(), deleteSolves: vi.fn(), updateSettings: vi.fn(), setCurrentSession: vi.fn(), nextScramble: vi.fn(), previousScramble: vi.fn(),
	createSession: vi.fn(() => 'created'), createSessions: vi.fn(() => ['created']), updateSession: vi.fn(), deleteSession: vi.fn(), deleteSessions: vi.fn(), deviceSupports: vi.fn(() => false), requestDevice: vi.fn(), writeDevice: vi.fn(), readDevice: vi.fn(), closeDevice: vi.fn(),
	pickTextFile: vi.fn(async () => null), saveTextFile: vi.fn(async () => undefined), readClipboardText: vi.fn(async () => ''), writeClipboardText: vi.fn(async () => undefined), networkFetch: vi.fn(async () => ({ status: 200, statusText: 'OK', headers: {}, body: '' })),
	toast: vi.fn(), alert: vi.fn(), prompt: vi.fn()
});

describe('plugin host additions', () => {
	it('calculates stable session statistics', () => {
		const result = createApi().getStatistics({ type: StatType.MEAN, size: 3 });
		expect(result).toMatchObject({ count: 3, validCount: 3, totalTime: 6000, current: 2000, best: 2000 });
		expect(result.bestSolveIds).toEqual(['one', 'two', 'three']);
	});

	it('exposes session creation through the host adapter', () => {
		const api = createApi();
		expect(api.createSession({ name: 'Training', scramblerId: '3x3x3', customScramblerConfig: { moves: 'R U', opposites: 'R R', length: 20 } })).toBe('created');
		expect(api.createSessions([{ name: 'One', scramblerId: '3x3x3' }], { selection: 'none' })).toEqual(['created']);
		expect(api.deleteSessions(['session'])).toBeUndefined();
	});
});
