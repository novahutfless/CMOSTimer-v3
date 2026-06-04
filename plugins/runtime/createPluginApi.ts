import { CMOSApi, CustomRendererDefinition, CustomScramblerDefinition, PluginLanguageDefinition, PluginWidgetDefinition } from '../../types';
import { validateLanguageRegistration, validateRendererRegistration, validateScramblerRegistration, validateTranslations, validateWidgetRegistration, wrapCleanup } from './pluginValidation';

type CreatePluginApiInput = {
	pluginId: string;
	hostApi: Omit<CMOSApi, 'onCleanup'>;
	uiCallbacks: {
		alert: (msg: string) => Promise<void>;
		prompt: (msg: string, def?: string) => Promise<string | null>;
	} | null;
	stageWidget: (definition: PluginWidgetDefinition) => void;
	stageRenderer: (definition: CustomRendererDefinition) => void;
	stageScrambler: (definition: CustomScramblerDefinition) => void;
	stageLanguage: (definition: PluginLanguageDefinition) => void;
	stageTranslations: (languageCode: string, translations: Record<string, string>) => void;
	registerCleanup: (callback: () => void) => void;
};

export const createPluginApi = ({
	hostApi,
	uiCallbacks,
	stageWidget,
	stageRenderer,
	stageScrambler,
	stageLanguage,
	stageTranslations,
	registerCleanup
}: CreatePluginApiInput): CMOSApi => ({
	getState: () => hostApi.getState(),
	addSolve: (time, penalty) => hostApi.addSolve(time, penalty),
	updateSettings: (settings) => hostApi.updateSettings(settings),
	toast: (message) => hostApi.toast(message),

	registerWidget: (id, name, render, cleanup): void => {
		const widget = validateWidgetRegistration(id, name, render);
		const wrappedCleanup = wrapCleanup(cleanup);
		console.log(`[PluginManager] Registering widget: ${widget.name} (${widget.id})`);
		stageWidget({
			...widget,
			...(wrappedCleanup === undefined ? {} : { cleanup: wrappedCleanup })
		});
	},

	registerScrambler: (definition): void => {
		const scrambler = validateScramblerRegistration(definition);
		console.log(`[PluginManager] Registering scrambler: ${scrambler.name}`);
		stageScrambler(scrambler);
	},

	registerScrambleRenderer: (visualizerType, render, cleanup): void => {
		const renderer = validateRendererRegistration(visualizerType, render);
		const wrappedCleanup = wrapCleanup(cleanup);
		console.log(`[PluginManager] Registering renderer for: ${renderer.visualizerType}`);
		stageRenderer({
			...renderer,
			...(wrappedCleanup === undefined ? {} : { cleanup: wrappedCleanup })
		});
	},

	registerLanguage: (definition): void => {
		const language = validateLanguageRegistration(definition);
		console.log(`[PluginManager] Registering language: ${language.code}`);
		stageLanguage(language);
	},

	registerTranslations: (languageCode, translations): void => {
		console.log(`[PluginManager] Registering translations for: ${languageCode}`);
		stageTranslations(languageCode, validateTranslations(translations));
	},

	onCleanup: (callback: () => void): void => {
		const wrapped = wrapCleanup(callback);
		registerCleanup(wrapped || callback);
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
