import {
	CMOSApi,
	CMOS_PLUGIN_API_VERSION,
	FullStateData,
	Goal,
	PluginAddSolveInput,
	PluginScript,
	PluginStopTimerInput,
	PluginStorageApi,
	Settings,
	Solve,
	SolveMap,
	StatConfig,
	TimerState
} from '../../types';

type CreateHostApiInput = {
	sessions: FullStateData['sessions'];
	solves: SolveMap;
	settings: Settings;
	statsConfig: StatConfig[];
	goals: Goal[];
	plugins: PluginScript[];
	currentSessionId: string;
	timerState: TimerState;
	getTimerElapsed: () => number;
	currentScramble: string[][];
	startInspection: () => void;
	startTimer: () => void;
	stopTimer: (input?: PluginStopTimerInput) => string | null;
	cancelTimer: () => void;
	addSolve: (input: PluginAddSolveInput) => string;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	deleteSolves: (ids: string[], sessionId?: string) => void;
	updateSettings: (settings: Partial<Settings>) => void;
	setCurrentSession: (sessionId: string) => void;
	nextScramble: () => void;
	previousScramble: () => void;
	toast: (message: string) => void;
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

const unavailableStorage: PluginStorageApi = {
	get: <T = unknown>(_key: string, fallback?: T): T | undefined => fallback,
	set: (_key, _value): void => undefined,
	remove: (_key): void => undefined
};

export const createHostApi = ({
	sessions,
	solves,
	settings,
	statsConfig,
	goals,
	plugins,
	currentSessionId,
	timerState,
	getTimerElapsed,
	currentScramble,
	startInspection,
	startTimer,
	stopTimer,
	cancelTimer,
	addSolve,
	updateSolve,
	deleteSolves,
	updateSettings,
	setCurrentSession,
	nextScramble,
	previousScramble,
	toast,
	alert,
	prompt
}: CreateHostApiInput): CMOSApi => ({
	apiVersion: CMOS_PLUGIN_API_VERSION,
	getState: (): FullStateData => ({
		sessions,
		solves,
		settings,
		statsConfig,
		goals,
		plugins,
		currentSessionId,
		updatedAt: Date.now()
	}),
	getTimerState: (): TimerState => timerState,
	getTimerElapsed,
	getCurrentScramble: (): string[][] => currentScramble,
	startInspection,
	startTimer,
	stopTimer,
	cancelTimer,
	addSolve: (time, penalty): string => addSolve({ time, ...(penalty === undefined ? {} : { penalty }) }),
	addSolveWithDetails: addSolve,
	updateSolve,
	deleteSolves,
	updateSettings,
	setCurrentSession,
	nextScramble,
	previousScramble,
	toast,
	registerWidget: (_id, _name, _render, _cleanup): void => undefined,
	registerScrambler: (_definition): void => undefined,
	registerScrambleRenderer: (_visualizerType, _render, _cleanup): void => undefined,
	registerLanguage: (_definition): void => undefined,
	registerTranslations: (_languageCode, _translations): void => undefined,
	on: (_event, _callback): (() => void) => () => undefined,
	alert,
	prompt,
	onCleanup: (_callback): void => undefined,
	storage: unavailableStorage
});
