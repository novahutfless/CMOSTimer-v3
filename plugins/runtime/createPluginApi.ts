import { CMOSApi, CustomRendererDefinition, PluginWidgetDefinition } from '../../types';
import { registerPluginLanguage, registerPluginTranslations } from '../../translations';
import { registerScrambler } from '../../utils/scramblerRegistry';

type CreatePluginApiInput = {
	pluginId: string;
	hostApi: Omit<CMOSApi, 'onCleanup'>;
	uiCallbacks: {
		alert: (msg: string) => Promise<void>;
		prompt: (msg: string, def?: string) => Promise<string | null>;
	} | null;
	widgets: Map<string, PluginWidgetDefinition>;
	widgetOwners: Map<string, string>;
	renderers: Map<string, CustomRendererDefinition>;
	rendererOwners: Map<string, string>;
	cleanups: Map<string, (() => void)[]>;
};

export const createPluginApi = ({
	pluginId,
	hostApi,
	uiCallbacks,
	widgets,
	widgetOwners,
	renderers,
	rendererOwners,
	cleanups
}: CreatePluginApiInput): CMOSApi => ({
	getState: () => hostApi.getState(),
	addSolve: (t, p) => hostApi.addSolve(t, p),
	updateSettings: (s) => hostApi.updateSettings(s),
	toast: (m) => hostApi.toast(m),

	registerWidget: (id, name, render, cleanup): void => {
		console.log(`[PluginManager] Registering widget: ${name} (${id})`);
		widgets.set(id, { id, name, render, cleanup });
		widgetOwners.set(id, pluginId);
	},

	registerScrambler: (definition): void => {
		console.log(`[PluginManager] Registering scrambler: ${definition.name}`);
		registerScrambler(definition);
	},

	registerScrambleRenderer: (visualizerType, render, cleanup): void => {
		console.log(`[PluginManager] Registering renderer for: ${visualizerType}`);
		renderers.set(visualizerType, { visualizerType, render, cleanup });
		rendererOwners.set(visualizerType, pluginId);
	},

	registerLanguage: (definition): void => {
		console.log(`[PluginManager] Registering language: ${definition.code}`);
		registerPluginLanguage(pluginId, definition);
	},

	registerTranslations: (languageCode, translations): void => {
		console.log(`[PluginManager] Registering translations for: ${languageCode}`);
		registerPluginTranslations(pluginId, languageCode, translations);
	},

	onCleanup: (callback: () => void): void => {
		const list = cleanups.get(pluginId) || [];
		list.push(callback);
		cleanups.set(pluginId, list);
	},

	alert: (message): Promise<void> => {
		if (uiCallbacks?.alert) return uiCallbacks.alert(message);
		return Promise.resolve();
	},

	prompt: (message, def): Promise<string | null> => {
		if (uiCallbacks?.prompt) return uiCallbacks.prompt(message, def);
		return Promise.resolve(null);
	}
});
