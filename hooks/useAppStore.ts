import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import { Session, Solve, Settings, StatConfig, StatType, Penalty, ComputedSolve, PuzzleType, InspectionDirection, InspectionVoice, TimePrecision, StartInputMethod, PBVisualType, AppTheme, Language, SolvePhase, ShortcutAction, AuthState, FullStateData, SolveMap, SyncAction, SyncActionType, Goal, PluginScript, DateFormat } from '../types';
import { generateTestSessions, generateId, DNF_VALUE, getEffectiveSettings, getSolveTime, recalculateSessionStats } from '../utils';
import { generateScramble } from '../utils/scramblerRegistry';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/layouts';
import { api } from '../utils/api';

type LegacyScramblerId = string | string[];
type LegacyScramble = string | string[] | string[][];
type SolveWithOptionalStats = Solve & { stats?: unknown };
type LegacySolve = Omit<Solve, 'scramble' | 'scramblerId'> & {
	scramble?: LegacyScramble;
	scramblerId?: LegacyScramblerId;
	stats?: unknown;
};
type LegacySession = Omit<Session, 'scramblerId' | 'solveIds'> & {
	scramblerId?: LegacyScramblerId;
	solves?: LegacySolve[];
	solveIds?: string[];
};
type ProcessImportData = {
	sessions: { session: Session; targetId: string | 'NEW' }[];
	settings?: Settings;
	statsConfig?: StatConfig[];
	deduplicate?: boolean;
};
type AddSolveResult = { id: string; isPB: boolean };
export type AppStore = {
	sessions: Session[];
	solves: SolveMap;
	currentSession: Session & { solves: Solve[] };
	currentSessionId: string;
	setCurrentSessionId: React.Dispatch<React.SetStateAction<string>>;
	settings: Settings;
	setSettings: React.Dispatch<React.SetStateAction<Settings>>;
	statsConfig: StatConfig[];
	setStatsConfig: React.Dispatch<React.SetStateAction<StatConfig[]>>;
	goals: Goal[];
	plugins: PluginScript[];
	effectiveSettings: Settings;
	currentScramble: string[][];
	computedSolves: ComputedSolve[];
	auth: AuthState;
	actions: {
		addSolve: (time: number, inspectionTime: number, phases?: SolvePhase[], penaltyOverride?: Penalty) => AddSolveResult;
		deleteSolves: (ids: string[], sessionId?: string) => void;
		updatePenalty: (id: string, penalty: Penalty) => void;
		updateSolve: (id: string, updates: Partial<Solve>) => void;
		createSession: (name: string, scramblerId: string | string[], tags?: string[]) => void;
		updateSession: (id: string, updates: Partial<Session>) => void;
		deleteSession: (id: string) => void;
		moveSolves: (targetSessionId: string, solveIds: string[]) => void;
		duplicateSolves: (targetSessionId: string, solveIds: string[]) => void;
		nextScramble: () => void;
		prevScramble: () => void;
		addGoal: (goal: Goal) => void;
		updateGoal: (id: string, updates: Partial<Goal>) => void;
		deleteGoal: (id: string) => void;
		addPlugin: (script: PluginScript) => void;
		updatePlugin: (id: string, updates: Partial<PluginScript>) => void;
		deletePlugin: (id: string) => void;
		processImport: (data: ProcessImportData) => void;
		login: (u: string, p: string) => Promise<void>;
		register: (u: string, p: string, e: string) => Promise<void>;
		logout: () => void;
		hasSignificantLocalData: () => boolean;
	};
};
export type AppStoreActions = AppStore['actions'];

const normalizeScramblerId = (scramblerId: LegacyScramblerId | undefined, fallback?: LegacyScramblerId): string[] => {
	const resolved = scramblerId ?? fallback ?? '333';
	return Array.isArray(resolved) ? resolved : [resolved];
};

const normalizeScramble = (scramble: LegacyScramble | undefined): string[][] => {
	if (!scramble) return [];
	if (typeof scramble === 'string') return [scramble.split(' ')];
	if (Array.isArray(scramble)) {
		if (scramble.length > 0 && typeof scramble[0] === 'string') return [scramble as string[]];
		return scramble as string[][];
	}
	return [];
};

const DEFAULT_STATS_CONFIG: StatConfig[] = [
	{ id: '1', type: StatType.SINGLE, size: 1 },
	{ id: '2', type: StatType.MEAN, size: 3 },
	{ id: '3', type: StatType.AVERAGE, size: 5 },
	{ id: '4', type: StatType.AVERAGE, size: 12 },
	{ id: '5', type: StatType.AVERAGE, size: 50 },
	{ id: '6', type: StatType.AVERAGE, size: 100 },
	{ id: '7', type: StatType.WEIGHTED_AVG, size: 1000 },
];

const DEFAULT_TIMELIST_CONFIG: StatConfig[] = [
	{ id: 'ml0', type: StatType.SINGLE, size: 1 },
	{ id: 'ml1', type: StatType.MEAN, size: 3 },
	{ id: 'ml2', type: StatType.AVERAGE, size: 5 }
];

const DEFAULT_SHORTCUTS: Record<ShortcutAction, string | null> = {
	[ShortcutAction.NEXT_SCRAMBLE]: 'Digit2',
	[ShortcutAction.PREV_SCRAMBLE]: 'Shift+Digit2',
	[ShortcutAction.PENALTY_PLUS_TWO]: 'Digit3',
	[ShortcutAction.PENALTY_DNF]: 'Digit4',
	[ShortcutAction.DELETE_LAST]: 'Backspace',
	[ShortcutAction.SELECT_FIRST]: 'Digit7',
	[ShortcutAction.OPEN_DETAILS]: 'Ctrl+Digit2',
	[ShortcutAction.ESCAPE]: 'Escape',
	[ShortcutAction.MOVE_SELECTION_UP]: 'ArrowUp',
	[ShortcutAction.MOVE_SELECTION_DOWN]: 'ArrowDown',
	[ShortcutAction.EXTEND_SELECTION_UP]: 'Shift+ArrowUp',
	[ShortcutAction.EXTEND_SELECTION_DOWN]: 'Shift+ArrowDown',
	[ShortcutAction.OPEN_SESSION_MANAGER]: 'Digit8',
	[ShortcutAction.MANUAL_ENTRY]: 'Digit1',
	[ShortcutAction.PREV_PUZZLE]: 'ArrowLeft',
	[ShortcutAction.NEXT_PUZZLE]: 'ArrowRight',
	[ShortcutAction.OPEN_COMMAND_PALETTE]: 'Digit5'
};

const DEFAULT_SETTINGS: Settings = {
	inspectionEnabled: true,
	inspectionDirection: InspectionDirection.DOWN,
	inspectionVoice: InspectionVoice.NONE,
	autoPenalty: true,
	holdToStart: true,
	startInput: StartInputMethod.SPACE,
	restartDelayEnabled: false,
	restartDelayMs: 500,
	timePrecision: TimePrecision.MILLI,
	inspectionPrecision: TimePrecision.SECONDS,
	inspectionFlashes: { enabled8: false, enabled12: false, enabled15: false },
	useStackmat: false,
	hideWhileTiming: false,
	hideWhileTimingText: '',
	theme: AppTheme.ZINC,
	backgroundColor: '#18181b',
	textColor: '#e4e4e7',
	backgroundImage: '',
	backgroundImageOpacity: 20,
	language: Language.EN,
	dateFormat: DateFormat.ISO,
	pbVisuals: PBVisualType.HIGHLIGHT,
	pbFireworks: true,
	paginationEnabled: false,
	pageSize: 100,
	timelistStats: DEFAULT_TIMELIST_CONFIG,
	timeDistribution: { mode: 'ALL', size: 100 },
	solvesOverTime: {
		mode: 'SESSION',
		customDate: new Date().toISOString().split('T')[0],
		customCount: 100
	},
	goalsWidget: {
		showCompleted: true
	},
	metronome: {
		bpm: 60,
		volume: 50
	},
	shortcuts: DEFAULT_SHORTCUTS,
	layout: DEFAULT_LAYOUT_CONFIG,
	scrambleImage: {
		baseColor: 'black',
		faceColors: {
			U: '#FFFFFF', R: '#DC2626', F: '#16A34A', D: '#EAB308', L: '#EA580C', B: '#2563EB',
			face7: '#9CA3AF', face8: '#F472B6', face9: '#FEF3C7', face10: '#A7F3D0', face11: '#C084FC', face12: '#FCD34D'
		},
		clockColors: {
			clockFace: '#374151', clockBack: '#1F2937',
			pinUp: '#EAB308', pinDown: '#4B5563',
			wheelF: '#1F2937', wheelB: '#374151',
			marksF: '#FFFFFF', marksB: '#FFFFFF'
		}
	},
	pbSheet: {
		enabled: false,
		title: 'My PBs',
		sessionIds: [],
		stats: [
			{ id: 's_single', type: StatType.SINGLE, size: 1 },
			{ id: 's_ao5', type: StatType.AVERAGE, size: 5 },
			{ id: 's_ao12', type: StatType.AVERAGE, size: 12 }
		],
		showDate: true,
		showSolveCount: true
	}
};

// Initialization Helper: Migrate old "embedded" sessions to "normalized"
const loadAndNormalizeData = (): { sessions: Session[]; solves: SolveMap } => {
	const savedSessions = localStorage.getItem('cubetime_sessions');
	const savedSolves = localStorage.getItem('cubetime_solves');

	let finalSessions: Session[] = [];
	let finalSolves: SolveMap = {};

	if (savedSolves && savedSessions) {
		// Already normalized
		try {
			finalSessions = JSON.parse(savedSessions);
			finalSolves = JSON.parse(savedSolves);
		} catch (e) {
			console.error("Load Error", e); 
		}
	} else if (savedSessions) {
		// Old format migration
		try {
			const parsed = JSON.parse(savedSessions) as unknown;
			const oldSessions: LegacySession[] = Array.isArray(parsed) ? parsed : [];

			oldSessions.forEach(s => {
				// Map scrambler ID logic
				let scramblerId = s.scramblerId;
				if (!scramblerId) {
					if (s.scrambleType === PuzzleType.TWO) scramblerId = '222';
					else if (s.scrambleType === PuzzleType.FOUR) scramblerId = '444';
					else if (s.scrambleType === PuzzleType.FIVE) scramblerId = '555';
					else scramblerId = '333';
				}

				const solveIds: string[] = [];
				// Handle both legacy 'solves' array and potentially already migrated structures mixed in
				const list = Array.isArray(s.solves) ? s.solves : [];

				list.forEach((solve) => {
					if (solve && typeof solve === 'object') {
						const legacySolve = solve as LegacySolve;
						// Ensure ID
						const sid = legacySolve.id || generateId();
						// Parse scramble if string
						const normalizedScramble = normalizeScramble(legacySolve.scramble);

						const newSolve: SolveWithOptionalStats = {
							...legacySolve,
							id: sid,
							scramble: normalizedScramble,
							scramblerId: normalizeScramblerId(legacySolve.scramblerId, scramblerId)
						};
						// Remove stats if they exist from migration
						if ('stats' in newSolve) delete newSolve.stats;

						finalSolves[sid] = newSolve;
						solveIds.push(sid);
					}
				});

				finalSessions.push({
					id: s.id,
					name: s.name,
					tags: s.tags,
					scramblerId: Array.isArray(scramblerId) ? scramblerId : [scramblerId],
					customScramblerConfig: s.customScramblerConfig,
					solveIds,
					sourceSessionIds: s.sourceSessionIds || [],
					settingsOverride: s.settingsOverride
				});
			});

		} catch (e) {
			console.error("Migration Error", e); 
		}
	} else {
		// Default / Test Data
		const test = generateTestSessions();
		test.forEach(s => {
			const solveIds = (s.solves || []).map((solve: Solve) => {
				// Force structure
				solve.scramble = normalizeScramble(solve.scramble as unknown as LegacyScramble);
				solve.scramblerId = normalizeScramblerId(solve.scramblerId as unknown as LegacyScramblerId);
				if ('stats' in (solve as SolveWithOptionalStats)) delete (solve as SolveWithOptionalStats).stats;
				finalSolves[solve.id] = solve;
				return solve.id;
			});
			const { solves: _solves, ...rest } = s;
			void _solves;
			finalSessions.push({ ...rest, scramblerId: [rest.scramblerId], solveIds, sourceSessionIds: [] } as Session);
		});
	}

	// Late Migration: Ensure everything is arrays in loaded data
	finalSessions.forEach(s => {
		if (!Array.isArray(s.scramblerId)) s.scramblerId = [s.scramblerId];
		if (!s.sourceSessionIds) s.sourceSessionIds = [];
	});
	Object.values(finalSolves).forEach(s => {
		s.scramble = normalizeScramble(s.scramble as unknown as LegacyScramble);
		s.scramblerId = normalizeScramblerId(s.scramblerId as unknown as LegacyScramblerId);
	});

	return { sessions: finalSessions, solves: finalSolves };
};

const useProvideAppStore = (): AppStore => {
	// State
	const [stateLoaded, setStateLoaded] = useState(false);
	const [solves, setSolves] = useState<SolveMap>({});
	const [sessions, setSessions] = useState<Session[]>([]);

	const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
		return localStorage.getItem('cubetime_current_session') || 'default';
	});

	const [goals, setGoals] = useState<Goal[]>(() => {
		try {
			const saved = localStorage.getItem('cubetime_goals');
			return saved ? JSON.parse(saved) : [];
		} catch {
			return []; 
		}
	});

	// Load plugins from state, with fallback to legacy localstorage key for migration
	const [plugins, setPlugins] = useState<PluginScript[]>(() => {
		try {
			const saved = localStorage.getItem('cubetime_plugins_state');
			if (saved) return JSON.parse(saved);

			const legacy = localStorage.getItem('cubetime_plugins');
			if (legacy) return JSON.parse(legacy);
		} catch { }
		return [];
	});

	const [statsConfig, setStatsConfig] = useState<StatConfig[]>(() => {
		try {
			const saved = localStorage.getItem('cubetime_stats_config');
			return saved ? JSON.parse(saved) : DEFAULT_STATS_CONFIG;
		} catch {
			return DEFAULT_STATS_CONFIG; 
		}
	});

	const [settings, setSettings] = useState<Settings>(() => {
		try {
			const saved = localStorage.getItem('cubetime_settings');
			if (saved) {
				const parsed = JSON.parse(saved);
				const merged = {
					...DEFAULT_SETTINGS,
					...parsed,
					layout: parsed.layout || DEFAULT_LAYOUT_CONFIG,
					timeDistribution: parsed.timeDistribution || DEFAULT_SETTINGS.timeDistribution,
					solvesOverTime: parsed.solvesOverTime || DEFAULT_SETTINGS.solvesOverTime,
					goalsWidget: parsed.goalsWidget || DEFAULT_SETTINGS.goalsWidget,
					metronome: parsed.metronome || DEFAULT_SETTINGS.metronome,
					scrambleImage: { ...DEFAULT_SETTINGS.scrambleImage, ...(parsed.scrambleImage || {}) },
					pbSheet: parsed.pbSheet ? { ...DEFAULT_SETTINGS.pbSheet, ...parsed.pbSheet } : DEFAULT_SETTINGS.pbSheet
				};
				return merged;
			}
		} catch { }
		return DEFAULT_SETTINGS;
	});

	const [actionQueue, setActionQueue] = useState<SyncAction[]>(() => {
		try {
			const saved = localStorage.getItem('cubetime_sync_queue');
			return saved ? JSON.parse(saved) : [];
		} catch {
			return []; 
		}
	});

	const [auth, setAuth] = useState<AuthState>(() => {
		const token = localStorage.getItem('cubetime_token');
		const userStr = localStorage.getItem('cubetime_user');
		return {
			token,
			user: userStr ? JSON.parse(userStr) : null,
			isSynced: true,
			lastSyncTime: Date.now()
		};
	});

	// Scramble - Now Array of Array of Strings
	const [scrambleHistory, setScrambleHistory] = useState<string[][][]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	// --- Initialization ---
	useEffect(() => {
		if (!stateLoaded) {
			const { sessions: s, solves: slv } = loadAndNormalizeData();
			setSessions(s);
			setSolves(slv);
			setStateLoaded(true);

			// Ensure valid current session
			if (s.length > 0 && !s.some(sess => sess.id === currentSessionId)) 
				setCurrentSessionId(s[0].id);
            
		}
	}, [stateLoaded, currentSessionId]);

	// --- Persistence ---
	useEffect(() => {
		if (!stateLoaded) return;
		try {
			localStorage.setItem('cubetime_sessions', JSON.stringify(sessions)); 
		} catch { }
		try {
			localStorage.setItem('cubetime_solves', JSON.stringify(solves)); 
		} catch { }
	}, [sessions, solves, stateLoaded]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_current_session', currentSessionId); 
		} catch { }
	}, [currentSessionId]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_stats_config', JSON.stringify(statsConfig)); 
		} catch { }
	}, [statsConfig]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_settings', JSON.stringify(settings)); 
		} catch { }
	}, [settings]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_goals', JSON.stringify(goals)); 
		} catch { }
	}, [goals]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_plugins_state', JSON.stringify(plugins)); 
		} catch { }
	}, [plugins]);

	useEffect(() => {
		try {
			localStorage.setItem('cubetime_sync_queue', JSON.stringify(actionQueue)); 
		} catch { }
	}, [actionQueue]);

	// --- Sync Logic ---
	const queueAction = useCallback((action: Omit<SyncAction, 'timestamp'>): void => {
		if (!auth.token) return;
		setAuth(prev => ({ ...prev, isSynced: false }));
		setActionQueue(prev => [...prev, { ...action, timestamp: Date.now() }]);
	}, [auth.token]);

	// Queue setting changes
	const prevSettingsRef = useRef(settings);
	useEffect(() => {
		if (!auth.token) return;
		if (JSON.stringify(prevSettingsRef.current) !== JSON.stringify(settings)) {
			queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: settings });
			prevSettingsRef.current = settings;
		}
	}, [settings, auth.token, queueAction]);

	const prevGoalsRef = useRef(goals);
	useEffect(() => {
		if (!auth.token) return;
		if (JSON.stringify(prevGoalsRef.current) !== JSON.stringify(goals)) {
			queueAction({ type: SyncActionType.UPDATE_GOALS, payload: goals });
			prevGoalsRef.current = goals;
		}
	}, [goals, auth.token, queueAction]);

	const prevPluginsRef = useRef(plugins);
	useEffect(() => {
		if (!auth.token) return;
		if (JSON.stringify(prevPluginsRef.current) !== JSON.stringify(plugins)) {
			queueAction({ type: SyncActionType.UPDATE_PLUGINS, payload: plugins });
			prevPluginsRef.current = plugins;
		}
	}, [plugins, auth.token, queueAction]);

	// Sync Loop
	useEffect(() => {
		if (!auth.token || actionQueue.length === 0) return;

		const timer = setTimeout(async () => {
			const batch = [...actionQueue];
			try {
				setAuth(prev => ({ ...prev, isSynced: false })); // Ensure syncing state
				await api.sync(auth.token!, batch, auth.lastSyncTime || 0);

				// On success, remove the items we sent
				setActionQueue(prev => prev.filter(x => !batch.includes(x)));
				setAuth(prev => ({ ...prev, isSynced: true, lastSyncTime: Date.now() }));
			} catch (e) {
				console.error("Sync failed, retrying later", e);
				// Keep in queue
			}
		}, 5000); // Sync 5s after last change/attempt

		return (): void => clearTimeout(timer);
	}, [actionQueue, auth.token, auth.lastSyncTime]);


	// --- Derived ---
	const currentSession = useMemo(() => {
		const s = sessions.find(s => s.id === currentSessionId) || sessions[0];
		// Hydrate helper for components that expect embedded solves (like SessionManager)

		if (!s) return { id: 'temp', name: 'Loading', solveIds: [], solves: [], scramblerId: ['333'] } as unknown as Session & { solves: Solve[] };

		const hydratedSolves = s.solveIds
			.map(id => solves[id])
			.filter(Boolean)
			.sort((a, b) => a.timestamp - b.timestamp);

		return { ...s, solves: hydratedSolves };
	}, [sessions, currentSessionId, solves]);

	const effectiveSettings = useMemo(() => getEffectiveSettings(settings, currentSession), [settings, currentSession]);

	// Reset scramble history when switching sessions to ensure fresh scrambles for the new type
	useEffect(() => {
		setScrambleHistory([]);
		setHistoryIndex(-1);
	}, [currentSessionId]);

	// Scramble Init / Regeneration
	useEffect(() => {
		if (scrambleHistory.length === 0 && currentSession.scramblerId && currentSession.scramblerId.length > 0) {
			const s = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
			setScrambleHistory([s]);
			setHistoryIndex(0);
		}
	}, [currentSession.scramblerId, currentSession.customScramblerConfig, scrambleHistory.length]);

	const currentScramble = historyIndex >= 0 && historyIndex < scrambleHistory.length ? scrambleHistory[historyIndex] : [];

	// Compute Stats
	const computedSolves = useMemo<ComputedSolve[]>(() => {
		const hydrated = currentSession.solves || [];
		// Recalculate stats - returns array in same order (Chronological) with stats populated
		const withStats = recalculateSessionStats(hydrated);

		// Map to ComputedSolve (add PB info) - Iterate Chronologically to determine historical PBs
		const bests = new Map<string, number>();
		if (effectiveSettings.prePBs) Object.entries(effectiveSettings.prePBs).forEach(([k, v]) => bests.set(k, v as number));

		const computedChronological = withStats.map(solve => {
			const computed: ComputedSolve = { ...solve, stats: solve.stats };
			const isPBMap: Record<string, boolean> = {};

			settings.timelistStats.forEach(config => {
				let val: number | null = null;
				if (config.type === StatType.SINGLE) 
					val = getSolveTime(solve) ?? (solve.penalty === Penalty.DNF ? DNF_VALUE : null);
				else if (config.type === StatType.MEAN && config.size === 3) 
					val = solve.stats?.mean3 ?? null;
				else if (config.type === StatType.AVERAGE && config.size === 5) 
					val = solve.stats?.avg5 ?? null;
				else if (config.type === StatType.AVERAGE && config.size === 12) 
					val = solve.stats?.avg12 ?? null;
                

				if (val !== null && val !== DNF_VALUE) {
					// Check ID match
					let currentBest = bests.get(config.id);
					// Check Type_Size match (Generic)
					if (currentBest === undefined) {
						const genericKey = `${config.type}_${config.size}`;
						currentBest = bests.get(genericKey);
					}
					currentBest = currentBest ?? Infinity;

					if (val < currentBest) {
						// Update both specific and generic keys to keep tracking correct for this session
						bests.set(config.id, val);
						bests.set(`${config.type}_${config.size}`, val);
						isPBMap[config.id] = true;
					} else if (val === currentBest) {
						// Mark ties as PB consistent with typical timer behavior
						isPBMap[config.id] = true;
					}
				}
			});
			return { ...computed, historicalPBs: isPBMap };
		});

		return computedChronological.reverse(); // Return Newest First for UI
	}, [currentSession.solves, settings.timelistStats, effectiveSettings.prePBs]);

	// --- Actions ---

	const addSolve = (time: number, inspectionTime: number, phases?: SolvePhase[], penaltyOverride?: Penalty): AddSolveResult => {
		let penalty = Penalty.NONE;

		if (penaltyOverride) 
			penalty = penaltyOverride;
		else if (effectiveSettings.autoPenalty && inspectionTime !== -1) 
			if (inspectionTime >= 17000) penalty = Penalty.DNF;
			else if (inspectionTime >= 15000) penalty = Penalty.PLUS_TWO;
        

		const newSolve: Solve = {
			id: generateId(),
			timestamp: Date.now(),
			time,
			inspectionTime,
			phases,
			scramble: currentScramble,
			scramblerId: currentSession.scramblerId,
			penalty,
			tags: []
		};

		// Optimistic Update
		setSolves(prev => ({ ...prev, [newSolve.id]: newSolve }));

		const sessionsToUpdate: Session[] = [];

		setSessions(prev => prev.map(s => {
			const isCurrent = s.id === currentSessionId;
			// Check if this session subscribes to current session
			const isSubscriber = s.sourceSessionIds?.includes(currentSessionId);

			if (isCurrent || isSubscriber) {
				const updated = { ...s, solveIds: [...s.solveIds, newSolve.id] };
				sessionsToUpdate.push(updated);
				return updated;
			}
			return s;
		}));

		// Check for PB (Fireworks) - specific to current session context
		const isNewPB = computedSolves.every(s => {
			const t = getSolveTime(s) ?? Infinity;
			return time < t;
		});

		// Queue
		queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: [newSolve] });
		sessionsToUpdate.forEach(s => {
			queueAction({ type: SyncActionType.UPDATE_SESSION, payload: s });
		});

		const next = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
		setScrambleHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
		setHistoryIndex(prev => prev + 1);

		return { id: newSolve.id, isPB: isNewPB && settings.pbFireworks };
	};

	const deleteSolves = (ids: string[], sessionId?: string): void => {
		const idSet = new Set(ids);
		const sessionsToUpdate: Session[] = [];

		// 1. Update Sessions
		const nextSessions = sessions.map(s => {
			// If specific session targeted, only remove from that one. 
			// If global (sessionId undefined), remove from all.
			if (sessionId && s.id !== sessionId) return s;

			if (s.solveIds.some(id => idSet.has(id))) {
				const updated = { ...s, solveIds: s.solveIds.filter(id => !idSet.has(id)) };
				sessionsToUpdate.push(updated);
				return updated;
			}
			return s;
		});

		setSessions(nextSessions);

		// 2. Cleanup orphaned solves from data store
		// Calculate reference counts after session updates
		const remainingReferences = new Set<string>();
		nextSessions.forEach(s => s.solveIds.forEach(id => remainingReferences.add(id)));

		const idsToDeleteFromStore: string[] = [];

		setSolves(prev => {
			const next = { ...prev };
			ids.forEach(id => {
				if (!remainingReferences.has(id)) {
					// Data no longer referenced anywhere, safe to delete
					delete next[id];
					idsToDeleteFromStore.push(id);
				}
			});
			return next;
		});

		// Queue Actions
		if (idsToDeleteFromStore.length > 0) 
			queueAction({ type: SyncActionType.DELETE_SOLVES, payload: idsToDeleteFromStore });
        
		sessionsToUpdate.forEach(s => {
			queueAction({ type: SyncActionType.UPDATE_SESSION, payload: s });
		});
	};

	const updatePenalty = (id: string, penalty: Penalty): void => updateSolve(id, { penalty });

	const updateSolve = (id: string, updates: Partial<Solve>): void => {
		const oldSolve = solves[id];
		if (!oldSolve) return;
		const newSolve = { ...oldSolve, ...updates };

		setSolves(prev => ({ ...prev, [id]: newSolve }));
		queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: [newSolve] });
	};

	// Update to accept string[] for scramblerId
	const createSession = (name: string, scramblerId: string | string[], tags: string[] = []): void => {
		const scramblerIdArray = Array.isArray(scramblerId) ? scramblerId : [scramblerId];

		const newSession: Session = {
			id: generateId(),
			name,
			scramblerId: scramblerIdArray,
			solveIds: [],
			sourceSessionIds: [],
			tags,
			customScramblerConfig: undefined
		};

		setSessions(prev => [...prev, newSession]);
		setCurrentSessionId(newSession.id);

		queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSession });

		const s = generateScramble(scramblerIdArray);
		setScrambleHistory([s]);
		setHistoryIndex(0);
	};

	const updateSession = (id: string, updates: Partial<Session>): void => {
		let updatedSession: Session | null = null;
		setSessions(prev => prev.map(s => {
			if (s.id === id) {
				updatedSession = { ...s, ...updates };
				return updatedSession;
			}
			return s;
		}));

		if (updatedSession) 
			queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSession });
        

		if (id === currentSessionId && (updates.scramblerId || updates.customScramblerConfig)) {
			const sid = updates.scramblerId || currentSession.scramblerId;
			const cfg = updates.customScramblerConfig !== undefined ? updates.customScramblerConfig : currentSession.customScramblerConfig;
			const s = generateScramble(sid, cfg);
			setScrambleHistory([s]);
			setHistoryIndex(0);
		}
	};

	const deleteSession = (id: string): void => {
		if (sessions.length <= 1) return;
		const sessionToDelete = sessions.find(s => s.id === id);
		if (!sessionToDelete) return;

		const newSessions = sessions.filter(s => s.id !== id);
		setSessions(newSessions);
		if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);

		queueAction({ type: SyncActionType.DELETE_SESSION, payload: id });
	};

	const moveSolves = (targetSessionId: string, solveIds: string[]): void => {
		if (targetSessionId === currentSessionId) return;
		if (solveIds.length === 0) return;

		const source = sessions.find(s => s.id === currentSessionId);
		const target = sessions.find(s => s.id === targetSessionId);

		if (!source || !target) return;

		const idSet = new Set(solveIds);
		const newSourceIds = source.solveIds.filter(id => !idSet.has(id));

		// Combine and SORT by timestamp to maintain chronological order
		// The last item in the array is expected to be the newest solve
		const newTargetIds = [...target.solveIds, ...solveIds].sort((a, b) => {
			const timeA = solves[a]?.timestamp || 0;
			const timeB = solves[b]?.timestamp || 0;
			return timeA - timeB;
		});

		const newSource = { ...source, solveIds: newSourceIds };
		const newTarget = { ...target, solveIds: newTargetIds };

		setSessions(prev => prev.map(s => {
			if (s.id === source.id) return newSource;
			if (s.id === target.id) return newTarget;
			return s;
		}));

		queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSource });
		queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newTarget });
	};

	const duplicateSolves = (targetSessionId: string, solveIds: string[]): void => {
		if (solveIds.length === 0) return;

		const target = sessions.find(s => s.id === targetSessionId);
		if (!target) return;

		// Combine and SORT by timestamp
		const newTargetIds = [...target.solveIds, ...solveIds].sort((a, b) => {
			const timeA = solves[a]?.timestamp || 0;
			const timeB = solves[b]?.timestamp || 0;
			return timeA - timeB;
		});

		const newTarget = { ...target, solveIds: newTargetIds };

		setSessions(prev => prev.map(s => {
			if (s.id === target.id) return newTarget;
			return s;
		}));

		queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newTarget });
	};

	const nextScramble = (): void => {
		const next = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
		setScrambleHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
		setHistoryIndex(prev => prev + 1);
	};

	const prevScramble = (): void => {
		if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
	};

	// Goals Actions
	const addGoal = (goal: Goal): void => {
		setGoals(prev => [...prev, goal]);
	};

	const updateGoal = (id: string, updates: Partial<Goal>): void => {
		setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
	};

	const deleteGoal = (id: string): void => {
		setGoals(prev => prev.filter(g => g.id !== id));
	};

	// Plugin Actions
	const addPlugin = (script: PluginScript): void => {
		setPlugins(prev => [...prev, script]);
	};

	const updatePlugin = (id: string, updates: Partial<PluginScript>): void => {
		setPlugins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
	};

	const deletePlugin = (id: string): void => {
		setPlugins(prev => prev.filter(p => p.id !== id));
	};

	// --- Data Management & Auth ---

	const processImport = (data: ProcessImportData): void => {
		if (data.settings) {
			setSettings(data.settings);
			queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: data.settings });
		}
		if (data.statsConfig) setStatsConfig(data.statsConfig);

		// To batch efficient map updates
		const newSolvesMap = { ...solves };
		const newSessionsList = [...sessions];
		const shouldDeduplicate = data.deduplicate !== false; // Default true

		data.sessions.forEach(item => {
			const { session: importedSession, targetId } = item;
			// importedSession is likely hydrated (has `solves` array) from the parsing logic.
			// We need to normalize it.
			const hydratedSolves = (importedSession as LegacySession).solves || [];

			// Calculate stats for imported solves (removed in new logic, just use raw solves)
			// const solvesWithStats = recalculateSessionStats(hydratedSolves); 
			// We just need raw solves now

			// Map to ensure scramblerId is present and normalized
			const sessionScramblerIds = Array.isArray(importedSession.scramblerId) ? importedSession.scramblerId : [importedSession.scramblerId || '333'];

			const finalSolves = hydratedSolves.map(s => {
				const finalScramble = normalizeScramble(s.scramble);

				const finalScramblerId = normalizeScramblerId(s.scramblerId, sessionScramblerIds);

				// Clean stats if present
				const { stats: _stats, ...cleanSolve } = s;
				void _stats;

				return {
					...cleanSolve,
					scramble: finalScramble,
					scramblerId: finalScramblerId
				};
			});

			// Deduplication Logic
			let solvesToImport = finalSolves;

			if (targetId !== 'NEW' && shouldDeduplicate) {
				const targetSessionIndex = newSessionsList.findIndex(s => s.id === targetId);
				if (targetSessionIndex !== -1) {
					const targetSession = newSessionsList[targetSessionIndex];
					// Get all existing solves for this session (including ones potentially just added in previous iterations)
					const existingSolves = targetSession.solveIds.map(id => newSolvesMap[id]).filter(Boolean);

					solvesToImport = finalSolves.filter(incoming => {
						const isDuplicate = existingSolves.some(existing => {
							// 1. Time match
							if (existing.time !== incoming.time) return false;

							// 2. Date match (Precise)
							if (existing.timestamp !== incoming.timestamp) return false;

							// 3. Import Tag match
							const importTags = ['csTimer', 'Cubic Timer'];
							// Find the source tag this incoming solve is claiming to be from
							const sourceTag = incoming.tags?.find(t => importTags.includes(t));

							// If it's a branded import, ensure the existing solve has that specific brand tag
							if (sourceTag) 
								if (!existing.tags?.includes(sourceTag)) return false;
                            

							return true;
						});
						return !isDuplicate;
					});
				}
			}

			const importedIds: string[] = [];

			solvesToImport.forEach(s => {
				newSolvesMap[s.id] = s;
				importedIds.push(s.id);
			});

			// Queue solve upserts
			if (solvesToImport.length > 0) 
				queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: solvesToImport });
            

			if (targetId === 'NEW') {
				const newSess: Session = {
					...importedSession,
					scramblerId: sessionScramblerIds,
					solveIds: importedIds,
					sourceSessionIds: []
				};
				// Remove `solves` prop if it exists from cast
				delete (newSess as LegacySession).solves;
				newSessionsList.push(newSess);
				queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSess });
			} else {
				const idx = newSessionsList.findIndex(s => s.id === targetId);
				if (idx !== -1) {
					const updatedSess = {
						...newSessionsList[idx],
						solveIds: [...newSessionsList[idx].solveIds, ...importedIds]
					};
					newSessionsList[idx] = updatedSess;
					queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSess });
				}
			}
		});

		setSolves(newSolvesMap);
		setSessions(newSessionsList);
	};

	const hasSignificantLocalData = (): boolean => Object.keys(solves).length > 0;

	const login = async (u: string, p: string): Promise<void> => {
		const res = await api.login({ username: u, password: p });
		localStorage.setItem('cubetime_token', res.token);
		localStorage.setItem('cubetime_user', JSON.stringify(res.user));

		if (res.data) {
			setSessions(res.data.sessions);
			setSolves(res.data.solves);
			setSettings(res.data.settings);
			setStatsConfig(res.data.statsConfig);
			if (res.data.goals) setGoals(res.data.goals);
			if (res.data.plugins) setPlugins(res.data.plugins);
			setCurrentSessionId(res.data.currentSessionId);
		}
		setAuth({ token: res.token, user: res.user, isSynced: true, lastSyncTime: Date.now() });
		setActionQueue([]);
	};

	const register = async (u: string, p: string, e: string): Promise<void> => {
		const initialData: FullStateData = {
			sessions,
			solves,
			settings,
			statsConfig,
			goals,
			plugins,
			currentSessionId,
			updatedAt: Date.now()
		};
		const res = await api.register({ username: u, password: p, email: e, initialData });
		localStorage.setItem('cubetime_token', res.token);
		localStorage.setItem('cubetime_user', JSON.stringify(res.user));
		setAuth({ token: res.token, user: res.user, isSynced: true, lastSyncTime: Date.now() });
	};

	const logout = (): void => {
		localStorage.removeItem('cubetime_token');
		localStorage.removeItem('cubetime_user');
		setAuth({ token: null, user: null, isSynced: false });
	};

	return {
		sessions,
		solves,
		currentSession,
		currentSessionId,
		setCurrentSessionId,
		settings,
		setSettings,
		statsConfig,
		setStatsConfig,
		goals,
		plugins,
		effectiveSettings,
		currentScramble,
		computedSolves,
		auth,
		actions: {
			addSolve,
			deleteSolves,
			updatePenalty,
			updateSolve,
			createSession,
			updateSession,
			deleteSession,
			moveSolves,
			duplicateSolves,
			nextScramble,
			prevScramble,
			addGoal,
			updateGoal,
			deleteGoal,
			addPlugin,
			updatePlugin,
			deletePlugin,
			processImport,
			login,
			register,
			logout,
			hasSignificantLocalData
		}
	};
};

const AppStoreContext = createContext<AppStore | null>(null);

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const store = useProvideAppStore();
	return React.createElement(AppStoreContext.Provider, { value: store }, children);
};

export const useAppStore = (): AppStore => {
	const context = useContext(AppStoreContext);
	if (!context) 
		throw new Error("useAppStore must be used within an AppStoreProvider");
    
	return context;
};
