import { afterEach, describe, expect, it } from 'vitest';
import { PluginManager } from '../../plugins/PluginManager';
import {
	CMOSApi,
	CMOS_PLUGIN_API_VERSION,
	FullStateData,
	PluginScript,
	Settings,
	TimerState
} from '../../types';

const managers: PluginManager[] = [];

const makeState = (currentSessionId: string): FullStateData => ({
	sessions: [],
	solves: {},
	settings: {} as Settings,
	statsConfig: [],
	goals: [],
	plugins: [],
	currentSessionId,
	updatedAt: Date.now()
});

const makeHost = (getState: () => FullStateData, toasts: string[] = []): CMOSApi => ({
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
	nextScramble: () => undefined,
	previousScramble: () => undefined,
	toast: message => toasts.push(message),
	registerWidget: () => undefined,
	registerScrambler: () => undefined,
	registerScrambleRenderer: () => undefined,
	registerLanguage: () => undefined,
	registerTranslations: () => undefined,
	on: () => () => undefined,
	onCleanup: () => undefined,
	alert: async () => undefined,
	prompt: async () => null,
	storage: { get: (_key, fallback) => fallback, set: () => undefined, remove: () => undefined }
});

const script = (id: string, code: string, updates: Partial<PluginScript> = {}): PluginScript => ({
	id,
	name: id,
	code,
	enabled: true,
	...updates
});

const createManager = (): PluginManager => {
	const manager = new PluginManager();
	managers.push(manager);
	return manager;
};

afterEach(async () => {
	await Promise.all(managers.map(manager => manager.whenIdle()));
	managers.splice(0).forEach(manager => manager.destroy());
});

describe('PluginManager', () => {
	it('delegates API calls to the latest host without restarting the plugin', async () => {
		const manager = createManager();
		let state = makeState('first');
		manager.initialize(makeHost(() => state), [script('fresh-api', `
			cmos.registerWidget('state-reader', 'State reader', el => {
				el.value = cmos.getState().currentSessionId;
			});
		`)], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();

		const element = { value: '' } as unknown as HTMLElement & { value: string };
		manager.getWidget('state-reader')?.render(element);
		expect(element.value).toBe('first');

		state = makeState('second');
		manager.updateApi(makeHost(() => state));
		manager.getWidget('state-reader')?.render(element);
		expect(element.value).toBe('second');
	});

	it('awaits top-level async startup and commits registrations afterward', async () => {
		const manager = createManager();
		manager.initialize(makeHost(() => makeState('session')), [script('async', `
			await Promise.resolve();
			cmos.registerWidget('async-widget', 'Async widget', el => { el.ready = true; });
		`)], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		expect(manager.getWidget('async-widget')).toBeDefined();
		expect(manager.getStatus('async')?.state).toBe('active');
	});

	it('rolls back every registration and runs cleanup when startup fails', async () => {
		const manager = createManager();
		const toasts: string[] = [];
		manager.initialize(makeHost(() => makeState('session'), toasts), [script('rollback', `
			cmos.registerWidget('partial', 'Partial', () => {});
			cmos.onCleanup(() => cmos.toast('rolled-back'));
			throw new Error('startup failed');
		`)], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		expect(manager.getWidget('partial')).toBeUndefined();
		expect(toasts).toContain('rolled-back');
		expect(manager.getStatus('rollback')?.state).toBe('error');
	});

	it('cleans up once when a plugin is disabled', async () => {
		const manager = createManager();
		const toasts: string[] = [];
		const enabled = script('cleanup', `cmos.onCleanup(() => cmos.toast('cleaned'));`);
		const host = makeHost(() => makeState('session'), toasts);
		manager.initialize(host, [enabled], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		manager.initialize(host, [{ ...enabled, enabled: false }], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		expect(toasts.filter(message => message === 'cleaned')).toHaveLength(1);
		expect(manager.getStatus('cleanup')?.state).toBe('disabled');
	});

	it('keeps cleanup independent for every widget render instance', async () => {
		const manager = createManager();
		manager.initialize(makeHost(() => makeState('session')), [script('render-cleanup', `
			cmos.registerWidget('repeatable', 'Repeatable', el => {
				el.value += 'rendered';
				return () => { el.value += ':cleaned'; };
			});
		`)], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();

		const first = { value: '' } as unknown as HTMLElement & { value: string };
		const second = { value: '' } as unknown as HTMLElement & { value: string };
		const firstCleanup = manager.getWidget('repeatable')?.render(first);
		const secondCleanup = manager.getWidget('repeatable')?.render(second);
		if (typeof firstCleanup === 'function') firstCleanup();
		if (typeof secondCleanup === 'function') secondCleanup();
		expect(first.value).toBe('rendered:cleaned');
		expect(second.value).toBe('rendered:cleaned');
	});

	it('delivers events and removes listeners when disabled', async () => {
		const manager = createManager();
		const toasts: string[] = [];
		const enabled = script('events', `cmos.on('timerStateChanged', state => cmos.toast(state));`);
		const host = makeHost(() => makeState('session'), toasts);
		manager.initialize(host, [enabled], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		manager.emit('timerStateChanged', TimerState.RUNNING);
		manager.initialize(host, [{ ...enabled, enabled: false }], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		manager.emit('timerStateChanged', TimerState.STOPPED);
		expect(toasts).toEqual([TimerState.RUNNING]);
	});

	it('restores the last-known-good version after a failed edit', async () => {
		const manager = createManager();
		const host = makeHost(() => makeState('session'));
		const original = script('fallback', `cmos.registerWidget('stable', 'Stable', el => { el.value = 'working'; });`);
		manager.initialize(host, [original], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		manager.initialize(host, [{ ...original, code: `throw new Error('broken edit');` }], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();

		const element = { value: '' } as unknown as HTMLElement & { value: string };
		manager.getWidget('stable')?.render(element);
		expect(element.value).toBe('working');
		expect(manager.getStatus('fallback')?.state).toBe('fallback');
	});

	it('rejects duplicate plugin ids and incompatible API majors', async () => {
		const manager = createManager();
		const host = makeHost(() => makeState('session'));
		manager.initialize(host, [
			script('duplicate', `cmos.toast('one')`),
			script('duplicate', `cmos.toast('two')`),
			script('future', `cmos.toast('future')`, { apiVersion: '99.0.0' })
		], { alert: async () => undefined, prompt: async () => null });
		await manager.whenIdle();
		expect(manager.getStatus('duplicate')?.state).toBe('error');
		expect(manager.getStatus('future')?.state).toBe('incompatible');
	});
});
