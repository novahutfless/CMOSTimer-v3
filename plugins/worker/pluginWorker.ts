/// <reference lib="webworker" />

import {
	CMOSApi,
	PluginEventCallback,
	PluginEventName,
	PluginLanguageDefinition,
	PluginScramblerDefinition,
	PluginUiNode
} from '../../types';
import { HostToWorkerMessage, PluginHostMethod, WorkerRegistrations, WorkerToHostMessage } from '../runtime/workerProtocol';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const widgets = new Map<string, { name: string; render: () => PluginUiNode | Promise<PluginUiNode>; onAction?: (action: string, payload?: unknown) => void | Promise<void> }>();
const renderers = new Map<string, (scramble: string[], config: unknown) => PluginUiNode | Promise<PluginUiNode>>();
const scramblers: PluginScramblerDefinition[] = [];
const languages: PluginLanguageDefinition[] = [];
const translations: WorkerRegistrations['translations'] = [];
const eventListeners = new Map<PluginEventName, Set<PluginEventCallback>>();
const cleanupCallbacks: Array<() => void | Promise<void>> = [];
const commands = new Map<string, { definition: Parameters<CMOSApi['registerCommand']>[0]; callback: () => void | Promise<void> }>();
const pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
let requestId = 0;

const post = (message: WorkerToHostMessage): void => workerScope.postMessage(message);
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const request = <T>(method: PluginHostMethod, ...args: unknown[]): Promise<T> => new Promise<T>((resolve, reject) => {
	requestId += 1;
	const currentId = requestId;
	const timeout = setTimeout(() => {
		pendingRequests.delete(currentId);
		reject(new Error(`Host request "${method}" timed out.`));
	}, 120_000);
	pendingRequests.set(currentId, { resolve: value => resolve(value as T), reject, timeout });
	post({ type: 'request', requestId: currentId, method, args });
});

const ensureFunction = (value: unknown, label: string): void => {
	if (typeof value !== 'function') throw new Error(`${label} must be a function.`);
};

const disableDirectNetworkGlobals = (): void => {
	const blocked = (): never => {
		throw new Error('Use cmos.network.fetch() for plugin network access.');
	};
	for (const name of ['fetch', 'WebSocket', 'XMLHttpRequest', 'EventSource', 'WebTransport', 'sendBeacon']) {
		try {
			Object.defineProperty(workerScope, name, { configurable: true, writable: true, value: blocked });
		} catch { /* Some WebViews expose non-configurable globals. */ }
	}
};

const createApi = (apiVersion: string): CMOSApi => ({
	apiVersion,
	getState: () => request('getState'),
	getTimerState: () => request('getTimerState'),
	getTimerElapsed: () => request('getTimerElapsed'),
	getCurrentScramble: () => request('getCurrentScramble'),
	startInspection: () => request('startInspection'),
	startTimer: () => request('startTimer'),
	stopTimer: input => request('stopTimer', input),
	cancelTimer: () => request('cancelTimer'),
	addSolve: (time, penalty) => request('addSolve', time, penalty),
	addSolveWithDetails: input => request('addSolveWithDetails', input),
	updateSolve: (id, updates) => request('updateSolve', id, updates),
	deleteSolves: (ids, sessionId) => request('deleteSolves', ids, sessionId),
	updateSettings: settings => request('updateSettings', settings),
	setCurrentSession: sessionId => request('setCurrentSession', sessionId),
	createSession: input => request('createSession', input),
	createSessions: (inputs, options) => request('createSessions', inputs, options),
	updateSession: (sessionId, updates) => request('updateSession', sessionId, updates),
	deleteSession: sessionId => request('deleteSession', sessionId),
	deleteSessions: sessionIds => request('deleteSessions', sessionIds),
	getStatistics: query => request('getStatistics', query),
	nextScramble: () => request('nextScramble'),
	previousScramble: () => request('previousScramble'),
	toast: message => request('toast', message),
	alert: message => request('alert', message),
	prompt: (message, defaultValue) => request('prompt', message, defaultValue),
	storage: {
		get: (key, fallback) => request('storageGet', key, fallback),
		set: (key, value) => request('storageSet', key, value),
		remove: key => request('storageRemove', key)
	},
	files: {
		pickText: options => request('pickTextFile', options),
		saveText: (name, text) => request('saveTextFile', name, text)
	},
	clipboard: {
		readText: () => request('readClipboardText'),
		writeText: text => request('writeClipboardText', text)
	},
	network: {
		fetch: input => request('networkFetch', input)
	},
	registerWidget: (id, name, render, onAction): void => {
		ensureFunction(render, 'Widget render');
		if (onAction !== undefined) ensureFunction(onAction, 'Widget action handler');
		widgets.set(id, { name, render, ...(onAction === undefined ? {} : { onAction }) });
	},
	refreshWidget: id => request('refreshWidget', id),
	registerScrambler: definition => scramblers.push(definition),
	registerScrambleRenderer: (visualizerType, render): void => {
		ensureFunction(render, 'Scramble renderer');
		renderers.set(visualizerType, render);
	},
	registerLanguage: definition => languages.push(definition),
	registerTranslations: (languageCode, dictionary) => translations.push({ languageCode, translations: dictionary }),
	registerCommand: (definition, callback): void => {
		ensureFunction(callback, 'Command callback');
		commands.set(definition.id, { definition, callback });
	},
	devices: {
		supports: kind => request('deviceSupports', kind),
		request: definition => request('requestDevice', definition),
		write: (deviceId, data, options) => request('writeDevice', deviceId, data, options),
		read: (deviceId, options) => request('readDevice', deviceId, options),
		close: deviceId => request('closeDevice', deviceId)
	},
	on: (event, callback) => {
		ensureFunction(callback, `Event callback for "${event}"`);
		const listeners = eventListeners.get(event) || new Set<PluginEventCallback>();
		listeners.add(callback as PluginEventCallback);
		eventListeners.set(event, listeners);
		return () => listeners.delete(callback as PluginEventCallback);
	},
	onCleanup: (callback): void => {
		ensureFunction(callback, 'Cleanup callback');
		cleanupCallbacks.push(callback);
	}
});

const getRegistrations = (): WorkerRegistrations => ({
	widgets: Array.from(widgets.entries(), ([id, definition]) => ({ id, name: definition.name, hasActionHandler: definition.onAction !== undefined })),
	renderers: Array.from(renderers.keys(), visualizerType => ({ visualizerType })),
	scramblers,
	languages,
	translations,
	events: Array.from(eventListeners.keys()),
	commands: Array.from(commands.values(), command => command.definition)
});

const handleInvocation = async (message: Extract<HostToWorkerMessage, { type: 'invoke' }>): Promise<void> => {
	try {
		const { invocation } = message;
		let value: PluginUiNode | void = undefined;
		if (invocation.kind === 'renderWidget') {
			const widget = widgets.get(invocation.key);
			if (!widget) throw new Error(`Unknown widget "${invocation.key}".`);
			value = await widget.render();
		} else if (invocation.kind === 'widgetAction') {
			const handler = widgets.get(invocation.key)?.onAction;
			if (handler) await handler(invocation.payload.action, invocation.payload.data);
		} else if (invocation.kind === 'runCommand') {
			const command = commands.get(invocation.key);
			if (!command) throw new Error(`Unknown command "${invocation.key}".`);
			await command.callback();
		} else {
			const renderer = renderers.get(invocation.key);
			if (!renderer) throw new Error(`Unknown renderer "${invocation.key}".`);
			value = await renderer(invocation.payload.scramble, invocation.payload.config);
		}
		post({ type: 'invocationResult', invocationId: message.invocationId, ok: true, value });
	} catch (error) {
		post({ type: 'invocationResult', invocationId: message.invocationId, ok: false, error: errorMessage(error) });
	}
};

workerScope.addEventListener('message', (event: MessageEvent<HostToWorkerMessage>) => {
	const message = event.data;
	if (message.type === 'start') {
		void (async (): Promise<void> => {
			try {
				disableDirectNetworkGlobals();
				const api = createApi(message.apiVersion);
				const execute = new Function('cmos', `"use strict"; return (async () => {\n${message.code}\n})();`);
				await Promise.resolve(execute(api));
				post({ type: 'ready', registrations: getRegistrations() });
			} catch (error) {
				post({ type: 'startupError', error: errorMessage(error) });
			}
		})();
	} else if (message.type === 'response') {
		const pending = pendingRequests.get(message.requestId);
		if (!pending) return;
		pendingRequests.delete(message.requestId);
		clearTimeout(pending.timeout);
		if (message.ok) pending.resolve(message.value);
		else pending.reject(new Error(message.error));
	} else if (message.type === 'invoke') {
		void handleInvocation(message);
	} else if (message.type === 'event') {
		eventListeners.get(message.event)?.forEach(callback => {
			void Promise.resolve(callback(message.payload as never)).catch(error => post({ type: 'runtimeError', error: errorMessage(error) }));
		});
	} else if (message.type === 'cleanup') {
		void Promise.allSettled(cleanupCallbacks.map(callback => callback())).then(() => {
			post({ type: 'cleanupComplete', cleanupId: message.cleanupId });
		});
	}
});
