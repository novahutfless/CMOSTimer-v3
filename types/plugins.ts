import { FullStateData, Session, Settings, Solve, SolvePhase } from './models';
import { LanguageCode, Penalty, ScramblerCategory, TimerState } from './enums';

export const CMOS_PLUGIN_API_VERSION = '1.1.0';

export interface PluginLanguageDefinition {
	code: LanguageCode;
	name: string;
	localizedNames?: Record<LanguageCode, string>;
	translations?: Record<string, string>;
}

export type PluginRenderCleanup = () => void;

export interface PluginWidgetDefinition {
	id: string;
	name: string;
	render: (container: HTMLElement) => void | PluginRenderCleanup;
	/** @deprecated Return a cleanup function from render instead. */
	cleanup?: PluginRenderCleanup;
}

export interface CustomScramblerDefinition {
	id: string;
	name: string;
	category: ScramblerCategory | string;
	visualizer: string;
	generate: (length?: number, customConfig?: unknown) => string[];
}

export interface CustomRendererDefinition {
	visualizerType: string;
	render: (container: HTMLElement, scramble: string[], config: unknown) => void | PluginRenderCleanup;
	/** @deprecated Return a cleanup function from render instead. */
	cleanup?: PluginRenderCleanup;
}

export interface PluginAddSolveInput {
	time: number;
	inspectionTime?: number;
	phases?: SolvePhase[];
	penalty?: Penalty;
}

export interface PluginStopTimerInput {
	time?: number;
	inspectionTime?: number;
	phases?: SolvePhase[];
	penalty?: Penalty;
}

export interface PluginEventMap {
	stateChanged: FullStateData;
	timerStateChanged: TimerState;
	scrambleChanged: string[][];
	sessionChanged: { currentSessionId: string; session: Session | null };
	solveAdded: Solve;
}

export type PluginEventName = keyof PluginEventMap;
export type PluginEventCallback<K extends PluginEventName = PluginEventName> = (payload: PluginEventMap[K]) => void;

export interface PluginStorageApi {
	get: <T = unknown>(key: string, fallback?: T) => T | undefined;
	set: (key: string, value: unknown) => void;
	remove: (key: string) => void;
}

export interface CMOSApi {
	readonly apiVersion: string;

	// State
	getState: () => FullStateData;
	getTimerState: () => TimerState;
	getTimerElapsed: () => number;
	getCurrentScramble: () => string[][];
	startInspection: () => void;
	startTimer: () => void;
	stopTimer: (input?: PluginStopTimerInput) => string | null;
	cancelTimer: () => void;

	// Actions
	addSolve: (time: number, penalty?: Penalty) => string;
	addSolveWithDetails: (input: PluginAddSolveInput) => string;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	deleteSolves: (ids: string[], sessionId?: string) => void;
	updateSettings: (settings: Partial<Settings>) => void;
	setCurrentSession: (sessionId: string) => void;
	nextScramble: () => void;
	previousScramble: () => void;
	toast: (message: string) => void;

	// Registration
	registerWidget: (id: string, name: string, render: PluginWidgetDefinition['render'], cleanup?: PluginRenderCleanup) => void;
	registerScrambler: (definition: CustomScramblerDefinition) => void;
	registerScrambleRenderer: (visualizerType: string, render: CustomRendererDefinition['render'], cleanup?: PluginRenderCleanup) => void;
	registerLanguage: (definition: PluginLanguageDefinition) => void;
	registerTranslations: (languageCode: LanguageCode, translations: Record<string, string>) => void;

	// Events and lifecycle
	on: <K extends PluginEventName>(event: K, callback: PluginEventCallback<K>) => PluginRenderCleanup;
	onCleanup: (callback: PluginRenderCleanup) => void;

	// Interaction and namespaced persistence
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
	storage: PluginStorageApi;
}

export interface PluginScript {
	id: string;
	name: string;
	code: string;
	enabled: boolean;
	version?: string;
	description?: string;
	/** Minimum compatible CMOSTimer plugin API version. */
	apiVersion?: string;
	/** Previous runnable source used automatically if an edited version fails. */
	lastKnownGoodCode?: string;
}

export type PluginRuntimeState = 'disabled' | 'loading' | 'active' | 'fallback' | 'error' | 'incompatible';

export interface PluginRuntimeStatus {
	pluginId: string;
	state: PluginRuntimeState;
	message?: string;
	updatedAt: number;
}
