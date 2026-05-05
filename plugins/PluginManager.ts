import { CMOSApi, CustomRendererDefinition, CustomScramblerDefinition, PluginLanguageDefinition, PluginScript, PluginWidgetDefinition } from '../types';
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
	cleanups: (() => void)[];
};

class PluginManager {
	private static instance: PluginManager;
	private api: Omit<CMOSApi, 'onCleanup'> | null = null;
	private readonly widgets = new OwnedRegistry<PluginWidgetDefinition>({
		kind: 'widget',
		onRemove: (widget): void => {
			widget.cleanup?.();
		}
	});
	private readonly renderers = new OwnedRegistry<CustomRendererDefinition>({
		kind: 'scramble renderer',
		onRemove: (renderer): void => {
			renderer.cleanup?.();
		}
	});
	private scripts: PluginScript[] = [];
	private cleanups: Map<string, (() => void)[]> = new Map();
	private uiCallbacks: PluginUiCallbacks | null = null;

	private constructor() {
		console.log('[PluginManager] Instance created');
	}

	public static getInstance(): PluginManager {
		if (!PluginManager.instance) {
			PluginManager.instance = new PluginManager();
		}

		return PluginManager.instance;
	}

	public initialize(api: Omit<CMOSApi, 'onCleanup'>, scripts: PluginScript[], uiCallbacks: PluginUiCallbacks): void {
		this.api = api;
		this.uiCallbacks = uiCallbacks;

		if (this.checkChanges(scripts)) {
			console.log('[PluginManager] Scripts changed, reloading...');
			this.reloadPlugins(scripts);
		}
	}

	public updateApi(api: Omit<CMOSApi, 'onCleanup'>): void {
		this.api = api;
	}

	private checkChanges(newScripts: PluginScript[]): boolean {
		if (this.scripts.length !== newScripts.length) return true;

		return newScripts.some((script, index) => {
			const oldScript = this.scripts[index];
			if (!oldScript) return true;
			return script.id !== oldScript.id || script.code !== oldScript.code || script.enabled !== oldScript.enabled;
		});
	}

	private reloadPlugins(newScripts: PluginScript[]): void {
		const newScriptMap = new Map(newScripts.map(script => [script.id, script]));

		this.scripts.forEach(oldScript => {
			const newScript = newScriptMap.get(oldScript.id);
			const shouldCleanup = !newScript || !newScript.enabled || newScript.code !== oldScript.code;

			if (shouldCleanup) {
				this.cleanupPlugin(oldScript.id);
			}
		});

		newScripts.forEach(script => {
			const oldScript = this.scripts.find(existing => existing.id === script.id);
			const isNewOrChanged = !oldScript || oldScript.code !== script.code;
			const wasDisabled = oldScript !== undefined && !oldScript.enabled;

			if (script.enabled && (isNewOrChanged || wasDisabled)) {
				this.cleanupPlugin(script.id);
				this.runScript(script);
			}
		});

		this.scripts = [...newScripts];
	}

	private cleanupPlugin(id: string): void {
		unregisterPluginLocalizations(id);
		unregisterPluginScramblers(id);

		const cleanups = this.cleanups.get(id);
		if (cleanups && cleanups.length > 0) {
			console.log(`[PluginManager] Cleaning up plugin ${id}`);
			cleanups.forEach(cleanup => {
				try {
					cleanup();
				} catch (error) {
					console.error(`Error in cleanup for plugin ${id}`, error);
				}
			});
		}
		this.cleanups.delete(id);

		this.widgets.unregisterOwner(id);
		this.renderers.unregisterOwner(id);
	}

	private runScript(script: PluginScript): void {
		if (!this.api) {
			console.error('[PluginManager] API not initialized, cannot run script', script.name);
			return;
		}

		console.log(`[PluginManager] Executing: ${script.name}`);

		const pending: PendingPluginRegistrations = {
			widgets: [],
			renderers: [],
			scramblers: [],
			languages: [],
			translations: [],
			cleanups: []
		};

		try {
			const contextApi = this.createContextApi(script.id, pending);
			const fn = new Function('cmos', `"use strict";\n${script.code}`);
			fn(contextApi);
			this.commitPluginRegistrations(script.id, pending);
		} catch (error) {
			pending.cleanups.forEach(cleanup => {
				try {
					cleanup();
				} catch (cleanupError) {
					console.error(`Error rolling back plugin ${script.id}`, cleanupError);
				}
			});
			console.error(`[PluginManager] Error executing ${script.name}:`, error);
			this.api.toast(`Plugin Error (${script.name}): ${error}`);
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
		} catch (error) {
			this.cleanupPlugin(pluginId);
			throw error;
		}
	}

	private createContextApi(pluginId: string, pending: PendingPluginRegistrations): CMOSApi {
		return createPluginApi({
			pluginId,
			hostApi: this.api!,
			uiCallbacks: this.uiCallbacks,
			stageWidget: (definition): void => {
				pending.widgets.push(definition);
			},
			stageRenderer: (definition): void => {
				pending.renderers.push(definition);
			},
			stageScrambler: (definition): void => {
				pending.scramblers.push(definition);
			},
			stageLanguage: (definition): void => {
				pending.languages.push(definition);
			},
			stageTranslations: (languageCode, translations): void => {
				pending.translations.push({ languageCode, translations });
			},
			registerCleanup: (callback): void => {
				pending.cleanups.push(callback);
			}
		});
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
}

export const pluginManager = PluginManager.getInstance();
