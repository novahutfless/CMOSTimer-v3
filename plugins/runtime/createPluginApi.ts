import {
	CMOSApi,
	PluginEventCallback,
	PluginEventName,
	PluginCommandDefinition,
	PluginHostApi,
	PluginLanguageDefinition,
	PluginScramblerDefinition,
	PluginScrambleRendererDefinition,
	PluginWidgetDefinition
} from '../../types';
import { createPluginStorage } from './pluginStorage';
import {
	ensureNonEmptyString,
	once,
	validateLanguageRegistration,
	validateScramblerRegistration,
	validateTranslations,
	validateUiNode
} from './pluginValidation';

type CreatePluginApiInput = {
	pluginId: string;
	getHostApi: () => PluginHostApi;
	stageWidget: (definition: PluginWidgetDefinition) => void;
	stageRenderer: (definition: PluginScrambleRendererDefinition) => void;
	stageScrambler: (definition: PluginScramblerDefinition) => void;
	stageLanguage: (definition: PluginLanguageDefinition) => void;
	stageTranslations: (languageCode: string, translations: Record<string, string>) => void;
	stageEvent: (event: PluginEventName, callback: PluginEventCallback) => () => void;
	stageCommand: (definition: PluginCommandDefinition, callback: () => void | Promise<void>) => void;
	registerCleanup: (callback: () => Promise<void>) => void;
	refreshWidget: (id: string) => void;
};

export const createPluginApi = ({
	pluginId,
	getHostApi,
	stageWidget,
	stageRenderer,
	stageScrambler,
	stageLanguage,
	stageTranslations,
	stageEvent,
	stageCommand,
	registerCleanup,
	refreshWidget
}: CreatePluginApiInput): CMOSApi => {
	const storage = createPluginStorage(pluginId);
	return {
		get apiVersion(): string {
			return getHostApi().apiVersion;
		},
		getState: async () => getHostApi().getState(),
		getTimerState: async () => getHostApi().getTimerState(),
		getTimerElapsed: async () => getHostApi().getTimerElapsed(),
		getCurrentScramble: async () => getHostApi().getCurrentScramble(),
		startInspection: async () => getHostApi().startInspection(),
		startTimer: async () => getHostApi().startTimer(),
		stopTimer: async input => getHostApi().stopTimer(input),
		cancelTimer: async () => getHostApi().cancelTimer(),
		addSolve: async (time, penalty) => getHostApi().addSolve(time, penalty),
		addSolveWithDetails: async input => getHostApi().addSolveWithDetails(input),
		updateSolve: async (id, updates) => getHostApi().updateSolve(id, updates),
		deleteSolves: async (ids, sessionId) => getHostApi().deleteSolves(ids, sessionId),
		updateSettings: async settings => getHostApi().updateSettings(settings),
		setCurrentSession: async sessionId => getHostApi().setCurrentSession(sessionId),
		createSession: async input => getHostApi().createSession(input),
		updateSession: async (sessionId, updates) => getHostApi().updateSession(sessionId, updates),
		deleteSession: async sessionId => getHostApi().deleteSession(sessionId),
		getStatistics: async query => getHostApi().getStatistics(query),
		nextScramble: async () => getHostApi().nextScramble(),
		previousScramble: async () => getHostApi().previousScramble(),
		toast: async message => getHostApi().toast(message),
		alert: message => getHostApi().alert(message),
		prompt: (message, defaultValue) => getHostApi().prompt(message, defaultValue),
		storage: {
			get: async (key, fallback) => storage.get(key, fallback),
			set: async (key, value) => storage.set(key, value),
			remove: async key => storage.remove(key)
		},
		registerWidget: (id, name, render, onAction): void => {
			const normalizedId = ensureNonEmptyString(id, 'Widget id', 100);
			const normalizedName = ensureNonEmptyString(name, 'Widget name');
			if (typeof render !== 'function') throw new Error('Widget render must be a function.');
			if (onAction !== undefined && typeof onAction !== 'function') throw new Error('Widget action handler must be a function.');
			stageWidget({
				id: normalizedId,
				name: normalizedName,
				render: async () => validateUiNode(await render()),
				...(onAction === undefined ? {} : { handleAction: async (action): Promise<void> => {
					await onAction(action);
				} })
			});
		},
		refreshWidget: async (id): Promise<void> => {
			refreshWidget(ensureNonEmptyString(id, 'Widget id', 100));
		},
		registerScrambler: (definition): void => stageScrambler(validateScramblerRegistration(definition)),
		registerScrambleRenderer: (visualizerType, render): void => {
			const normalizedType = ensureNonEmptyString(visualizerType, 'Renderer visualizer type', 100);
			if (typeof render !== 'function') throw new Error('Scramble renderer must be a function.');
			stageRenderer({ visualizerType: normalizedType, render: async (scramble, config) => validateUiNode(await render(scramble, config)) });
		},
		registerLanguage: (definition): void => stageLanguage(validateLanguageRegistration(definition)),
		registerTranslations: (languageCode, translations) => stageTranslations(languageCode, validateTranslations(translations)),
		registerCommand: (definition, callback): void => {
			if (typeof callback !== 'function') throw new Error('Command callback must be a function.');
			stageCommand(definition, callback);
		},
		devices: {
			supports: async kind => getHostApi().deviceSupports(kind),
			request: request => getHostApi().requestDevice(pluginId, request),
			write: (deviceId, data, options) => getHostApi().writeDevice(pluginId, deviceId, data, options),
			read: (deviceId, options) => getHostApi().readDevice(pluginId, deviceId, options),
			close: deviceId => getHostApi().closeDevice(pluginId, deviceId)
		},
		on: (event, callback): (() => void) => {
			if (typeof callback !== 'function') throw new Error(`Event callback for "${event}" must be a function.`);
			return stageEvent(event, callback as PluginEventCallback);
		},
		onCleanup: (callback): void => {
			if (typeof callback !== 'function') throw new Error('Cleanup callback must be a function.');
			registerCleanup(once(callback));
		}
	};
};
