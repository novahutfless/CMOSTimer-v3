import React, { useState, useEffect, useMemo, createContext, useContext, useCallback, useRef } from 'react';
import { Session, Solve, Settings, StatConfig, StatType, Penalty, ComputedSolve, SolvePhase, AuthState, FullStateData, SolveMap, SyncAction, SyncActionType, Goal, PluginScript, PluginSessionBatchOptions, PluginSessionInput, CustomScramblerConfig } from '../types';
import { generateId, DNF_VALUE, getEffectiveSettings, getSolveTime, recalculateSessionStats } from '../utils';
import { generateScramble, shouldInitializeScramble } from '../utils/scramblerRegistry';
import { api } from '../utils/api';
import { storage } from '../utils/platformStorage';
import { buildSettingsPatch, insertSolveIdChronologically, sortSolveIdsChronologically } from '../store/solveOrder';
import { prepareImportData, ProcessImportData } from '../store/importProcessing';
import { useAppStoreInitialization, useAppStorePersistence, useAppStoreSync } from '../store/appStoreEffects';
import {
	loadPersistedActionQueue,
	loadPersistedAuth,
	loadPersistedCurrentSessionId,
	loadPersistedGoals,
	loadPersistedPlugins,
	loadPersistedSettings,
	loadPersistedStatsConfig,
	mergeSettingsWithDefaults,
	persistImportedSnapshotOrThrow
} from '../store/storageState';
type AddSolveResult = { id: string; isPB: boolean };
type AddSolveOptions = { tags?: string[]; solution?: string[] };

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
	hasPendingSyncActions: boolean;
	actions: {
		addSolve: (time: number, inspectionTime: number, phases?: SolvePhase[], penaltyOverride?: Penalty, options?: AddSolveOptions) => AddSolveResult;
		deleteSolves: (ids: string[], sessionId?: string) => void;
		updatePenalty: (id: string, penalty: Penalty) => void;
		updateSolve: (id: string, updates: Partial<Solve>) => void;
		createSession: (name: string, scramblerId: string | string[], tags?: string[], customScramblerConfig?: CustomScramblerConfig) => string;
		createSessions: (inputs: PluginSessionInput[], options?: PluginSessionBatchOptions) => string[];
		updateSession: (id: string, updates: Partial<Session>) => void;
		deleteSession: (id: string) => void;
		deleteSessions: (ids: string[]) => void;
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
		processImport: (data: ProcessImportData) => Promise<void>;
		login: (u: string, p: string) => Promise<void>;
		register: (u: string, p: string, e: string) => Promise<void>;
		logout: () => void;
		hasSignificantLocalData: () => boolean;
	};
};
export type AppStoreActions = AppStore['actions'];

const useProvideAppStore = (): AppStore => {
	// State
	const [stateLoaded, setStateLoaded] = useState(false);
	const [solves, setSolves] = useState<SolveMap>({});
	const [sessions, setSessions] = useState<Session[]>([]);

	const [currentSessionId, setCurrentSessionId] = useState<string>(loadPersistedCurrentSessionId);
	const [goals, setGoals] = useState<Goal[]>(loadPersistedGoals);
	const [plugins, setPlugins] = useState<PluginScript[]>(loadPersistedPlugins);
	const [statsConfig, setStatsConfigState] = useState<StatConfig[]>(loadPersistedStatsConfig);
	const [settings, setSettingsState] = useState<Settings>(loadPersistedSettings);
	const [actionQueue, setActionQueue] = useState<SyncAction[]>(loadPersistedActionQueue);
	const [auth, setAuth] = useState<AuthState>(loadPersistedAuth);

	// Scrambles
	const [scrambleHistory, setScrambleHistory] = useState<string[][][]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	useAppStoreInitialization({
		stateLoaded,
		setStateLoaded,
		currentSessionId,
		setCurrentSessionId,
		setSessions,
		setSolves
	});

	useAppStorePersistence({
		stateLoaded,
		sessions,
		solves,
		currentSessionId,
		statsConfig,
		settings,
		goals,
		plugins,
		actionQueue
	});

	const queueAction = useAppStoreSync({
		stateLoaded,
		auth,
		setAuth,
		actionQueue,
		setActionQueue,
		setSessions,
		setSolves,
		setSettings: setSettingsState,
		setStatsConfig: setStatsConfigState,
		setGoals,
		setPlugins,
		setCurrentSessionId
	});

	const settingsRef = useRef(settings);
	const statsConfigRef = useRef(statsConfig);
	settingsRef.current = settings;
	statsConfigRef.current = statsConfig;

	const setSettings = useCallback<React.Dispatch<React.SetStateAction<Settings>>>((update) => {
		const previous = settingsRef.current;
		const next = typeof update === 'function' ? update(previous) : update;
		settingsRef.current = next;
		setSettingsState(next);
		const patch = buildSettingsPatch(previous, next);
		if (Object.keys(patch).length > 0) queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: patch });
	}, [queueAction]);

	const setStatsConfig = useCallback<React.Dispatch<React.SetStateAction<StatConfig[]>>>((update) => {
		const previous = statsConfigRef.current;
		const next = typeof update === 'function' ? update(previous) : update;
		statsConfigRef.current = next;
		setStatsConfigState(next);
		if (JSON.stringify(previous) !== JSON.stringify(next)) {
			queueAction({ type: SyncActionType.UPDATE_STATS_CONFIG, payload: next });
		}
	}, [queueAction]);


	// --- Derived ---
	const currentSession = useMemo(() => {
		const s = sessions.find(s => s.id === currentSessionId) || sessions[0];
		// Hydrate helper for components that expect embedded solves (like SessionManager)

		if (!s) return { id: 'temp', name: 'Loading', solveIds: [], solves: [], scramblerId: ['333'] } as unknown as Session & { solves: Solve[] };

		const hydratedSolves = s.solveIds
			.map(id => solves[id])
			.filter(Boolean);

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
		if (shouldInitializeScramble(stateLoaded, scrambleHistory.length, currentSession.scramblerId)) {
			const s = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
			setScrambleHistory([s]);
			setHistoryIndex(0);
		}
	}, [stateLoaded, currentSession.id, currentSession.scramblerId, currentSession.customScramblerConfig, scrambleHistory.length]);

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

	const addSolve = (time: number, inspectionTime: number, phases?: SolvePhase[], penaltyOverride?: Penalty, options?: AddSolveOptions): AddSolveResult => {
		const normalizedTime = Math.max(0, Math.round(time));
		const normalizedInspectionTime = inspectionTime === -1 ? -1 : Math.max(0, Math.round(inspectionTime));
		const normalizedPhases = phases?.map((phase) => ({
			duration: Math.max(0, Math.round(phase.duration)),
			cumulative: Math.max(0, Math.round(phase.cumulative))
		}));

		let penalty = Penalty.NONE;

		if (penaltyOverride) {
			penalty = penaltyOverride;
		} else if (effectiveSettings.autoPenalty && normalizedInspectionTime !== -1) {
			if (normalizedInspectionTime >= 17000) penalty = Penalty.DNF;
			else if (normalizedInspectionTime >= 15000) penalty = Penalty.PLUS_TWO;
		}

		const newSolve: Solve = {
			id: generateId(),
			timestamp: Date.now(),
			time: normalizedTime,
			inspectionTime: normalizedInspectionTime,
			scramble: currentScramble,
			scramblerId: currentSession.scramblerId,
			penalty,
			tags: [...(options?.tags || [])],
			...(options?.solution && options.solution.length > 0 ? { solution: [...options.solution] } : {}),
			...(normalizedPhases === undefined ? {} : { phases: normalizedPhases })
		};

		// Optimistic Update
		setSolves(prev => ({ ...prev, [newSolve.id]: newSolve }));
		const nextSolveMapForInsert = { ...solves, [newSolve.id]: newSolve };

		const targetSessionIds = sessions
			.filter((session) => session.id === currentSessionId || session.sourceSessionIds?.includes(currentSessionId))
			.map((session) => session.id);

		setSessions(prev => prev.map(s => {
			const isCurrent = s.id === currentSessionId;
			// Check if this session subscribes to current session
			const isSubscriber = s.sourceSessionIds?.includes(currentSessionId);

			if (isCurrent || isSubscriber) {
				const updated = { ...s, solveIds: insertSolveIdChronologically(s.solveIds, newSolve.id, nextSolveMapForInsert) };
				return updated;
			}
			return s;
		}));

		const newSolveTime = getSolveTime(newSolve);
		const previousSolveTimes = computedSolves
			.map(getSolveTime)
			.filter((time): time is number => time !== null && Number.isFinite(time));
		const bestPreviousSolveTime = previousSolveTimes.reduce((best, time) => Math.min(best, time), Infinity);
		const isNewPB = newSolveTime !== null
			&& Number.isFinite(newSolveTime)
			&& newSolveTime < bestPreviousSolveTime;

		// Queue
		queueAction({
			type: SyncActionType.ADD_SOLVE_ATOMIC,
			payload: { solve: newSolve, sessionIds: targetSessionIds }
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

		// Queue Actions
		sessionsToUpdate.forEach(s => {
			queueAction({
				type: SyncActionType.PATCH_SESSION_SOLVES,
				payload: { id: s.id, addSolveIds: [], removeSolveIds: ids }
			});
		});
		if (!sessionId) {
			setSolves((previous) => {
				const next = { ...previous };
				ids.forEach((id) => delete next[id]);
				return next;
			});
			queueAction({ type: SyncActionType.DELETE_SOLVES, payload: ids });
		}
	};

	const updatePenalty = (id: string, penalty: Penalty): void => updateSolve(id, { penalty });

	const updateSolve = (id: string, updates: Partial<Solve>): void => {
		const oldSolve = solves[id];
		if (!oldSolve) return;
		const newSolve = { ...oldSolve, ...updates };

		setSolves(prev => ({ ...prev, [id]: newSolve }));
		const patch = Object.fromEntries(
			Object.entries(updates).map(([key, value]) => [key, value === undefined ? { __cmosDelete: true } : value])
		);
		queueAction({ type: SyncActionType.PATCH_SOLVE, payload: { id, patch } });
	};

	const createSessions = (inputs: PluginSessionInput[], options?: PluginSessionBatchOptions): string[] => {
		const newSessions: Session[] = inputs.map(input => {
			const scramblerIdArray = Array.isArray(input.scramblerId) ? input.scramblerId : [input.scramblerId];
			return {
				id: generateId(),
				name: input.name,
				scramblerId: scramblerIdArray,
				solveIds: [],
				sourceSessionIds: [],
				tags: input.tags || [],
				...(input.customScramblerConfig === undefined ? {} : { customScramblerConfig: input.customScramblerConfig })
			};
		});
		if (newSessions.length === 0) return [];

		setSessions(prev => [...prev, ...newSessions]);
		newSessions.forEach(newSession => queueAction({ type: SyncActionType.CREATE_SESSION, payload: newSession }));

		const selection = options?.selection ?? 'last';
		if (selection !== 'none') {
			const selected = selection === 'first' ? newSessions[0] : newSessions[newSessions.length - 1];
			setCurrentSessionId(selected.id);
			setScrambleHistory([generateScramble(selected.scramblerId, selected.customScramblerConfig)]);
			setHistoryIndex(0);
		}
		return newSessions.map(session => session.id);
	};

	const createSession = (name: string, scramblerId: string | string[], tags: string[] = [], customScramblerConfig?: CustomScramblerConfig): string => {
		return createSessions([{ name, scramblerId, tags, ...(customScramblerConfig === undefined ? {} : { customScramblerConfig }) }], { selection: 'last' })[0];
	};

	const updateSession = (id: string, updates: Partial<Session>): void => {
		const existing = sessions.find((session) => session.id === id);
		if (!existing) return;
		const { id: _ignoredId, solveIds, ...metadataPatch } = updates;
		void _ignoredId;
		const changedMetadataPatch = Object.fromEntries(
			Object.entries(metadataPatch).filter(([key, value]) =>
				JSON.stringify(existing[key as keyof Session]) !== JSON.stringify(value))
				.map(([key, value]) => [key, value === undefined ? { __cmosDelete: true } : value])
		);
		setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

		if (Object.keys(changedMetadataPatch).length > 0) {
			queueAction({ type: SyncActionType.UPDATE_SESSION, payload: { id, patch: changedMetadataPatch } });
		}
		if (solveIds) {
			const currentIds = new Set(existing.solveIds);
			const nextIds = new Set(solveIds);
			queueAction({
				type: SyncActionType.PATCH_SESSION_SOLVES,
				payload: {
					id,
					addSolveIds: solveIds.filter((solveId) => !currentIds.has(solveId)),
					removeSolveIds: existing.solveIds.filter((solveId) => !nextIds.has(solveId))
				}
			});
		}
        

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

	const deleteSessions = (ids: string[]): void => {
		if (sessions.length <= 1) return;
		const idSet = new Set(ids);
		const matching = sessions.filter(session => idSet.has(session.id));
		const toDelete = matching.slice(0, Math.max(0, sessions.length - 1));
		if (toDelete.length === 0) return;
		const deletedIds = new Set(toDelete.map(session => session.id));
		const newSessions = sessions.filter(session => !deletedIds.has(session.id));
		setSessions(newSessions);
		if (deletedIds.has(currentSessionId)) setCurrentSessionId(newSessions[0].id);
		toDelete.forEach(session => queueAction({ type: SyncActionType.DELETE_SESSION, payload: session.id }));
	};

	const moveSolves = (targetSessionId: string, solveIds: string[]): void => {
		if (targetSessionId === currentSessionId) return;
		if (solveIds.length === 0) return;

		const source = sessions.find(s => s.id === currentSessionId);
		const target = sessions.find(s => s.id === targetSessionId);

		if (!source || !target) return;

		const idSet = new Set(solveIds);
		const newSourceIds = source.solveIds.filter(id => !idSet.has(id));

		const newTargetIds = sortSolveIdsChronologically([...target.solveIds, ...solveIds], solves);

		const newSource = { ...source, solveIds: newSourceIds };
		const newTarget = { ...target, solveIds: newTargetIds };

		setSessions(prev => prev.map(s => {
			if (s.id === source.id) return newSource;
			if (s.id === target.id) return newTarget;
			return s;
		}));

		queueAction({
			type: SyncActionType.PATCH_SESSION_SOLVES,
			payload: { id: newSource.id, addSolveIds: [], removeSolveIds: solveIds }
		});
		queueAction({
			type: SyncActionType.PATCH_SESSION_SOLVES,
			payload: { id: newTarget.id, addSolveIds: solveIds, removeSolveIds: [] }
		});
	};

	const duplicateSolves = (targetSessionId: string, solveIds: string[]): void => {
		if (solveIds.length === 0) return;

		const target = sessions.find(s => s.id === targetSessionId);
		if (!target) return;

		const newTargetIds = sortSolveIdsChronologically([...target.solveIds, ...solveIds], solves);

		const newTarget = { ...target, solveIds: newTargetIds };

		setSessions(prev => prev.map(s => {
			if (s.id === target.id) return newTarget;
			return s;
		}));

		queueAction({
			type: SyncActionType.PATCH_SESSION_SOLVES,
			payload: { id: newTarget.id, addSolveIds: solveIds, removeSolveIds: [] }
		});
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
		queueAction({ type: SyncActionType.UPSERT_GOAL, payload: goal });
	};

	const updateGoal = (id: string, updates: Partial<Goal>): void => {
		const existing = goals.find((goal) => goal.id === id);
		if (!existing) return;
		const patch = Object.fromEntries(
			Object.entries(updates).filter(([key, value]) =>
				key !== 'id' && JSON.stringify(existing[key as keyof Goal]) !== JSON.stringify(value))
				.map(([key, value]) => [key, value === undefined ? { __cmosDelete: true } : value])
		);
		setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
		if (Object.keys(patch).length > 0) queueAction({ type: SyncActionType.PATCH_GOAL, payload: { id, patch } });
	};

	const deleteGoal = (id: string): void => {
		setGoals(prev => prev.filter(g => g.id !== id));
		queueAction({ type: SyncActionType.DELETE_GOAL, payload: id });
	};

	// Plugin Actions
	const addPlugin = (script: PluginScript): void => {
		setPlugins(prev => [...prev, script]);
		queueAction({ type: SyncActionType.UPSERT_PLUGIN, payload: script });
	};

	const updatePlugin = (id: string, updates: Partial<PluginScript>): void => {
		const existing = plugins.find((plugin) => plugin.id === id);
		if (!existing) return;
		const patch = Object.fromEntries(
			Object.entries(updates).filter(([key, value]) =>
				key !== 'id' && JSON.stringify(existing[key as keyof PluginScript]) !== JSON.stringify(value))
		);
		setPlugins(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
		if (Object.keys(patch).length > 0) queueAction({ type: SyncActionType.PATCH_PLUGIN, payload: { id, patch } });
	};

	const deletePlugin = (id: string): void => {
		setPlugins(prev => prev.filter(p => p.id !== id));
		queueAction({ type: SyncActionType.DELETE_PLUGIN, payload: id });
	};

	// --- Data Management & Auth ---

	const processImport = async (data: ProcessImportData): Promise<void> => {
		const {
			solves: newSolvesMap,
			sessions: newSessionsList,
			pendingSyncActions
		} = prepareImportData(data, sessions, solves);

		// Persist first; abort import entirely if local persistence cannot hold it.
		await persistImportedSnapshotOrThrow(newSessionsList, newSolvesMap);

		if (data.settings) {
			const mergedSettings = mergeSettingsWithDefaults(data.settings);
			setSettings(mergedSettings);
		}
		if (data.statsConfig) {
			setStatsConfig(data.statsConfig);
		}
		setSolves(newSolvesMap);
		setSessions(newSessionsList);
		pendingSyncActions.forEach(action => queueAction(action));
	};

	const hasSignificantLocalData = (): boolean => Object.keys(solves).length > 0;

	const login = async (u: string, p: string): Promise<void> => {
		const res = await api.login({ username: u, password: p });
		const queueOwner = storage.getItem('cmostimer_sync_queue_user');
		const nextUserId = String(res.user.id);
		const preserveQueue = queueOwner === null || queueOwner === nextUserId;
		if (!preserveQueue) {
			storage.setItem('cmostimer_sync_queue', '[]');
			setActionQueue([]);
		}
		storage.setItem('cmostimer_sync_queue_user', nextUserId);
		storage.setItem('cmostimer_token', res.token);
		storage.setItem('cmostimer_user', JSON.stringify(res.user));
		// The sync loop uploads any durable offline outbox before applying the
		// canonical server snapshot, so re-authentication cannot discard work.
		setAuth({ token: res.token, user: res.user, isSynced: preserveQueue ? actionQueue.length === 0 : true, lastSyncTime: 0 });
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
		storage.setItem('cmostimer_token', res.token);
		storage.setItem('cmostimer_user', JSON.stringify(res.user));
		storage.setItem('cmostimer_sync_queue_user', String(res.user.id));
		setAuth({ token: res.token, user: res.user, isSynced: true, lastSyncTime: Date.now() });
	};

	const logout = (): void => {
		storage.removeItem('cmostimer_token');
		storage.removeItem('cmostimer_user');
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
		hasPendingSyncActions: actionQueue.length > 0,
		actions: {
			addSolve,
			deleteSolves,
			updatePenalty,
			updateSolve,
			createSession,
			createSessions,
			updateSession,
			deleteSession,
			deleteSessions,
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
