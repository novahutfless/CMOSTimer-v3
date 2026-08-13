import { FullStateData, Session, Settings, Solve, SolvePhase } from './models';
import { LanguageCode, Penalty, ScramblerCategory, TimerState } from './enums';

export const CMOS_PLUGIN_API_VERSION = '2.0.0';

export interface PluginLanguageDefinition {
	code: LanguageCode;
	name: string;
	localizedNames?: Record<LanguageCode, string>;
	translations?: Record<string, string>;
}

export type PluginUiTone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger';
export type PluginUiSize = 'small' | 'medium' | 'large';

export type PluginUiNode =
	| string
	| { type: 'text'; text: string; tone?: PluginUiTone; size?: PluginUiSize }
	| { type: 'button'; text: string; action: string; tone?: PluginUiTone; disabled?: boolean }
	| { type: 'container'; direction?: 'row' | 'column'; align?: 'start' | 'center' | 'end' | 'stretch'; gap?: 'small' | 'medium' | 'large'; children: PluginUiNode[] }
	| { type: 'spacer'; size?: 'small' | 'medium' | 'large' };

export interface PluginWidgetDefinition {
	id: string;
	name: string;
	render: () => Promise<PluginUiNode>;
	handleAction?: (action: string) => Promise<void>;
}

export interface PluginScramblerDefinition {
	id: string;
	name: string;
	category: ScramblerCategory | string;
	visualizer: string;
	moves: string[];
	length: number;
	opposites?: string[];
}

/** Host-side registry representation. Plugin authors use PluginScramblerDefinition. */
export interface CustomScramblerDefinition {
	id: string;
	name: string;
	category: ScramblerCategory | string;
	visualizer: string;
	generate: (length?: number, customConfig?: unknown) => string[];
}

export interface PluginScrambleRendererDefinition {
	visualizerType: string;
	render: (scramble: string[], config: unknown) => Promise<PluginUiNode>;
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
export type PluginEventCallback<K extends PluginEventName = PluginEventName> = (payload: PluginEventMap[K]) => void | Promise<void>;
export type PluginUnsubscribe = () => void;

export interface PluginStorageApi {
	get: <T = unknown>(key: string, fallback?: T) => Promise<T | undefined>;
	set: (key: string, value: unknown) => Promise<void>;
	remove: (key: string) => Promise<void>;
}

/** The asynchronous, serializable API visible inside an isolated plugin worker. */
export interface CMOSApi {
	readonly apiVersion: string;
	getState: () => Promise<FullStateData>;
	getTimerState: () => Promise<TimerState>;
	getTimerElapsed: () => Promise<number>;
	getCurrentScramble: () => Promise<string[][]>;
	startInspection: () => Promise<void>;
	startTimer: () => Promise<void>;
	stopTimer: (input?: PluginStopTimerInput) => Promise<string | null>;
	cancelTimer: () => Promise<void>;
	addSolve: (time: number, penalty?: Penalty) => Promise<string>;
	addSolveWithDetails: (input: PluginAddSolveInput) => Promise<string>;
	updateSolve: (id: string, updates: Partial<Solve>) => Promise<void>;
	deleteSolves: (ids: string[], sessionId?: string) => Promise<void>;
	updateSettings: (settings: Partial<Settings>) => Promise<void>;
	setCurrentSession: (sessionId: string) => Promise<void>;
	nextScramble: () => Promise<void>;
	previousScramble: () => Promise<void>;
	toast: (message: string) => Promise<void>;
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
	storage: PluginStorageApi;
	registerWidget: (id: string, name: string, render: () => PluginUiNode | Promise<PluginUiNode>, onAction?: (action: string) => void | Promise<void>) => void;
	refreshWidget: (id: string) => Promise<void>;
	registerScrambler: (definition: PluginScramblerDefinition) => void;
	registerScrambleRenderer: (visualizerType: string, render: (scramble: string[], config: unknown) => PluginUiNode | Promise<PluginUiNode>) => void;
	registerLanguage: (definition: PluginLanguageDefinition) => void;
	registerTranslations: (languageCode: LanguageCode, translations: Record<string, string>) => void;
	on: <K extends PluginEventName>(event: K, callback: PluginEventCallback<K>) => PluginUnsubscribe;
	onCleanup: (callback: () => void | Promise<void>) => void;
}

/** Internal synchronous host capabilities. Never passed directly to worker code. */
export interface PluginHostApi {
	readonly apiVersion: string;
	getState: () => FullStateData;
	getTimerState: () => TimerState;
	getTimerElapsed: () => number;
	getCurrentScramble: () => string[][];
	startInspection: () => void;
	startTimer: () => void;
	stopTimer: (input?: PluginStopTimerInput) => string | null;
	cancelTimer: () => void;
	addSolve: (time: number, penalty?: Penalty) => string;
	addSolveWithDetails: (input: PluginAddSolveInput) => string;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	deleteSolves: (ids: string[], sessionId?: string) => void;
	updateSettings: (settings: Partial<Settings>) => void;
	setCurrentSession: (sessionId: string) => void;
	nextScramble: () => void;
	previousScramble: () => void;
	toast: (message: string) => void;
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

export interface PluginScript {
	id: string;
	name: string;
	code: string;
	enabled: boolean;
	version?: string;
	description?: string;
	apiVersion?: string;
	lastKnownGoodCode?: string;
}

export type PluginRuntimeState = 'disabled' | 'loading' | 'active' | 'fallback' | 'error' | 'incompatible' | 'unsupported';

export interface PluginRuntimeStatus {
	pluginId: string;
	state: PluginRuntimeState;
	message?: string;
	updatedAt: number;
}
