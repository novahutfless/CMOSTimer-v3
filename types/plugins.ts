import { FullStateData, Session, Settings, Solve, SolvePhase } from './models';
import { LanguageCode, Penalty, ScramblerCategory, StatType, TimerState } from './enums';

export const CMOS_PLUGIN_API_VERSION = '2.1.0';

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
	| { type: 'deviceButton'; text: string; action: string; request: PluginDeviceRequest; tone?: PluginUiTone; disabled?: boolean }
	| { type: 'container'; direction?: 'row' | 'column'; align?: 'start' | 'center' | 'end' | 'stretch'; gap?: 'small' | 'medium' | 'large'; children: PluginUiNode[] }
	| { type: 'spacer'; size?: 'small' | 'medium' | 'large' };

export interface PluginWidgetDefinition {
	id: string;
	name: string;
	render: () => Promise<PluginUiNode>;
	handleAction?: (action: string, payload?: unknown) => Promise<void>;
	requestDevice?: (request: PluginDeviceRequest) => Promise<PluginDeviceDescriptor>;
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

export type PluginPermission =
	| 'state:read'
	| 'timer:control'
	| 'solves:write'
	| 'sessions:write'
	| 'settings:write'
	| 'storage'
	| 'ui'
	| 'commands'
	| 'devices';

export const PLUGIN_PERMISSIONS: readonly PluginPermission[] = ['state:read', 'timer:control', 'solves:write', 'sessions:write', 'settings:write', 'storage', 'ui', 'commands', 'devices'];

export interface PluginSessionInput {
	name: string;
	scramblerId: string | string[];
	tags?: string[];
}

export interface PluginStatisticsQuery {
	sessionId?: string;
	type: StatType;
	size?: number;
}

export interface PluginStatisticsResult {
	count: number;
	validCount: number;
	totalTime: number;
	current: number | null;
	best: number | null;
	bestSolveIds: string[];
}

export interface PluginCommandDefinition {
	id: string;
	name: string;
	description?: string;
	defaultBinding?: string;
}

export type PluginDeviceKind = 'serial' | 'hid' | 'usb' | 'bluetooth';
export interface PluginDeviceRequest { kind: PluginDeviceKind; filters?: Array<Record<string, unknown>>; baudRate?: number; configurationValue?: number; interfaceNumber?: number }
export interface PluginDeviceDescriptor { id: string; kind: PluginDeviceKind; name: string }
export interface PluginDeviceWriteOptions { endpoint?: number; reportId?: number; service?: string; characteristic?: string }
export interface PluginDeviceApi {
	supports: (kind: PluginDeviceKind) => Promise<boolean>;
	request: (request: PluginDeviceRequest) => Promise<PluginDeviceDescriptor>;
	write: (deviceId: string, data: number[], options?: PluginDeviceWriteOptions) => Promise<void>;
	read: (deviceId: string, options?: PluginDeviceWriteOptions & { length?: number }) => Promise<number[]>;
	close: (deviceId: string) => Promise<void>;
}

export type PluginPublicMetadata = Omit<PluginScript, 'code' | 'lastKnownGoodCode' | 'permissions' | 'requestedPermissions'>;
export type PluginStateSnapshot = Omit<FullStateData, 'plugins'> & { plugins: PluginPublicMetadata[] };

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
	stateChanged: PluginStateSnapshot;
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
	getState: () => Promise<PluginStateSnapshot>;
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
	createSession: (input: PluginSessionInput) => Promise<string>;
	updateSession: (sessionId: string, updates: Partial<Session>) => Promise<void>;
	deleteSession: (sessionId: string) => Promise<void>;
	getStatistics: (query: PluginStatisticsQuery) => Promise<PluginStatisticsResult>;
	nextScramble: () => Promise<void>;
	previousScramble: () => Promise<void>;
	toast: (message: string) => Promise<void>;
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
	storage: PluginStorageApi;
	registerWidget: (id: string, name: string, render: () => PluginUiNode | Promise<PluginUiNode>, onAction?: (action: string, payload?: unknown) => void | Promise<void>) => void;
	refreshWidget: (id: string) => Promise<void>;
	registerScrambler: (definition: PluginScramblerDefinition) => void;
	registerScrambleRenderer: (visualizerType: string, render: (scramble: string[], config: unknown) => PluginUiNode | Promise<PluginUiNode>) => void;
	registerLanguage: (definition: PluginLanguageDefinition) => void;
	registerTranslations: (languageCode: LanguageCode, translations: Record<string, string>) => void;
	registerCommand: (definition: PluginCommandDefinition, callback: () => void | Promise<void>) => void;
	devices: PluginDeviceApi;
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
	createSession: (input: PluginSessionInput) => string;
	updateSession: (sessionId: string, updates: Partial<Session>) => void;
	deleteSession: (sessionId: string) => void;
	getStatistics: (query: PluginStatisticsQuery) => PluginStatisticsResult;
	deviceSupports: (kind: PluginDeviceKind) => boolean;
	requestDevice: (pluginId: string, request: PluginDeviceRequest) => Promise<PluginDeviceDescriptor>;
	writeDevice: (pluginId: string, deviceId: string, data: number[], options?: PluginDeviceWriteOptions) => Promise<void>;
	readDevice: (pluginId: string, deviceId: string, options?: PluginDeviceWriteOptions & { length?: number }) => Promise<number[]>;
	closeDevice: (pluginId: string, deviceId: string) => Promise<void>;
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
	permissions?: PluginPermission[];
	requestedPermissions?: PluginPermission[];
}

export type PluginRuntimeState = 'disabled' | 'loading' | 'active' | 'fallback' | 'error' | 'incompatible' | 'unsupported';

export interface PluginRuntimeStatus {
	pluginId: string;
	state: PluginRuntimeState;
	message?: string;
	updatedAt: number;
}
