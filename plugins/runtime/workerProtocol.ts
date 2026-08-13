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
