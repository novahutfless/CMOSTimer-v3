import {
	CMOSApi,
	CMOS_PLUGIN_API_VERSION,
	CustomScramblerDefinition,
	PluginEventCallback,
	PluginEventMap,
	PluginEventName,
	PluginHostApi,
	PluginLanguageDefinition,
	PluginCommandDefinition,
	PluginDeviceRequest,
	PluginPermission,
	PluginStateSnapshot,
	PluginRuntimeStatus,
	PluginScramblerDefinition,
	PluginScrambleRendererDefinition,
	PluginScript,
	PluginUiNode,
	PluginWidgetDefinition,
	StatType
} from '../types';
import { pluginDeviceBroker } from './runtime/PluginDeviceBroker';
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
	commands: Array<{ definition: PluginCommandDefinition; callback: () => void | Promise<void> }>;
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
	id: script.id, code: script.code, enabled: script.enabled, apiVersion: script.apiVersion, lastKnownGoodCode: script.lastKnownGoodCode, permissions: script.permissions
})));

type HostCommand = PluginCommandDefinition & { owner: string; run: () => Promise<void> };

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
		[registrations.events, PLUGIN_EVENTS.size, 'event subscriptions'],
		[registrations.commands, 100, 'commands']
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

const STAT_TYPES = new Set(Object.values(StatType));
const DEVICE_KINDS = new Set(['serial', 'hid', 'usb', 'bluetooth']);
const sanitizeState = (state: ReturnType<PluginHostApi['getState']>): PluginStateSnapshot => ({
	...state,
	plugins: state.plugins.map(({ code: _code, lastKnownGoodCode: _lastKnownGoodCode, permissions: _permissions, requestedPermissions: _requestedPermissions, ...metadata }) => metadata)
});

export class PluginManager {
	private static instance: PluginManager;
	private api: PluginHostApi | null = null;
	private readonly executionMode: PluginExecutionMode;
	private readonly widgets = new OwnedRegistry<PluginWidgetDefinition>({ kind: 'widget' });
	private readonly renderers = new OwnedRegistry<PluginScrambleRendererDefinition>({ kind: 'scramble renderer' });
	private readonly commands = new OwnedRegistry<HostCommand>({ kind: 'command' });
	private readonly permissions = new Map<string, Set<PluginPermission>>();
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
	private keyboardListenerInstalled = false;

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
		this.installKeyboardListener();
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
			this.permissions.set(script.id, new Set(script.permissions || []));
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
		for (const id of this.permissions.keys()) if (!currentIds.has(id)) this.permissions.delete(id);
		this.activeScripts = newScripts;
		this.notify();
	}

	private async cleanupPlugin(id: string): Promise<void> {
		unregisterPluginLocalizations(id);
		unregisterPluginScramblers(id);
		this.removeEventListeners(id);
		this.widgets.unregisterOwner(id);
		this.renderers.unregisterOwner(id);
		this.commands.unregisterOwner(id);
		await pluginDeviceBroker.closeOwner(id);
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
		const pending: DirectPendingRegistrations = { widgets: [], renderers: [], scramblers: [], languages: [], translations: [], events: [], commands: [], cleanups: [] };
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
		if (registrations.widgets.length || registrations.renderers.length || registrations.scramblers.length || registrations.languages.length || registrations.translations.length) this.requirePermission(pluginId, 'ui');
		if (registrations.events.length) this.requirePermission(pluginId, 'state:read');
		if (registrations.commands.length) this.requirePermission(pluginId, 'commands');
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
				...(definition.hasActionHandler ? { handleAction: async (action: string, payload?: unknown): Promise<void> => {
					await runtime.invoke({ kind: 'widgetAction', key: id, payload: { action, ...(payload === undefined ? {} : { data: payload }) } });
				} } : {}),
				requestDevice: async request => {
					this.requirePermission(pluginId, 'devices');
					if (!this.api) throw new Error('Plugin API is not initialized.');
					return this.api.requestDevice(pluginId, this.validateDeviceRequest(ensureObject(request, 'Device request')));
				}
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
			this.addEventListener(pluginId, event, payload => runtime.emit(event, event === 'stateChanged' ? sanitizeState(payload as ReturnType<PluginHostApi['getState']>) : payload));
		});
		registrations.commands.forEach(definition => this.registerCommand(pluginId, definition, () => runtime.invoke({ kind: 'runCommand', key: definition.id }).then(() => undefined)));
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
		pending.commands.forEach(command => this.registerCommand(pluginId, command.definition, async () => command.callback()));
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
			stageCommand: (definition, callback) => pending.commands.push({ definition, callback }),
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
		case 'getState': this.requirePermission(pluginId, 'state:read'); return sanitizeState(api.getState());
		case 'getTimerState': this.requirePermission(pluginId, 'state:read'); return api.getTimerState();
		case 'getTimerElapsed': this.requirePermission(pluginId, 'state:read'); return api.getTimerElapsed();
		case 'getCurrentScramble': this.requirePermission(pluginId, 'state:read'); return api.getCurrentScramble();
		case 'startInspection': this.requirePermission(pluginId, 'timer:control'); return api.startInspection();
		case 'startTimer': this.requirePermission(pluginId, 'timer:control'); return api.startTimer();
		case 'stopTimer': this.requirePermission(pluginId, 'timer:control'); return api.stopTimer(args[0] === undefined ? undefined : ensureObject(args[0], 'Timer stop input') as Parameters<PluginHostApi['stopTimer']>[0]);
		case 'cancelTimer': this.requirePermission(pluginId, 'timer:control'); return api.cancelTimer();
		case 'addSolve': this.requirePermission(pluginId, 'solves:write'); return api.addSolve(ensureFiniteTime(args[0], 'Solve time'), args[1] as Parameters<PluginHostApi['addSolve']>[1]);
		case 'addSolveWithDetails': {
			this.requirePermission(pluginId, 'solves:write');
			const input = ensureObject(args[0], 'Solve input');
			return api.addSolveWithDetails({ ...input, time: ensureFiniteTime(input.time, 'Solve time') } as unknown as Parameters<PluginHostApi['addSolveWithDetails']>[0]);
		}
		case 'updateSolve': this.requirePermission(pluginId, 'solves:write'); return api.updateSolve(ensureNonEmptyString(args[0], 'Solve id', 100), ensureObject(args[1], 'Solve updates') as Parameters<PluginHostApi['updateSolve']>[1]);
		case 'deleteSolves': {
			this.requirePermission(pluginId, 'solves:write');
			if (!Array.isArray(args[0])) throw new Error('Solve ids must be an array.');
			return api.deleteSolves(args[0].map(id => ensureNonEmptyString(id, 'Solve id', 100)), args[1] === undefined ? undefined : ensureNonEmptyString(args[1], 'Session id', 100));
		}
		case 'updateSettings': this.requirePermission(pluginId, 'settings:write'); return api.updateSettings(ensureObject(args[0], 'Settings update') as Parameters<PluginHostApi['updateSettings']>[0]);
		case 'setCurrentSession': this.requirePermission(pluginId, 'timer:control'); return api.setCurrentSession(ensureNonEmptyString(args[0], 'Session id', 100));
		case 'createSession': {
			this.requirePermission(pluginId, 'sessions:write');
			const input = ensureObject(args[0], 'Session input');
			const scramblerId = Array.isArray(input.scramblerId) ? input.scramblerId.map(value => ensureNonEmptyString(value, 'Scrambler id', 100)) : ensureNonEmptyString(input.scramblerId, 'Scrambler id', 100);
			const tags = input.tags === undefined ? undefined : this.validateStrings(input.tags, 'Session tags', 100, 100);
			return api.createSession({ name: ensureNonEmptyString(input.name, 'Session name', 200), scramblerId, ...(tags ? { tags } : {}) });
		}
		case 'updateSession': {
			this.requirePermission(pluginId, 'sessions:write');
			const updates = ensureObject(args[1], 'Session updates');
			const allowed: Record<string, unknown> = {};
			if (updates.name !== undefined) allowed.name = ensureNonEmptyString(updates.name, 'Session name', 200);
			if (updates.locked !== undefined) {
				if (typeof updates.locked !== 'boolean') throw new Error('Session locked must be a boolean.');
				allowed.locked = updates.locked;
			}
			if (updates.tags !== undefined) allowed.tags = this.validateStrings(updates.tags, 'Session tags', 100, 100);
			if (updates.scramblerId !== undefined) allowed.scramblerId = this.validateStrings(Array.isArray(updates.scramblerId) ? updates.scramblerId : [updates.scramblerId], 'Scrambler ids', 20, 100);
			return api.updateSession(ensureNonEmptyString(args[0], 'Session id', 100), allowed);
		}
		case 'deleteSession': this.requirePermission(pluginId, 'sessions:write'); return api.deleteSession(ensureNonEmptyString(args[0], 'Session id', 100));
		case 'getStatistics': {
			this.requirePermission(pluginId, 'state:read');
			const query = ensureObject(args[0], 'Statistics query');
			if (!STAT_TYPES.has(query.type as StatType)) throw new Error('Unknown statistic type.');
			return api.getStatistics({ type: query.type as StatType, ...(query.sessionId === undefined ? {} : { sessionId: ensureNonEmptyString(query.sessionId, 'Session id', 100) }), ...(query.size === undefined ? {} : { size: Number(query.size) }) });
		}
		case 'nextScramble': this.requirePermission(pluginId, 'timer:control'); return api.nextScramble();
		case 'previousScramble': this.requirePermission(pluginId, 'timer:control'); return api.previousScramble();
		case 'toast': this.requirePermission(pluginId, 'ui'); return api.toast(ensureNonEmptyString(args[0], 'Toast message', 2000));
		case 'alert': this.requirePermission(pluginId, 'ui'); return api.alert(ensureNonEmptyString(args[0], 'Alert message', 20_000));
		case 'prompt': this.requirePermission(pluginId, 'ui'); return api.prompt(ensureNonEmptyString(args[0], 'Prompt message', 20_000), typeof args[1] === 'string' ? args[1].slice(0, 20_000) : undefined);
		case 'storageGet': this.requirePermission(pluginId, 'storage'); return storage.get(ensureNonEmptyString(args[0], 'Storage key', 200), args[1]);
		case 'storageSet': this.requirePermission(pluginId, 'storage'); return storage.set(ensureNonEmptyString(args[0], 'Storage key', 200), args[1]);
		case 'storageRemove': this.requirePermission(pluginId, 'storage'); return storage.remove(ensureNonEmptyString(args[0], 'Storage key', 200));
		case 'refreshWidget':
			this.requirePermission(pluginId, 'ui');
			ensureNonEmptyString(args[0], 'Widget id', 100);
			this.notify();
			return undefined;
		case 'deviceSupports': {
			this.requirePermission(pluginId, 'devices');
			const kind = ensureNonEmptyString(args[0], 'Device kind', 20);
			if (!DEVICE_KINDS.has(kind)) throw new Error('Unknown device kind.');
			return api.deviceSupports(kind as Parameters<PluginHostApi['deviceSupports']>[0]);
		}
		case 'requestDevice': {
			this.requirePermission(pluginId, 'devices');
			const request = ensureObject(args[0], 'Device request');
			const kind = ensureNonEmptyString(request.kind, 'Device kind', 20);
			if (!DEVICE_KINDS.has(kind)) throw new Error('Unknown device kind.');
			return api.requestDevice(pluginId, this.validateDeviceRequest({ ...request, kind }));
		}
		case 'writeDevice': this.requirePermission(pluginId, 'devices'); return api.writeDevice(pluginId, ensureNonEmptyString(args[0], 'Device id', 100), this.validateBytes(args[1]), this.validateDeviceOptions(args[2]));
		case 'readDevice': this.requirePermission(pluginId, 'devices'); return api.readDevice(pluginId, ensureNonEmptyString(args[0], 'Device id', 100), this.validateDeviceOptions(args[1], true));
		case 'closeDevice': this.requirePermission(pluginId, 'devices'); return api.closeDevice(pluginId, ensureNonEmptyString(args[0], 'Device id', 100));
		default: throw new Error(`Unknown plugin host method "${String(method)}".`);
		}
	}

	private requirePermission(pluginId: string, permission: PluginPermission): void {
		if (this.executionMode === 'direct') return;
		if (!this.permissions.get(pluginId)?.has(permission)) throw new Error(`Plugin permission "${permission}" is required.`);
	}

	private validateBytes(value: unknown): number[] {
		if (!Array.isArray(value) || value.length > 65_536) throw new Error('Device data must be an array of at most 65536 bytes.');
		return value.map(byte => {
			if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('Device data contains an invalid byte.');
			return byte;
		});
	}

	private validateStrings(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
		if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${label} must contain at most ${maxItems} items.`);
		return value.map(item => ensureNonEmptyString(item, label, maxLength));
	}

	private validateDeviceRequest(request: Record<string, unknown>): PluginDeviceRequest {
		const kind = ensureNonEmptyString(request.kind, 'Device kind', 20);
		if (!DEVICE_KINDS.has(kind)) throw new Error('Unknown device kind.');
		if (request.filters !== undefined && (!Array.isArray(request.filters) || request.filters.length > 50 || request.filters.some(filter => !filter || typeof filter !== 'object' || Array.isArray(filter)))) throw new Error('Device filters must contain at most 50 objects.');
		const integer = (field: string, minimum: number, maximum: number): number | undefined => {
			if (request[field] === undefined) return undefined;
			const value = Number(request[field]);
			if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Device ${field} is invalid.`);
			return value;
		};
		const baudRate = integer('baudRate', 1, 10_000_000);
		const configurationValue = integer('configurationValue', 0, 255);
		const interfaceNumber = integer('interfaceNumber', 0, 255);
		return { kind: kind as PluginDeviceRequest['kind'], ...(request.filters === undefined ? {} : { filters: request.filters as Array<Record<string, unknown>> }), ...(baudRate === undefined ? {} : { baudRate }), ...(configurationValue === undefined ? {} : { configurationValue }), ...(interfaceNumber === undefined ? {} : { interfaceNumber }) };
	}

	private validateDeviceOptions(value: unknown, allowLength = false): Parameters<PluginHostApi['writeDevice']>[3] & { length?: number } {
		if (value === undefined) return {};
		const raw = ensureObject(value, 'Device options');
		const options: Record<string, string | number> = {};
		for (const field of ['endpoint', 'reportId']) {
			if (raw[field] === undefined) continue;
			if (!Number.isInteger(raw[field]) || Number(raw[field]) < 0 || Number(raw[field]) > 65_535) throw new Error(`Device ${field} is invalid.`);
			options[field] = Number(raw[field]);
		}
		for (const field of ['service', 'characteristic']) if (raw[field] !== undefined) options[field] = ensureNonEmptyString(raw[field], `Device ${field}`, 200);
		if (allowLength && raw.length !== undefined) {
			if (!Number.isInteger(raw.length) || Number(raw.length) < 1 || Number(raw.length) > 65_536) throw new Error('Device read length is invalid.');
			options.length = Number(raw.length);
		}
		return options;
	}

	private registerCommand(pluginId: string, definition: PluginCommandDefinition, run: () => Promise<void>): void {
		const id = ensureNonEmptyString(definition.id, 'Command id', 100);
		const name = ensureNonEmptyString(definition.name, 'Command name', 200);
		const description = definition.description === undefined ? undefined : ensureNonEmptyString(definition.description, 'Command description', 500);
		const defaultBinding = definition.defaultBinding === undefined ? undefined : ensureNonEmptyString(definition.defaultBinding, 'Command binding', 100);
		if (defaultBinding && !/^(?:(?:Ctrl|Alt|Shift|Meta)\+)*(?:Key[A-Z]|Digit\d|F(?:[1-9]|1\d|2[0-4])|Arrow(?:Up|Down|Left|Right)|Escape|Enter|Space|Tab|Backspace|Delete)$/.test(defaultBinding)) throw new Error('Command binding must use modifiers followed by KeyboardEvent.code.');
		this.commands.register(pluginId, id, { id, name, owner: pluginId, run, ...(description ? { description } : {}), ...(defaultBinding ? { defaultBinding } : {}) });
	}

	private installKeyboardListener(): void {
		if (this.keyboardListenerInstalled || typeof window === 'undefined') return;
		this.keyboardListenerInstalled = true;
		window.addEventListener('keydown', event => {
			const target = event.target as HTMLElement | null;
			if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
			const parts = [event.ctrlKey ? 'Ctrl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', event.metaKey ? 'Meta' : '', event.code].filter(Boolean);
			if (Object.values(this.api?.getState().settings.shortcuts || {}).includes(parts.join('+'))) return;
			const command = this.commands.getAll().find(item => item.defaultBinding === parts.join('+'));
			if (!command) return;
			event.preventDefault();
			void command.run().catch(error => console.error(`[Plugin command] ${command.id} failed:`, error));
		});
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
	public getCommands(): PluginCommandDefinition[] {
		return this.commands.getAll().map(({ owner: _owner, run: _run, ...definition }) => definition);
	}
	public async runCommand(id: string): Promise<void> {
		const command = this.commands.get(id);
		if (!command) throw new Error(`Unknown plugin command "${id}".`);
		await command.run();
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
