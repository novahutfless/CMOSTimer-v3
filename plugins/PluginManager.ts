import {
	CMOSApi,
	CMOS_PLUGIN_API_VERSION,
	CustomScramblerDefinition,
	PluginEventCallback,
	PluginEventMap,
	PluginEventName,
	PluginHostApi,
	PluginLanguageDefinition,
	PluginRuntimeStatus,
	PluginScramblerDefinition,
	PluginScrambleRendererDefinition,
	PluginScript,
	PluginUiNode,
	PluginWidgetDefinition
} from '../types';
import { unregisterPluginLocalizations, registerPluginLanguage, registerPluginTranslations } from '../translations';
import { generateCustom } from '../utils/movegen/custom';
import { registerPluginScrambler, unregisterPluginScramblers } from '../utils/scramblerRegistry';
import { createPluginApi } from './runtime/createPluginApi';
import { OwnedRegistry } from './runtime/OwnedRegistry';
import { createPluginStorage } from './runtime/pluginStorage';
import {
	ensureNonEmptyString,
	validateLanguageRegistration,
	validateScramblerRegistration,
	validateTranslations,
	validateUiNode
} from './runtime/pluginValidation';
import { WorkerPluginRuntime } from './runtime/WorkerPluginRuntime';
import { PluginHostMethod, WorkerInvocation, WorkerRegistrations } from './runtime/workerProtocol';

type DirectPendingRegistrations = {
	widgets: PluginWidgetDefinition[];
	renderers: PluginScrambleRendererDefinition[];
	scramblers: PluginScramblerDefinition[];
	languages: PluginLanguageDefinition[];
	translations: Array<{ languageCode: string; translations: Record<string, string> }>;
	events: Array<{ event: PluginEventName; callback: PluginEventCallback; enabled: boolean; remove?: () => void }>;
	cleanups: Array<() => Promise<void>>;
};

type RuntimeListener = (payload: unknown) => void;
type PluginExecutionMode = 'worker' | 'direct';
type IsolatedPluginRuntime = {
	start: (code: string) => Promise<WorkerRegistrations>;
	invoke: (invocation: WorkerInvocation) => Promise<PluginUiNode | void>;
	emit: (event: PluginEventName, payload: unknown) => void;
	cleanup: () => Promise<void>;
};
type PluginManagerOptions = {
	executionMode?: PluginExecutionMode;
	workerRuntimeFactory?: (handleRequest: (method: PluginHostMethod, args: unknown[]) => Promise<unknown>) => IsolatedPluginRuntime;
};

const fingerprintScripts = (scripts: PluginScript[]): string => JSON.stringify(scripts.map(script => ({
	id: script.id, code: script.code, enabled: script.enabled, apiVersion: script.apiVersion, lastKnownGoodCode: script.lastKnownGoodCode
})));

const isApiCompatible = (requiredVersion?: string): boolean => {
	if (!requiredVersion) return true;
	const requiredMajor = Number.parseInt(requiredVersion.split('.')[0] || '', 10);
	const currentMajor = Number.parseInt(CMOS_PLUGIN_API_VERSION.split('.')[0] || '', 10);
	return Number.isFinite(requiredMajor) && requiredMajor === currentMajor;
};

const assertPayloadSize = (value: unknown): void => {
	const serialized = JSON.stringify(value);
	if (serialized !== undefined && serialized.length > 1_000_000) throw new Error('Plugin request exceeds the 1 MB payload limit.');
};

const PLUGIN_EVENTS = new Set<PluginEventName>(['stateChanged', 'timerStateChanged', 'scrambleChanged', 'sessionChanged', 'solveAdded']);
const assertRegistrationLimits = (registrations: WorkerRegistrations): void => {
	if (!registrations || typeof registrations !== 'object') throw new Error('Worker returned invalid registrations.');
	const limits: Array<[unknown, number, string]> = [
		[registrations.widgets, 100, 'widgets'],
		[registrations.renderers, 100, 'scramble renderers'],
		[registrations.scramblers, 100, 'scramblers'],
		[registrations.languages, 50, 'languages'],
		[registrations.translations, 500, 'translation groups'],
		[registrations.events, PLUGIN_EVENTS.size, 'event subscriptions']
	];
	for (const [items, limit, label] of limits) {
		if (!Array.isArray(items)) throw new Error(`Plugin ${label} registration must be an array.`);
		if (items.length > limit) throw new Error(`A plugin may register at most ${limit} ${label}.`);
	}
};

const ensureFiniteTime = (value: unknown, label: string): number => {
	const time = Number(value);
	if (!Number.isFinite(time) || time < 0) throw new Error(`${label} must be a finite, non-negative number.`);
	return time;
};

const ensureObject = (value: unknown, label: string): Record<string, unknown> => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
	return value as Record<string, unknown>;
};

export class PluginManager {
	private static instance: PluginManager;
	private api: PluginHostApi | null = null;
	private readonly executionMode: PluginExecutionMode;
	private readonly widgets = new OwnedRegistry<PluginWidgetDefinition>({ kind: 'widget' });
	private readonly renderers = new OwnedRegistry<PluginScrambleRendererDefinition>({ kind: 'scramble renderer' });
	private activeScripts: PluginScript[] = [];
	private requestedFingerprint = '';
	private readonly directCleanups = new Map<string, Array<() => Promise<void>>>();
	private readonly workerRuntimes = new Map<string, IsolatedPluginRuntime>();
	private readonly workerRuntimeFactory: NonNullable<PluginManagerOptions['workerRuntimeFactory']>;
	private readonly eventListeners = new Map<PluginEventName, Map<string, Set<RuntimeListener>>>();
	private readonly subscribers = new Set<() => void>();
	private readonly statuses = new Map<string, PluginRuntimeStatus>();
	private readonly lastKnownGoodCodes = new Map<string, string>();
	private revision = 0;
	private reloadQueue: Promise<void> = Promise.resolve();

	public constructor(options: PluginManagerOptions = {}) {
		this.executionMode = options.executionMode || 'worker';
		this.workerRuntimeFactory = options.workerRuntimeFactory || ((handleRequest): WorkerPluginRuntime => new WorkerPluginRuntime(handleRequest));
	}

	public static getInstance(): PluginManager {
		if (!PluginManager.instance) PluginManager.instance = new PluginManager();
		return PluginManager.instance;
	}

	public initialize(api: PluginHostApi, scripts: PluginScript[]): void {
		this.api = api;
		const nextFingerprint = fingerprintScripts(scripts);
		if (nextFingerprint === this.requestedFingerprint) return;
		this.requestedFingerprint = nextFingerprint;
		const requestedScripts = scripts.map(script => ({ ...script }));
		this.reloadQueue = this.reloadQueue.then(() => this.reloadPlugins(requestedScripts)).catch(error => {
			console.error('[PluginManager] Reload failed:', error);
		});
	}

	public updateApi(api: PluginHostApi): void {
		this.api = api;
	}

	public whenIdle(): Promise<void> {
		return this.reloadQueue;
	}

	private async reloadPlugins(newScripts: PluginScript[]): Promise<void> {
		const duplicateIds = new Set<string>();
		const seenIds = new Set<string>();
		newScripts.forEach(script => {
			if (seenIds.has(script.id)) duplicateIds.add(script.id);
			seenIds.add(script.id);
		});
		const newScriptMap = new Map(newScripts.map(script => [script.id, script]));
		for (const oldScript of this.activeScripts) {
			const next = newScriptMap.get(oldScript.id);
			if (!next || !next.enabled || next.code !== oldScript.code || next.apiVersion !== oldScript.apiVersion || duplicateIds.has(oldScript.id)) {
				await this.cleanupPlugin(oldScript.id);
			}
		}

		duplicateIds.forEach(id => this.setStatus(id, 'error', `Duplicate plugin id "${id}".`));
		for (const script of newScripts) {
			if (duplicateIds.has(script.id)) continue;
			if (!script.enabled) {
				this.setStatus(script.id, 'disabled');
				continue;
			}
			if (!isApiCompatible(script.apiVersion)) {
				this.setStatus(script.id, 'incompatible', `Requires plugin API ${script.apiVersion}; this app provides ${CMOS_PLUGIN_API_VERSION}.`);
				continue;
			}
			const oldScript = this.activeScripts.find(existing => existing.id === script.id);
			const shouldStart = !oldScript || !oldScript.enabled || oldScript.code !== script.code || oldScript.apiVersion !== script.apiVersion;
			if (!shouldStart) continue;

			await this.cleanupPlugin(script.id);
			this.setStatus(script.id, 'loading');
			const primaryError = await this.runScript(script.id, script.name, script.code);
			if (!primaryError) {
				this.lastKnownGoodCodes.set(script.id, script.code);
				this.setStatus(script.id, 'active');
				continue;
			}
			const fallbackCode = script.lastKnownGoodCode || this.lastKnownGoodCodes.get(script.id);
			if (fallbackCode && fallbackCode !== script.code) {
				await this.cleanupPlugin(script.id);
				const fallbackError = await this.runScript(script.id, script.name, fallbackCode);
				if (!fallbackError) {
					this.setStatus(script.id, 'fallback', `Edited version failed; running last-known-good code. ${primaryError}`);
					this.api?.toast(`Plugin ${script.name} failed to update; restored its last-known-good version.`);
					continue;
				}
			}
			const unsupported = primaryError.includes('Web Workers are not available') || primaryError.includes('Plugin worker isolation');
			this.setStatus(script.id, unsupported ? 'unsupported' : 'error', primaryError);
			this.api?.toast(`Plugin Error (${script.name}): ${primaryError}`);
		}

		const currentIds = new Set(newScripts.map(script => script.id));
		for (const id of this.statuses.keys()) if (!currentIds.has(id)) this.statuses.delete(id);
		this.activeScripts = newScripts;
		this.notify();
	}

	private async cleanupPlugin(id: string): Promise<void> {
		unregisterPluginLocalizations(id);
		unregisterPluginScramblers(id);
		this.removeEventListeners(id);
		this.widgets.unregisterOwner(id);
		this.renderers.unregisterOwner(id);
		const runtime = this.workerRuntimes.get(id);
		this.workerRuntimes.delete(id);
		if (runtime) await runtime.cleanup();
		const cleanups = this.directCleanups.get(id) || [];
		this.directCleanups.delete(id);
		for (const cleanup of cleanups) {
			try {
				await cleanup();
			} catch (error) {
				console.error(`Error in cleanup for plugin ${id}`, error);
			}
		}
	}

	private async runScript(pluginId: string, pluginName: string, code: string): Promise<string | null> {
		if (!this.api) return 'Plugin API is not initialized.';
		try {
			if (this.executionMode === 'direct') await this.runDirectScript(pluginId, code);
			else await this.runWorkerScript(pluginId, code);
			return null;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[PluginManager] Error executing ${pluginName}:`, error);
			await this.cleanupPlugin(pluginId);
			return message;
		}
	}

	private async runWorkerScript(pluginId: string, code: string): Promise<void> {
		const runtime = this.workerRuntimeFactory((method, args) => this.handleHostRequest(pluginId, method, args));
		this.workerRuntimes.set(pluginId, runtime);
		const registrations = await runtime.start(code);
		this.commitWorkerRegistrations(pluginId, runtime, registrations);
	}

	private async runDirectScript(pluginId: string, code: string): Promise<void> {
		const pending: DirectPendingRegistrations = { widgets: [], renderers: [], scramblers: [], languages: [], translations: [], events: [], cleanups: [] };
		const contextApi = this.createDirectContextApi(pluginId, pending);
		const execute = new Function('cmos', `"use strict"; return (async () => {\n${code}\n})();`);
		try {
			await Promise.resolve(execute(contextApi));
			this.commitDirectRegistrations(pluginId, pending);
		} catch (error) {
			for (const cleanup of pending.cleanups) await cleanup();
			throw error;
		}
	}

	private commitWorkerRegistrations(pluginId: string, runtime: IsolatedPluginRuntime, registrations: WorkerRegistrations): void {
		assertRegistrationLimits(registrations);
		registrations.languages.forEach(definition => registerPluginLanguage(pluginId, validateLanguageRegistration(definition)));
		registrations.translations.forEach(item => registerPluginTranslations(pluginId, ensureNonEmptyString(item.languageCode, 'Language code', 50), validateTranslations(item.translations)));
		registrations.scramblers.forEach(definition => this.registerDeclarativeScrambler(pluginId, validateScramblerRegistration(definition)));
		registrations.widgets.forEach(definition => {
			const id = ensureNonEmptyString(definition.id, 'Widget id', 100);
			const name = ensureNonEmptyString(definition.name, 'Widget name');
			this.widgets.register(pluginId, id, {
				id,
				name,
				render: async () => validateUiNode(await runtime.invoke({ kind: 'renderWidget', key: id })),
				...(definition.hasActionHandler ? { handleAction: async (action: string): Promise<void> => {
					await runtime.invoke({ kind: 'widgetAction', key: id, payload: action });
				} } : {})
			});
		});
		registrations.renderers.forEach(definition => {
			const visualizerType = ensureNonEmptyString(definition.visualizerType, 'Renderer visualizer type', 100);
			this.renderers.register(pluginId, visualizerType, {
				visualizerType,
				render: async (scramble, config) => validateUiNode(await runtime.invoke({ kind: 'renderScramble', key: visualizerType, payload: { scramble, config } }))
			});
		});
		registrations.events.forEach(event => {
			if (!PLUGIN_EVENTS.has(event)) throw new Error(`Unknown plugin event "${String(event)}".`);
			this.addEventListener(pluginId, event, payload => runtime.emit(event, payload));
		});
	}

	private commitDirectRegistrations(pluginId: string, pending: DirectPendingRegistrations): void {
		this.directCleanups.set(pluginId, pending.cleanups);
		pending.languages.forEach(definition => registerPluginLanguage(pluginId, definition));
		pending.translations.forEach(item => registerPluginTranslations(pluginId, item.languageCode, item.translations));
		pending.scramblers.forEach(definition => this.registerDeclarativeScrambler(pluginId, definition));
		pending.widgets.forEach(definition => this.widgets.register(pluginId, definition.id, definition));
		pending.renderers.forEach(definition => this.renderers.register(pluginId, definition.visualizerType, definition));
		pending.events.filter(registration => registration.enabled).forEach(registration => {
			registration.remove = this.addEventListener(pluginId, registration.event, registration.callback as RuntimeListener);
		});
	}

	private registerDeclarativeScrambler(pluginId: string, definition: PluginScramblerDefinition): void {
		const hostDefinition: CustomScramblerDefinition = {
			id: definition.id,
			name: definition.name,
			category: definition.category,
			visualizer: definition.visualizer,
			generate: length => generateCustom({
				moves: definition.moves.join(' '),
				opposites: definition.opposites?.join(' ') || '',
				length: length ?? definition.length
			})
		};
		registerPluginScrambler(pluginId, hostDefinition);
	}

	private createDirectContextApi(pluginId: string, pending: DirectPendingRegistrations): CMOSApi {
		return createPluginApi({
			pluginId,
			getHostApi: () => {
				if (!this.api) throw new Error('Plugin API is not initialized.');
				return this.api;
			},
			stageWidget: definition => pending.widgets.push(definition),
			stageRenderer: definition => pending.renderers.push(definition),
			stageScrambler: definition => pending.scramblers.push(definition),
			stageLanguage: definition => pending.languages.push(definition),
			stageTranslations: (languageCode, translations) => pending.translations.push({ languageCode, translations }),
			stageEvent: (event, callback) => {
				const registration: DirectPendingRegistrations['events'][number] = { event, callback, enabled: true };
				pending.events.push(registration);
				return () => {
					registration.enabled = false;
					registration.remove?.();
				};
			},
			registerCleanup: callback => pending.cleanups.push(callback),
			refreshWidget: () => this.notify()
		});
	}

	private async handleHostRequest(pluginId: string, method: PluginHostMethod, args: unknown[]): Promise<unknown> {
		if (!this.api) throw new Error('Plugin API is not initialized.');
		assertPayloadSize(args);
		const api = this.api;
		const storage = createPluginStorage(pluginId);
		switch (method) {
		case 'getState': return api.getState();
		case 'getTimerState': return api.getTimerState();
		case 'getTimerElapsed': return api.getTimerElapsed();
		case 'getCurrentScramble': return api.getCurrentScramble();
		case 'startInspection': return api.startInspection();
		case 'startTimer': return api.startTimer();
		case 'stopTimer': return api.stopTimer(args[0] === undefined ? undefined : ensureObject(args[0], 'Timer stop input') as Parameters<PluginHostApi['stopTimer']>[0]);
		case 'cancelTimer': return api.cancelTimer();
		case 'addSolve': return api.addSolve(ensureFiniteTime(args[0], 'Solve time'), args[1] as Parameters<PluginHostApi['addSolve']>[1]);
		case 'addSolveWithDetails': {
			const input = ensureObject(args[0], 'Solve input');
			return api.addSolveWithDetails({ ...input, time: ensureFiniteTime(input.time, 'Solve time') } as unknown as Parameters<PluginHostApi['addSolveWithDetails']>[0]);
		}
		case 'updateSolve': return api.updateSolve(ensureNonEmptyString(args[0], 'Solve id', 100), ensureObject(args[1], 'Solve updates') as Parameters<PluginHostApi['updateSolve']>[1]);
		case 'deleteSolves': {
			if (!Array.isArray(args[0])) throw new Error('Solve ids must be an array.');
			return api.deleteSolves(args[0].map(id => ensureNonEmptyString(id, 'Solve id', 100)), args[1] === undefined ? undefined : ensureNonEmptyString(args[1], 'Session id', 100));
		}
		case 'updateSettings': return api.updateSettings(ensureObject(args[0], 'Settings update') as Parameters<PluginHostApi['updateSettings']>[0]);
		case 'setCurrentSession': return api.setCurrentSession(ensureNonEmptyString(args[0], 'Session id', 100));
		case 'nextScramble': return api.nextScramble();
		case 'previousScramble': return api.previousScramble();
		case 'toast': return api.toast(ensureNonEmptyString(args[0], 'Toast message', 2000));
		case 'alert': return api.alert(ensureNonEmptyString(args[0], 'Alert message', 20_000));
		case 'prompt': return api.prompt(ensureNonEmptyString(args[0], 'Prompt message', 20_000), typeof args[1] === 'string' ? args[1].slice(0, 20_000) : undefined);
		case 'storageGet': return storage.get(ensureNonEmptyString(args[0], 'Storage key', 200), args[1]);
		case 'storageSet': return storage.set(ensureNonEmptyString(args[0], 'Storage key', 200), args[1]);
		case 'storageRemove': return storage.remove(ensureNonEmptyString(args[0], 'Storage key', 200));
		case 'refreshWidget':
			ensureNonEmptyString(args[0], 'Widget id', 100);
			this.notify();
			return undefined;
		default: throw new Error(`Unknown plugin host method "${String(method)}".`);
		}
	}

	private addEventListener(pluginId: string, event: PluginEventName, callback: RuntimeListener): () => void {
		const byOwner = this.eventListeners.get(event) || new Map<string, Set<RuntimeListener>>();
		const listeners = byOwner.get(pluginId) || new Set<RuntimeListener>();
		listeners.add(callback);
		byOwner.set(pluginId, listeners);
		this.eventListeners.set(event, byOwner);
		return () => listeners.delete(callback);
	}

	private removeEventListeners(pluginId: string): void {
		for (const byOwner of this.eventListeners.values()) byOwner.delete(pluginId);
	}

	public emit<K extends PluginEventName>(event: K, payload: PluginEventMap[K]): void {
		this.eventListeners.get(event)?.forEach((listeners, pluginId) => listeners.forEach(listener => {
			try {
				listener(payload);
			} catch (error) {
				console.error(`Error in ${event} listener for plugin ${pluginId}:`, error);
			}
		}));
	}

	private setStatus(pluginId: string, state: PluginRuntimeStatus['state'], message?: string): void {
		this.statuses.set(pluginId, { pluginId, state, updatedAt: Date.now(), ...(message === undefined ? {} : { message }) });
		this.notify();
	}

	private notify(): void {
		this.revision += 1;
		this.subscribers.forEach(listener => listener());
	}

	public subscribe = (listener: () => void): (() => void) => {
		this.subscribers.add(listener);
		return () => this.subscribers.delete(listener);
	};
	public getRevision = (): number => this.revision;
	public getStatus(id: string): PluginRuntimeStatus | undefined {
		return this.statuses.get(id);
	}
	public getWidget(id: string): PluginWidgetDefinition | undefined {
		return this.widgets.get(id);
	}
	public getWidgets(): PluginWidgetDefinition[] {
		return this.widgets.getAll();
	}
	public getRenderer(type: string): PluginScrambleRendererDefinition | undefined {
		return this.renderers.get(type);
	}

	public async destroy(): Promise<void> {
		for (const script of this.activeScripts) await this.cleanupPlugin(script.id);
		this.activeScripts = [];
		this.requestedFingerprint = '';
		this.statuses.clear();
		this.lastKnownGoodCodes.clear();
		this.notify();
	}
}

export const pluginManager = PluginManager.getInstance();
