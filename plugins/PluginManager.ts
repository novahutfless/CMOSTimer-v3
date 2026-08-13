import {
	CMOSApi,
	CMOS_PLUGIN_API_VERSION,
	CustomRendererDefinition,
	CustomScramblerDefinition,
	PluginEventCallback,
	PluginEventMap,
	PluginEventName,
	PluginLanguageDefinition,
	PluginRuntimeStatus,
	PluginScript,
	PluginWidgetDefinition
} from '../types';
import { unregisterPluginLocalizations, registerPluginLanguage, registerPluginTranslations } from '../translations';
import { registerPluginScrambler, unregisterPluginScramblers } from '../utils/scramblerRegistry';
import { createPluginApi } from './runtime/createPluginApi';
import { OwnedRegistry } from './runtime/OwnedRegistry';

type PluginUiCallbacks = {
	alert: (msg: string) => Promise<void>;
	prompt: (msg: string, def?: string) => Promise<string | null>;
};

type PendingPluginRegistrations = {
	widgets: PluginWidgetDefinition[];
	renderers: CustomRendererDefinition[];
	scramblers: CustomScramblerDefinition[];
	languages: PluginLanguageDefinition[];
	translations: Array<{ languageCode: string; translations: Record<string, string> }>;
	events: Array<{ event: PluginEventName; callback: PluginEventCallback; enabled: boolean; remove?: () => void }>;
	cleanups: (() => void)[];
};

type RuntimeListener = (payload: unknown) => void;

const fingerprintScripts = (scripts: PluginScript[]): string => JSON.stringify(scripts.map(script => ({
	id: script.id,
	code: script.code,
	enabled: script.enabled,
	apiVersion: script.apiVersion,
	lastKnownGoodCode: script.lastKnownGoodCode
})));

const isApiCompatible = (requiredVersion?: string): boolean => {
	if (!requiredVersion) return true;
	const requiredMajor = Number.parseInt(requiredVersion.split('.')[0] || '', 10);
	const currentMajor = Number.parseInt(CMOS_PLUGIN_API_VERSION.split('.')[0] || '', 10);
	return Number.isFinite(requiredMajor) && requiredMajor <= currentMajor;
};

export class PluginManager {
	private static instance: PluginManager;
	private api: Omit<CMOSApi, 'onCleanup'> | null = null;
	private readonly widgets = new OwnedRegistry<PluginWidgetDefinition>({ kind: 'widget' });
	private readonly renderers = new OwnedRegistry<CustomRendererDefinition>({ kind: 'scramble renderer' });
	private activeScripts: PluginScript[] = [];
	private requestedFingerprint = '';
	private cleanups = new Map<string, (() => void)[]>();
	private uiCallbacks: PluginUiCallbacks | null = null;
	private readonly eventListeners = new Map<PluginEventName, Map<string, Set<RuntimeListener>>>();
	private readonly subscribers = new Set<() => void>();
	private readonly statuses = new Map<string, PluginRuntimeStatus>();
	private readonly lastKnownGoodCodes = new Map<string, string>();
	private revision = 0;
	private reloadQueue: Promise<void> = Promise.resolve();

	public static getInstance(): PluginManager {
		if (!PluginManager.instance) PluginManager.instance = new PluginManager();
		return PluginManager.instance;
	}

	public initialize(api: Omit<CMOSApi, 'onCleanup'>, scripts: PluginScript[], uiCallbacks: PluginUiCallbacks): void {
		this.api = api;
		this.uiCallbacks = uiCallbacks;
		const nextFingerprint = fingerprintScripts(scripts);
		if (nextFingerprint === this.requestedFingerprint) return;

		this.requestedFingerprint = nextFingerprint;
		const requestedScripts = scripts.map(script => ({ ...script }));
		this.reloadQueue = this.reloadQueue
			.then(() => this.reloadPlugins(requestedScripts))
			.catch(error => console.error('[PluginManager] Reload failed:', error));
	}

	public updateApi(api: Omit<CMOSApi, 'onCleanup'>): void {
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
		this.activeScripts.forEach(oldScript => {
			const next = newScriptMap.get(oldScript.id);
			if (!next || !next.enabled || next.code !== oldScript.code || next.apiVersion !== oldScript.apiVersion || duplicateIds.has(oldScript.id)) {
				this.cleanupPlugin(oldScript.id);
			}
		});

		for (const duplicateId of duplicateIds) {
			this.setStatus(duplicateId, 'error', `Duplicate plugin id "${duplicateId}".`);
		}

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

			this.cleanupPlugin(script.id);
			this.setStatus(script.id, 'loading');
			const primaryError = await this.runScript(script.id, script.name, script.code);
			if (!primaryError) {
				this.lastKnownGoodCodes.set(script.id, script.code);
				this.setStatus(script.id, 'active');
				continue;
			}

			const fallbackCode = script.lastKnownGoodCode || this.lastKnownGoodCodes.get(script.id);
			if (fallbackCode && fallbackCode !== script.code) {
				this.cleanupPlugin(script.id);
				const fallbackError = await this.runScript(script.id, script.name, fallbackCode);
				if (!fallbackError) {
					this.setStatus(script.id, 'fallback', `Edited version failed; running last-known-good code. ${primaryError}`);
					this.api?.toast(`Plugin ${script.name} failed to update; restored its last-known-good version.`);
					continue;
				}
			}

			this.setStatus(script.id, 'error', primaryError);
			this.api?.toast(`Plugin Error (${script.name}): ${primaryError}`);
		}

		const currentIds = new Set(newScripts.map(script => script.id));
		for (const id of this.statuses.keys()) {
			if (!currentIds.has(id)) this.statuses.delete(id);
		}
		this.activeScripts = newScripts;
		this.notify();
	}

	private cleanupPlugin(id: string): void {
		unregisterPluginLocalizations(id);
		unregisterPluginScramblers(id);
		this.removeEventListeners(id);

		const cleanups = this.cleanups.get(id);
		cleanups?.forEach(cleanup => {
			try {
				cleanup();
			} catch (error) {
				console.error(`Error in cleanup for plugin ${id}`, error);
			}
		});
		this.cleanups.delete(id);
		this.widgets.unregisterOwner(id);
		this.renderers.unregisterOwner(id);
	}

	private async runScript(pluginId: string, pluginName: string, code: string): Promise<string | null> {
		if (!this.api) return 'Plugin API is not initialized.';

		const pending: PendingPluginRegistrations = {
			widgets: [],
			renderers: [],
			scramblers: [],
			languages: [],
			translations: [],
			events: [],
			cleanups: []
		};

		try {
			const contextApi = this.createContextApi(pluginId, pending);
			const fn = new Function('cmos', `"use strict"; return (async () => {\n${code}\n})();`);
			await Promise.resolve(fn(contextApi));
			this.commitPluginRegistrations(pluginId, pending);
			return null;
		} catch (error) {
			pending.cleanups.forEach(cleanup => {
				try {
					cleanup();
				} catch (cleanupError) {
					console.error(`Error rolling back plugin ${pluginId}`, cleanupError);
				}
			});
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[PluginManager] Error executing ${pluginName}:`, error);
			return message;
		}
	}

	private commitPluginRegistrations(pluginId: string, pending: PendingPluginRegistrations): void {
		this.cleanups.set(pluginId, pending.cleanups);
		try {
			pending.languages.forEach(definition => registerPluginLanguage(pluginId, definition));
			pending.translations.forEach(({ languageCode, translations }) => registerPluginTranslations(pluginId, languageCode, translations));
			pending.scramblers.forEach(definition => registerPluginScrambler(pluginId, definition));
			pending.widgets.forEach(definition => this.widgets.register(pluginId, definition.id, definition));
			pending.renderers.forEach(definition => this.renderers.register(pluginId, definition.visualizerType, definition));
			pending.events.filter(registration => registration.enabled).forEach(registration => {
				registration.remove = this.addEventListener(pluginId, registration.event, registration.callback);
			});
		} catch (error) {
			this.cleanupPlugin(pluginId);
			throw error;
		}
	}

	private createContextApi(pluginId: string, pending: PendingPluginRegistrations): CMOSApi {
		return createPluginApi({
			pluginId,
			getHostApi: () => {
				if (!this.api) throw new Error('Plugin API is not initialized.');
				return this.api;
			},
			getUiCallbacks: () => this.uiCallbacks,
			stageWidget: definition => pending.widgets.push(definition),
			stageRenderer: definition => pending.renderers.push(definition),
			stageScrambler: definition => pending.scramblers.push(definition),
			stageLanguage: definition => pending.languages.push(definition),
			stageTranslations: (languageCode, translations) => pending.translations.push({ languageCode, translations }),
			stageEvent: (event, callback) => {
				const registration: PendingPluginRegistrations['events'][number] = { event, callback, enabled: true };
				pending.events.push(registration);
				return () => {
					registration.enabled = false;
					registration.remove?.();
				};
			},
			registerCleanup: callback => pending.cleanups.push(callback)
		});
	}

	private addEventListener(pluginId: string, event: PluginEventName, callback: PluginEventCallback): () => void {
		const byOwner = this.eventListeners.get(event) || new Map<string, Set<RuntimeListener>>();
		const listeners = byOwner.get(pluginId) || new Set<RuntimeListener>();
		listeners.add(callback as RuntimeListener);
		byOwner.set(pluginId, listeners);
		this.eventListeners.set(event, byOwner);
		return () => listeners.delete(callback as RuntimeListener);
	}

	private removeEventListeners(pluginId: string): void {
		for (const byOwner of this.eventListeners.values()) byOwner.delete(pluginId);
	}

	public emit<K extends PluginEventName>(event: K, payload: PluginEventMap[K]): void {
		const byOwner = this.eventListeners.get(event);
		if (!byOwner) return;
		for (const [pluginId, listeners] of byOwner.entries()) {
			listeners.forEach(listener => {
				try {
					listener(payload);
				} catch (error) {
					console.error(`Error in ${event} listener for plugin ${pluginId}:`, error);
				}
			});
		}
	}

	private setStatus(pluginId: string, state: PluginRuntimeStatus['state'], message?: string): void {
		this.statuses.set(pluginId, {
			pluginId,
			state,
			updatedAt: Date.now(),
			...(message === undefined ? {} : { message })
		});
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

	public getRenderer(type: string): CustomRendererDefinition | undefined {
		return this.renderers.get(type);
	}

	public destroy(): void {
		this.activeScripts.forEach(script => this.cleanupPlugin(script.id));
		this.activeScripts = [];
		this.requestedFingerprint = '';
		this.statuses.clear();
		this.lastKnownGoodCodes.clear();
		this.notify();
	}
}

export const pluginManager = PluginManager.getInstance();
