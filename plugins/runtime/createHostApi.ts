import {
	CMOS_PLUGIN_API_VERSION,
	FullStateData,
	Goal,
	PluginAddSolveInput,
	PluginHostApi,
	PluginScript,
	PluginDeviceKind,
	PluginDeviceRequest,
	PluginDeviceDescriptor,
	PluginDeviceWriteOptions,
	PluginSessionInput,
	PluginStatisticsQuery,
	PluginStatisticsResult,
	PluginStopTimerInput,
	Settings,
	Solve,
	SolveMap,
	StatConfig,
	TimerState
} from '../../types';
import { buildGlobalStats } from '../../utils/statistics';
import { getBestStatValue, getCurrentStatValue } from '../../utils/math';

type CreateHostApiInput = {
	sessions: FullStateData['sessions']; solves: SolveMap; settings: Settings; statsConfig: StatConfig[]; goals: Goal[]; plugins: PluginScript[];
	currentSessionId: string; timerState: TimerState; getTimerElapsed: () => number; currentScramble: string[][];
	startInspection: () => void; startTimer: () => void; stopTimer: (input?: PluginStopTimerInput) => string | null; cancelTimer: () => void;
	addSolve: (input: PluginAddSolveInput) => string; updateSolve: (id: string, updates: Partial<Solve>) => void; deleteSolves: (ids: string[], sessionId?: string) => void;
	updateSettings: (settings: Partial<Settings>) => void; setCurrentSession: (sessionId: string) => void; nextScramble: () => void; previousScramble: () => void;
	createSession: (input: PluginSessionInput) => string; updateSession: (sessionId: string, updates: Partial<FullStateData['sessions'][number]>) => void; deleteSession: (sessionId: string) => void;
	deviceSupports: (kind: PluginDeviceKind) => boolean; requestDevice: (pluginId: string, request: PluginDeviceRequest) => Promise<PluginDeviceDescriptor>;
	writeDevice: (pluginId: string, deviceId: string, data: number[], options?: PluginDeviceWriteOptions) => Promise<void>; closeDevice: (pluginId: string, deviceId: string) => Promise<void>;
	readDevice: (pluginId: string, deviceId: string, options?: PluginDeviceWriteOptions & { length?: number }) => Promise<number[]>;
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
	createSession: input.createSession,
	updateSession: input.updateSession,
	deleteSession: input.deleteSession,
	getStatistics: (query: PluginStatisticsQuery): PluginStatisticsResult => {
		const session = input.sessions.find(item => item.id === (query.sessionId || input.currentSessionId));
		if (!session) throw new Error(`Unknown session "${query.sessionId}".`);
		const solves = session.solveIds.map(id => input.solves[id]).filter((solve): solve is Solve => Boolean(solve)).sort((a, b) => a.timestamp - b.timestamp);
		const size = query.type === 'SINGLE' ? 1 : query.size ?? 5;
		if (!Number.isInteger(size) || size < 1 || size > 10_000) throw new Error('Statistic size must be from 1 to 10000.');
		const config = { id: 'plugin-query', type: query.type, size };
		const global = buildGlobalStats(solves);
		const best = getBestStatValue(config, solves);
		return { count: global.count, validCount: solves.filter(solve => solve.penalty !== 'DNF' && solve.penalty !== 'DNS').length, totalTime: global.time, current: getCurrentStatValue(config, solves), best: best.best, bestSolveIds: best.bestWindow?.map(solve => solve.id) || [] };
	},
	deviceSupports: input.deviceSupports,
	requestDevice: input.requestDevice,
	writeDevice: input.writeDevice,
	readDevice: input.readDevice,
	closeDevice: input.closeDevice,
	nextScramble: input.nextScramble,
	previousScramble: input.previousScramble,
	toast: input.toast,
	alert: input.alert,
	prompt: input.prompt
});
