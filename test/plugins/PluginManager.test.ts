import { afterEach, describe, expect, it, vi } from 'vitest';
import { PluginManager } from '../../plugins/PluginManager';
import { CMOS_PLUGIN_API_VERSION, FullStateData, PLUGIN_PERMISSIONS, PluginHostApi, PluginScript, Settings, TimerState } from '../../types';
import { WorkerRegistrations } from '../../plugins/runtime/workerProtocol';

const managers: PluginManager[] = [];
const makeState = (currentSessionId: string): FullStateData => ({
	sessions: [], solves: {}, settings: {} as Settings, statsConfig: [], goals: [], plugins: [], currentSessionId, updatedAt: Date.now()
});
const makeHost = (getState: () => FullStateData, toasts: string[] = []): PluginHostApi => ({
	apiVersion: CMOS_PLUGIN_API_VERSION,
	getState,
	getTimerState: () => TimerState.IDLE,
	getTimerElapsed: () => 0,
	getCurrentScramble: () => [],
	startInspection: () => undefined,
	startTimer: () => undefined,
	stopTimer: () => null,
	cancelTimer: () => undefined,
	addSolve: () => 'solve-id',
	addSolveWithDetails: () => 'solve-id',
	updateSolve: () => undefined,
	deleteSolves: () => undefined,
	updateSettings: () => undefined,
	setCurrentSession: () => undefined,
	createSession: () => 'session-id',
	createSessions: () => ['session-id'],
	updateSession: () => undefined,
	deleteSession: () => undefined,
	deleteSessions: () => undefined,
	pickTextFile: async () => null,
	saveTextFile: async () => undefined,
	readClipboardText: async () => '',
	writeClipboardText: async () => undefined,
	networkFetch: async () => ({ status: 200, statusText: 'OK', headers: {}, body: '' }),
	getStatistics: () => ({ count: 0, validCount: 0, totalTime: 0, current: null, best: null, bestSolveIds: [] }),
	deviceSupports: () => false,
	requestDevice: async () => ({ id: 'device', kind: 'serial', name: 'Device' }),
	writeDevice: async () => undefined,
	readDevice: async () => [],
	closeDevice: async () => undefined,
	nextScramble: () => undefined,
	previousScramble: () => undefined,
	toast: (message): void => {
		toasts.push(message);
	},
	alert: async () => undefined,
	prompt: async () => null
});
const script = (id: string, code: string, updates: Partial<PluginScript> = {}): PluginScript => ({ id, name: id, code, enabled: true, apiVersion: CMOS_PLUGIN_API_VERSION, permissions: [...PLUGIN_PERMISSIONS], ...updates });
const createDirectManager = (): PluginManager => {
	const manager = new PluginManager({ executionMode: 'direct' });
	managers.push(manager);
	return manager;
};

afterEach(async () => {
	await Promise.all(managers.map(async manager => {
		await manager.whenIdle();
		await manager.destroy();
	}));
	managers.splice(0);
});

describe('PluginManager', () => {
	it('denies worker RPC that was not explicitly granted', async () => {
		let requestHost: ((method: 'getState', args: unknown[]) => Promise<unknown>) | undefined;
		const manager = new PluginManager({ workerRuntimeFactory: (handler): { start: () => Promise<WorkerRegistrations>; invoke: () => Promise<void>; emit: () => void; cleanup: () => Promise<void> } => {
			requestHost = handler as typeof requestHost;
			return {
				start: async (): Promise<WorkerRegistrations> => ({ widgets: [], renderers: [], scramblers: [], languages: [], translations: [], events: [], commands: [] }),
				invoke: async (): Promise<void> => undefined,
				emit: (): void => undefined,
				cleanup: async (): Promise<void> => undefined
			};
		} });
		managers.push(manager);
		manager.initialize(makeHost(() => makeState('private')), [script('no-state', '// isolated', { permissions: [] })]);
		await manager.whenIdle();
		await expect(requestHost?.('getState', [])).rejects.toThrow('state:read');
	});

	it('registers and executes declarative commands', async () => {
		const toasts: string[] = [];
		const manager = createDirectManager();
		manager.initialize(makeHost(() => makeState('session'), toasts), [script('commands', `
cmos.registerCommand({ id: 'hello', name: 'Hello', defaultBinding: 'Alt+KeyH' }, async () => cmos.toast('command ran'));
`)]);
		await manager.whenIdle();
		expect(manager.getCommands()).toContainEqual(expect.objectContaining({ id: 'hello', defaultBinding: 'Alt+KeyH' }));
		await manager.runCommand('hello');
		expect(toasts).toContain('command ran');
	});

	it('invalidates only the widget that requests a refresh', async () => {
		const manager = createDirectManager();
		manager.initialize(makeHost(() => makeState('session')), [script('widget-refresh', `
			cmos.registerWidget('one', 'One', () => 'one', async action => { if (action === 'refresh') await cmos.refreshWidget('one'); });
			cmos.registerWidget('two', 'Two', () => 'two');
		`)]);
		await manager.whenIdle();
		expect(manager.getWidgetRevision('one')).toBe(0);
		expect(manager.getWidgetRevision('two')).toBe(0);
		await manager.getWidget('one')?.handleAction?.('refresh');
		expect(manager.getWidgetRevision('one')).toBe(1);
		expect(manager.getWidgetRevision('two')).toBe(0);
	});

	it('commits worker registrations as host-side proxies with bounded RPC', async () => {
		const toasts: string[] = [];
		let requestHost: ((method: 'toast', args: unknown[]) => Promise<unknown>) | undefined;
		const emit = vi.fn();
		const cleanup = vi.fn(async () => undefined);
		const manager = new PluginManager({
			workerRuntimeFactory: (handler): {
				start: () => Promise<{ widgets: Array<{ id: string; name: string; hasActionHandler: boolean }>; renderers: []; scramblers: []; languages: []; translations: []; events: ['timerStateChanged']; commands: [] }>;
				invoke: () => Promise<{ type: 'text'; text: string }>;
				emit: typeof emit;
				cleanup: typeof cleanup;
			} => {
				requestHost = handler as typeof requestHost;
				return {
					start: async (): Promise<{ widgets: Array<{ id: string; name: string; hasActionHandler: boolean }>; renderers: []; scramblers: []; languages: []; translations: []; events: ['timerStateChanged']; commands: [] }> => ({
						widgets: [{ id: 'worker-widget', name: 'Worker Widget', hasActionHandler: false }],
						renderers: [], scramblers: [], languages: [], translations: [], events: ['timerStateChanged'], commands: []
					}),
					invoke: async (): Promise<{ type: 'text'; text: string }> => ({ type: 'text', text: 'from worker' }),
					emit,
					cleanup
				};
			}
		});
		managers.push(manager);
		manager.initialize(makeHost(() => makeState('session'), toasts), [script('worker-proxy', '// worker source')]);
		await manager.whenIdle();
		expect(await manager.getWidget('worker-widget')?.render()).toEqual({ type: 'text', text: 'from worker' });
		await requestHost?.('toast', ['isolated toast']);
		expect(toasts).toContain('isolated toast');
		manager.emit('timerStateChanged', TimerState.RUNNING);
		expect(emit).toHaveBeenCalledWith('timerStateChanged', TimerState.RUNNING);
	});

	it('fails closed when worker isolation is unavailable', async () => {
		const manager = new PluginManager();
		managers.push(manager);
		manager.initialize(makeHost(() => makeState('session')), [script('isolated', `await cmos.toast('never');`)]);
		await manager.whenIdle();
		expect(manager.getStatus('isolated')?.state).toBe('unsupported');
	});

	it('delegates asynchronous API calls to the latest host without restarting', async () => {
		const manager = createDirectManager();
		let state = makeState('first');
		manager.initialize(makeHost(() => state), [script('fresh-api', `
			cmos.registerWidget('state-reader', 'State reader', async () => ({ type: 'text', text: (await cmos.getState()).currentSessionId }));
		`)]);
		await manager.whenIdle();
		expect(await manager.getWidget('state-reader')?.render()).toMatchObject({ text: 'first' });
		state = makeState('second');
		manager.updateApi(makeHost(() => state));
		expect(await manager.getWidget('state-reader')?.render()).toMatchObject({ text: 'second' });
	});

	it('awaits top-level async startup and commits afterward', async () => {
		const manager = createDirectManager();
		manager.initialize(makeHost(() => makeState('session')), [script('async', `
			await Promise.resolve();
			cmos.registerWidget('async-widget', 'Async widget', () => 'ready');
		`)]);
		await manager.whenIdle();
		expect(await manager.getWidget('async-widget')?.render()).toBe('ready');
		expect(manager.getStatus('async')?.state).toBe('active');
	});

	it('rolls back registrations and runs cleanup on startup failure', async () => {
		const manager = createDirectManager();
		const toasts: string[] = [];
		manager.initialize(makeHost(() => makeState('session'), toasts), [script('rollback', `
			cmos.registerWidget('partial', 'Partial', () => 'partial');
			cmos.onCleanup(() => cmos.toast('rolled-back'));
			throw new Error('startup failed');
		`)]);
		await manager.whenIdle();
		expect(manager.getWidget('partial')).toBeUndefined();
		expect(toasts).toContain('rolled-back');
		expect(manager.getStatus('rollback')?.state).toBe('error');
	});

	it('cleans up exactly once when disabled', async () => {
		const manager = createDirectManager();
		const toasts: string[] = [];
		const enabled = script('cleanup', `cmos.onCleanup(() => cmos.toast('cleaned'));`);
		const host = makeHost(() => makeState('session'), toasts);
		manager.initialize(host, [enabled]);
		await manager.whenIdle();
		manager.initialize(host, [{ ...enabled, enabled: false }]);
		await manager.whenIdle();
		expect(toasts.filter(message => message === 'cleaned')).toHaveLength(1);
	});

	it('delivers subscribed events and removes them when disabled', async () => {
		const manager = createDirectManager();
		const toasts: string[] = [];
		const enabled = script('events', `cmos.on('timerStateChanged', state => cmos.toast(state));`);
		const host = makeHost(() => makeState('session'), toasts);
		manager.initialize(host, [enabled]);
		await manager.whenIdle();
		manager.emit('timerStateChanged', TimerState.RUNNING);
		await Promise.resolve();
		manager.initialize(host, [{ ...enabled, enabled: false }]);
		await manager.whenIdle();
		manager.emit('timerStateChanged', TimerState.STOPPED);
		expect(toasts).toEqual([TimerState.RUNNING]);
	});

	it('restores the last-known-good source after a failed edit', async () => {
		const manager = createDirectManager();
		const host = makeHost(() => makeState('session'));
		const original = script('fallback', `cmos.registerWidget('stable', 'Stable', () => 'working');`);
		manager.initialize(host, [original]);
		await manager.whenIdle();
		manager.initialize(host, [{ ...original, code: `throw new Error('broken edit');` }]);
		await manager.whenIdle();
		expect(await manager.getWidget('stable')?.render()).toBe('working');
		expect(manager.getStatus('fallback')?.state).toBe('fallback');
	});

	it('rejects duplicate ids and incompatible API majors', async () => {
		const manager = createDirectManager();
		manager.initialize(makeHost(() => makeState('session')), [
			script('duplicate', `await cmos.toast('one')`),
			script('duplicate', `await cmos.toast('two')`),
			script('future', `await cmos.toast('future')`, { apiVersion: '99.0.0' })
		]);
		await manager.whenIdle();
		expect(manager.getStatus('duplicate')?.state).toBe('error');
		expect(manager.getStatus('future')?.state).toBe('incompatible');
	});

	it('rejects newer API minors, patches, and malformed versions', async () => {
		const manager = createDirectManager();
		manager.initialize(makeHost(() => makeState('session')), [
			script('minor', '// future minor', { apiVersion: '2.4.0' }),
			script('patch', '// future patch', { apiVersion: '2.3.1' }),
			script('malformed', '// malformed', { apiVersion: '2' })
		]);
		await manager.whenIdle();
		expect(manager.getStatus('minor')?.state).toBe('incompatible');
		expect(manager.getStatus('patch')?.state).toBe('incompatible');
		expect(manager.getStatus('malformed')?.state).toBe('incompatible');
	});

	it('rejects reserved command ids and built-in shortcut conflicts', async () => {
		const manager = createDirectManager();
		const state = makeState('session');
		state.settings = { shortcuts: { NEXT_SCRAMBLE: 'Digit2' } } as unknown as Settings;
		manager.initialize(makeHost(() => state), [
			script('reserved-command', `cmos.registerCommand({ id: 'settings', name: 'Bad' }, () => {});`),
			script('binding-conflict', `cmos.registerCommand({ id: 'conflict', name: 'Bad', defaultBinding: 'Digit2' }, () => {});`)
		]);
		await manager.whenIdle();
		expect(manager.getStatus('reserved-command')?.message).toMatch(/reserved/);
		expect(manager.getStatus('binding-conflict')?.message).toMatch(/built-in shortcut/);
	});
});
