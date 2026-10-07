import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { AuthState, FullStateData, Goal, PluginScript, Session, Settings, SolveMap, StatConfig, SyncAction } from '../types';
import { api } from '../utils/api';
import { generateId } from '../utils/common';
import { storage } from '../utils/platformStorage';
import { getSolveAppends } from './solveAppends';
import { appendPersistedSolves, writePersistedSolves } from '../utils/solvesPersistence';
import { DEFAULT_STATS_CONFIG } from './defaults';
import { normalizeSessionSolveOrder } from './solveOrder';
import { loadAndNormalizeData, mergeSettingsWithDefaults } from './storageState';
import { NewSyncAction, splitSyncAction, takeSyncBatch } from './syncUtils';
import { acknowledgeSyncBatch, INITIAL_RETRY_DELAY_MS, isUnauthorizedSyncError, mergeSyncQueues, nextRetryDelay, shouldApplyRemoteState } from './syncEngine';

type SetAuth = Dispatch<SetStateAction<AuthState>>;
type QueueAction = (action: NewSyncAction | NewSyncAction[]) => void;

type InitializationParams = {
	stateLoaded: boolean;
	setStateLoaded: Dispatch<SetStateAction<boolean>>;
	currentSessionId: string;
	setCurrentSessionId: Dispatch<SetStateAction<string>>;
	setSessions: Dispatch<SetStateAction<Session[]>>;
	setSolves: Dispatch<SetStateAction<SolveMap>>;
};

type PersistenceParams = {
	stateLoaded: boolean;
	sessions: Session[];
	solves: SolveMap;
	currentSessionId: string;
	statsConfig: StatConfig[];
	settings: Settings;
	goals: Goal[];
	plugins: PluginScript[];
	actionQueue: SyncAction[];
};

type SyncParams = {
	stateLoaded: boolean;
	auth: AuthState;
	setAuth: SetAuth;
	actionQueue: SyncAction[];
	setActionQueue: Dispatch<SetStateAction<SyncAction[]>>;
	setSessions: Dispatch<SetStateAction<Session[]>>;
	setSolves: Dispatch<SetStateAction<SolveMap>>;
	setSettings: Dispatch<SetStateAction<Settings>>;
	setStatsConfig: Dispatch<SetStateAction<StatConfig[]>>;
	setGoals: Dispatch<SetStateAction<Goal[]>>;
	setPlugins: Dispatch<SetStateAction<PluginScript[]>>;
	setCurrentSessionId: Dispatch<SetStateAction<string>>;
};

const reportPersistenceFailure = (key: string, error?: unknown): void => {
	const message = key === 'cmostimer_sync_queue'
		? 'CMOSTimer could not save the pending sync queue for reopening this tab. Changes remain in memory and sync will keep retrying while signed in. Keep this tab open until sync finishes; closing or reloading it can lose pending uploads.'
		: `CMOSTimer could not save ${key}. Keep this tab open and export a backup after freeing storage space.`;
	if (error === undefined) console.error(message);
	else console.error(message, error);
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('cmostimer-persistence-error', { detail: { key, message } }));
	}
};

const safelyPersistItem = (key: string, value: string): void => {
	if (!storage.setItem(key, value)) reportPersistenceFailure(key);
};

const createOperationId = (): string => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	} catch {
		// Restricted WebViews may not expose Web Crypto.
	}
	return generateId();
};

let lastQueuePersistenceAttempt: SyncAction[] | null = null;
const persistQueue = (queue: SyncAction[]): void => {
	// Enqueue/acknowledgement already attempts to save this exact state.
	// Avoid serializing a large outbox again in the React persistence effect.
	if (lastQueuePersistenceAttempt === queue) return;
	lastQueuePersistenceAttempt = queue;
	safelyPersistItem('cmostimer_sync_queue', JSON.stringify(queue));
};

const readQueue = (): SyncAction[] => {
	try {
		const parsed = JSON.parse(storage.getItem('cmostimer_sync_queue') || '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const useAppStoreInitialization = ({
	stateLoaded,
	setStateLoaded,
	currentSessionId,
	setCurrentSessionId,
	setSessions,
	setSolves
}: InitializationParams): void => {
	useEffect(() => {
		if (stateLoaded) return;
		let cancelled = false;
		const initializeStore = async (): Promise<void> => {
			const { sessions, solves } = await loadAndNormalizeData();
			if (cancelled) return;
			setSessions(sessions);
			setSolves(solves);
			setStateLoaded(true);

			if (sessions.length > 0 && !sessions.some((session) => session.id === currentSessionId)) {
				setCurrentSessionId(sessions[0].id);
			}
		};
		void initializeStore();
		return (): void => {
			cancelled = true;
		};
	}, [stateLoaded, setStateLoaded, currentSessionId, setCurrentSessionId, setSessions, setSolves]);
};

export const useAppStorePersistence = ({
	stateLoaded,
	sessions,
	solves,
	currentSessionId,
	statsConfig,
	settings,
	goals,
	plugins,
	actionQueue
}: PersistenceParams): void => {
	const previousSolvesRef = useRef<SolveMap | null>(null);
	useEffect(() => {
		if (!stateLoaded) return;
		safelyPersistItem('cmostimer_sessions', JSON.stringify(sessions));
	}, [sessions, stateLoaded]);

	useEffect(() => {
		if (!stateLoaded) return;
		const previous = previousSolvesRef.current;
		const appends = previous ? getSolveAppends(previous, solves) : null;
		previousSolvesRef.current = solves;
		const saved = appends
			? appendPersistedSolves(appends.map(append => append.solve))
			: writePersistedSolves(JSON.stringify(solves), true);
		void saved.catch((error: unknown) => {
			reportPersistenceFailure('cmostimer_solves', error);
		});
	}, [solves, stateLoaded]);

	useEffect(() => {
		safelyPersistItem('cmostimer_current_session', currentSessionId);
	}, [currentSessionId]);

	useEffect(() => {
		safelyPersistItem('cmostimer_stats_config', JSON.stringify(statsConfig));
	}, [statsConfig]);

	useEffect(() => {
		safelyPersistItem('cmostimer_settings', JSON.stringify(settings));
	}, [settings]);

	useEffect(() => {
		safelyPersistItem('cmostimer_goals', JSON.stringify(goals));
	}, [goals]);

	useEffect(() => {
		safelyPersistItem('cmostimer_plugins_state', JSON.stringify(plugins));
	}, [plugins]);

	useEffect(() => {
		persistQueue(actionQueue);
	}, [actionQueue]);
};

export const useAppStoreSync = ({
	stateLoaded,
	auth,
	setAuth,
	actionQueue,
	setActionQueue,
	setSessions,
	setSolves,
	setSettings,
	setStatsConfig,
	setGoals,
	setPlugins,
	setCurrentSessionId
}: SyncParams): QueueAction => {
	const actionQueueRef = useRef(actionQueue);
	const wakeSyncRef = useRef<(delayMs?: number) => void>(() => undefined);
	// A failed save leaves an older outbox on disk. Do not resurrect operations
	// already acknowledged by the server when merging that stale outbox.
	const acknowledgedOperationsRef = useRef(new Set<string>());
	const readPendingQueue = useCallback((): SyncAction[] => readQueue().filter(
		(action) => !acknowledgedOperationsRef.current.has(action.opId)
	), []);

	useEffect(() => {
		actionQueueRef.current = actionQueue;
	}, [actionQueue]);

	const queueAction = useCallback((action: NewSyncAction | NewSyncAction[]): void => {
		if (!auth.token) return;
		const actions = Array.isArray(action) ? action : [action];
		if (actions.length === 0) return;
		const queued = actions.flatMap(item => splitSyncAction({
			...item,
			opId: createOperationId(),
			timestamp: Date.now()
		}));
		const nextQueue = mergeSyncQueues(readPendingQueue(), actionQueueRef.current, queued);
		actionQueueRef.current = nextQueue;
		persistQueue(nextQueue);
		if (auth.user?.id !== undefined) storage.setItem('cmostimer_sync_queue_user', String(auth.user.id));
		setAuth((prev) => ({ ...prev, isSynced: false }));
		setActionQueue(nextQueue);
		wakeSyncRef.current(500);
	}, [auth.token, auth.user?.id, readPendingQueue, setActionQueue, setAuth]);

	const applyRemoteData = useCallback((data: FullStateData): void => {
		const remoteSolves = data.solves || {};
		const remoteSessions = normalizeSessionSolveOrder(Array.isArray(data.sessions) ? data.sessions : [], remoteSolves);
		const remoteSettings = mergeSettingsWithDefaults(data.settings || {});
		const remoteStatsConfig = Array.isArray(data.statsConfig) && data.statsConfig.length > 0
			? data.statsConfig
			: DEFAULT_STATS_CONFIG;

		setSessions(remoteSessions);
		setSolves(remoteSolves);
		setSettings(remoteSettings);
		setStatsConfig(remoteStatsConfig);
		setGoals(Array.isArray(data.goals) ? data.goals : []);
		setPlugins(Array.isArray(data.plugins) ? data.plugins : []);
		setCurrentSessionId((previous) => {
			if (remoteSessions.some((session) => session.id === previous)) return previous;
			if (remoteSessions.some((session) => session.id === data.currentSessionId)) return data.currentSessionId;
			return remoteSessions[0]?.id || previous;
		});
	}, [setCurrentSessionId, setGoals, setPlugins, setSessions, setSettings, setSolves, setStatsConfig]);

	useEffect(() => {
		if (!auth.token || !stateLoaded) return;
		const token = auth.token;
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;
		let inFlight = false;
		let retryDelay = INITIAL_RETRY_DELAY_MS;

		const schedule = (delayMs = 0): void => {
			if (cancelled) return;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => void synchronize(), delayMs);
		};

		const synchronize = async (): Promise<void> => {
			if (cancelled || inFlight) return;
			inFlight = true;
			const batch = takeSyncBatch(actionQueueRef.current);
			try {
				setAuth((prev) => ({ ...prev, isSynced: false }));
				// Only the final batch (or an idle poll) needs an account snapshot.
				const includeData = batch.length === actionQueueRef.current.length;
				const result = await api.sync(token, batch, 0, includeData);
				if (cancelled) return;

				for (const action of batch) acknowledgedOperationsRef.current.add(action.opId);
				const latestQueue = mergeSyncQueues(readPendingQueue(), actionQueueRef.current);
				const remaining = acknowledgeSyncBatch(latestQueue, batch);
				actionQueueRef.current = remaining;
				persistQueue(remaining);
				setActionQueue(remaining);
				const hasFinalSnapshot = shouldApplyRemoteState(remaining) && result.data !== undefined;
				if (hasFinalSnapshot) applyRemoteData(result.data!);
				setAuth((prev) => ({ ...prev, isSynced: hasFinalSnapshot, lastSyncTime: result.syncedAt }));
				retryDelay = INITIAL_RETRY_DELAY_MS;
				// If a snapshot was omitted, poll again before declaring sync complete.
				schedule(hasFinalSnapshot ? 15000 : 100);
			} catch (error) {
				if (cancelled) return;
				console.error('Sync failed, retrying later', error);
				setAuth((prev) => ({ ...prev, isSynced: false }));
				if (isUnauthorizedSyncError(error)) {
					storage.removeItem('cmostimer_token');
					setAuth((prev) => ({ ...prev, token: null, isSynced: false }));
					return;
				}
				schedule(retryDelay);
				retryDelay = nextRetryDelay(retryDelay);
			} finally {
				inFlight = false;
			}
		};

		const handleOnline = (): void => schedule(0);
		const handleStorage = (event: StorageEvent): void => {
			if (event.key !== 'cmostimer_sync_queue') return;
			const merged = mergeSyncQueues(actionQueueRef.current, readPendingQueue());
			actionQueueRef.current = merged;
			setActionQueue(merged);
			schedule(0);
		};
		const handleVisibility = (): void => {
			if (typeof document === 'undefined' || document.visibilityState === 'visible') schedule(0);
		};

		wakeSyncRef.current = schedule;
		if (typeof window !== 'undefined') {
			window.addEventListener('online', handleOnline);
			window.addEventListener('storage', handleStorage);
		}
		if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibility);
		schedule(0);

		return (): void => {
			cancelled = true;
			wakeSyncRef.current = (): void => undefined;
			if (timer !== null) clearTimeout(timer);
			if (typeof window !== 'undefined') {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('storage', handleStorage);
			}
			if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [applyRemoteData, auth.token, readPendingQueue, setActionQueue, setAuth, stateLoaded]);

	return queueAction;
};
