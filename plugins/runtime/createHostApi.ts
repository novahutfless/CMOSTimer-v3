import {
	CMOS_PLUGIN_API_VERSION,
	FullStateData,
	Goal,
	PluginAddSolveInput,
	PluginHostApi,
	PluginScript,
	PluginStopTimerInput,
	Settings,
	Solve,
	SolveMap,
	StatConfig,
	TimerState
} from '../../types';

type CreateHostApiInput = {
	sessions: FullStateData['sessions']; solves: SolveMap; settings: Settings; statsConfig: StatConfig[]; goals: Goal[]; plugins: PluginScript[];
	currentSessionId: string; timerState: TimerState; getTimerElapsed: () => number; currentScramble: string[][];
	startInspection: () => void; startTimer: () => void; stopTimer: (input?: PluginStopTimerInput) => string | null; cancelTimer: () => void;
	addSolve: (input: PluginAddSolveInput) => string; updateSolve: (id: string, updates: Partial<Solve>) => void; deleteSolves: (ids: string[], sessionId?: string) => void;
	updateSettings: (settings: Partial<Settings>) => void; setCurrentSession: (sessionId: string) => void; nextScramble: () => void; previousScramble: () => void;
	toast: (message: string) => void; alert: (message: string) => Promise<void>; prompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

export const createHostApi = (input: CreateHostApiInput): PluginHostApi => ({
	apiVersion: CMOS_PLUGIN_API_VERSION,
	getState: () => ({
		sessions: input.sessions, solves: input.solves, settings: input.settings, statsConfig: input.statsConfig,
		goals: input.goals, plugins: input.plugins, currentSessionId: input.currentSessionId, updatedAt: Date.now()
	}),
	getTimerState: () => input.timerState,
	getTimerElapsed: input.getTimerElapsed,
	getCurrentScramble: () => input.currentScramble,
	startInspection: input.startInspection,
	startTimer: input.startTimer,
	stopTimer: input.stopTimer,
	cancelTimer: input.cancelTimer,
	addSolve: (time, penalty) => input.addSolve({ time, ...(penalty === undefined ? {} : { penalty }) }),
	addSolveWithDetails: input.addSolve,
	updateSolve: input.updateSolve,
	deleteSolves: input.deleteSolves,
	updateSettings: input.updateSettings,
	setCurrentSession: input.setCurrentSession,
	nextScramble: input.nextScramble,
	previousScramble: input.previousScramble,
	toast: input.toast,
	alert: input.alert,
	prompt: input.prompt
});
