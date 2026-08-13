import { PluginCommandDefinition, PluginEventName, PluginLanguageDefinition, PluginScramblerDefinition, PluginUiNode } from '../../types';

export type PluginHostMethod =
	| 'getState'
	| 'getTimerState'
	| 'getTimerElapsed'
	| 'getCurrentScramble'
	| 'startInspection'
	| 'startTimer'
	| 'stopTimer'
	| 'cancelTimer'
	| 'addSolve'
	| 'addSolveWithDetails'
	| 'updateSolve'
	| 'deleteSolves'
	| 'updateSettings'
	| 'setCurrentSession'
	| 'createSession'
	| 'updateSession'
	| 'deleteSession'
	| 'getStatistics'
	| 'nextScramble'
	| 'previousScramble'
	| 'toast'
	| 'alert'
	| 'prompt'
	| 'storageGet'
	| 'storageSet'
	| 'storageRemove'
	| 'refreshWidget'
	| 'deviceSupports'
	| 'requestDevice'
	| 'writeDevice'
	| 'readDevice'
	| 'closeDevice';

export interface WorkerRegistrations {
	widgets: Array<{ id: string; name: string; hasActionHandler: boolean }>;
	renderers: Array<{ visualizerType: string }>;
	scramblers: PluginScramblerDefinition[];
	languages: PluginLanguageDefinition[];
	translations: Array<{ languageCode: string; translations: Record<string, string> }>;
	events: PluginEventName[];
	commands: PluginCommandDefinition[];
}

export type WorkerInvocation =
	| { kind: 'renderWidget'; key: string }
	| { kind: 'widgetAction'; key: string; payload: { action: string; data?: unknown } }
	| { kind: 'runCommand'; key: string }
	| { kind: 'renderScramble'; key: string; payload: { scramble: string[]; config: unknown } };

export type HostToWorkerMessage =
	| { type: 'start'; code: string; apiVersion: string }
	| { type: 'response'; requestId: number; ok: true; value: unknown }
	| { type: 'response'; requestId: number; ok: false; error: string }
	| { type: 'invoke'; invocationId: number; invocation: WorkerInvocation }
	| { type: 'event'; event: PluginEventName; payload: unknown }
	| { type: 'cleanup'; cleanupId: number };

export type WorkerToHostMessage =
	| { type: 'ready'; registrations: WorkerRegistrations }
	| { type: 'startupError'; error: string }
	| { type: 'request'; requestId: number; method: PluginHostMethod; args: unknown[] }
	| { type: 'invocationResult'; invocationId: number; ok: true; value: PluginUiNode | void }
	| { type: 'invocationResult'; invocationId: number; ok: false; error: string }
	| { type: 'cleanupComplete'; cleanupId: number }
	| { type: 'runtimeError'; error: string };

const HOST_METHODS = new Set<PluginHostMethod>([
	'getState', 'getTimerState', 'getTimerElapsed', 'getCurrentScramble', 'startInspection', 'startTimer', 'stopTimer', 'cancelTimer',
	'addSolve', 'addSolveWithDetails', 'updateSolve', 'deleteSolves', 'updateSettings', 'setCurrentSession', 'createSession', 'updateSession',
	'deleteSession', 'getStatistics', 'nextScramble', 'previousScramble', 'toast', 'alert', 'prompt', 'storageGet', 'storageSet',
	'storageRemove', 'refreshWidget', 'deviceSupports', 'requestDevice', 'writeDevice', 'readDevice', 'closeDevice'
]);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export const isWorkerToHostMessage = (value: unknown): value is WorkerToHostMessage => {
	if (!isRecord(value) || typeof value.type !== 'string') return false;
	switch (value.type) {
	case 'ready': {
		if (!isRecord(value.registrations)) return false;
		const registrations = value.registrations;
		return ['widgets', 'renderers', 'scramblers', 'languages', 'translations', 'events', 'commands'].every(key => Array.isArray(registrations[key]));
	}
	case 'startupError':
	case 'runtimeError': return typeof value.error === 'string' && value.error.length <= 20_000;
	case 'request': return isId(value.requestId) && typeof value.method === 'string' && HOST_METHODS.has(value.method as PluginHostMethod) && Array.isArray(value.args);
	case 'invocationResult': return isId(value.invocationId) && typeof value.ok === 'boolean' && (value.ok || (typeof value.error === 'string' && value.error.length <= 20_000));
	case 'cleanupComplete': return isId(value.cleanupId);
	default: return false;
	}
};
