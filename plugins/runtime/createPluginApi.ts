import {
	CMOSApi,
	CustomRendererDefinition,
	CustomScramblerDefinition,
	PluginEventCallback,
	PluginEventName,
	PluginLanguageDefinition,
	PluginWidgetDefinition
} from '../../types';
import { createPluginStorage } from './pluginStorage';
import {
	validateLanguageRegistration,
	validateRendererRegistration,
	validateScramblerRegistration,
	validateTranslations,
	validateWidgetRegistration,
	wrapCleanup
} from './pluginValidation';

type CreatePluginApiInput = {
	pluginId: string;
	getHostApi: () => Omit<CMOSApi, 'onCleanup'>;
	getUiCallbacks: () => {
		alert: (msg: string) => Promise<void>;
		prompt: (msg: string, def?: string) => Promise<string | null>;
	} | null;
	stageWidget: (definition: PluginWidgetDefinition) => void;
	stageRenderer: (definition: CustomRendererDefinition) => void;
	stageScrambler: (definition: CustomScramblerDefinition) => void;
	stageLanguage: (definition: PluginLanguageDefinition) => void;
	stageTranslations: (languageCode: string, translations: Record<string, string>) => void;
	stageEvent: (event: PluginEventName, callback: PluginEventCallback) => () => void;
	registerCleanup: (callback: () => void) => void;
};

export const createPluginApi = ({
	pluginId,
	getHostApi,
	getUiCallbacks,
	stageWidget,
	stageRenderer,
	stageScrambler,
	stageLanguage,
	stageTranslations,
	stageEvent,
	registerCleanup
}: CreatePluginApiInput): CMOSApi => ({
	get apiVersion(): string {
		return getHostApi().apiVersion;
	},
	getState: () => getHostApi().getState(),
	getTimerState: () => getHostApi().getTimerState(),
	getTimerElapsed: () => getHostApi().getTimerElapsed(),
	getCurrentScramble: () => getHostApi().getCurrentScramble(),
	startInspection: () => getHostApi().startInspection(),
	startTimer: () => getHostApi().startTimer(),
	stopTimer: (input) => getHostApi().stopTimer(input),
	cancelTimer: () => getHostApi().cancelTimer(),
	addSolve: (time, penalty) => getHostApi().addSolve(time, penalty),
	addSolveWithDetails: (input) => getHostApi().addSolveWithDetails(input),
	updateSolve: (id, updates) => getHostApi().updateSolve(id, updates),
	deleteSolves: (ids, sessionId) => getHostApi().deleteSolves(ids, sessionId),
	updateSettings: (settings) => getHostApi().updateSettings(settings),
	setCurrentSession: (sessionId) => getHostApi().setCurrentSession(sessionId),
	nextScramble: () => getHostApi().nextScramble(),
	previousScramble: () => getHostApi().previousScramble(),
	toast: (message) => getHostApi().toast(message),

	registerWidget: (id, name, render, cleanup): void => {
		const widget = validateWidgetRegistration(id, name, render);
		stageWidget({ ...widget, ...(cleanup === undefined ? {} : { cleanup }) });
	},
	registerScrambler: (definition): void => stageScrambler(validateScramblerRegistration(definition)),
	registerScrambleRenderer: (visualizerType, render, cleanup): void => {
		const renderer = validateRendererRegistration(visualizerType, render);
		stageRenderer({ ...renderer, ...(cleanup === undefined ? {} : { cleanup }) });
	},
	registerLanguage: (definition): void => stageLanguage(validateLanguageRegistration(definition)),
	registerTranslations: (languageCode, translations): void => stageTranslations(languageCode, validateTranslations(translations)),
	on: (event, callback): (() => void) => {
		if (typeof callback !== 'function') throw new Error(`Event callback for "${event}" must be a function.`);
		return stageEvent(event, callback as PluginEventCallback);
	},
	onCleanup: (callback): void => {
		const wrapped = wrapCleanup(callback);
		registerCleanup(wrapped || callback);
	},
	alert: (message) => getUiCallbacks()?.alert(message) ?? Promise.resolve(),
	prompt: (message, def) => getUiCallbacks()?.prompt(message, def) ?? Promise.resolve(null),
	storage: createPluginStorage(pluginId)
});
