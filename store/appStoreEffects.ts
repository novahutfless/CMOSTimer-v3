import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { AuthState, FullStateData, Goal, PluginScript, Session, Settings, SolveMap, StatConfig, SyncAction } from '../types';
import { api, ApiError } from '../utils/api';
import { generateId } from '../utils/common';
import { storage } from '../utils/platformStorage';
import { writePersistedSolves } from '../utils/solvesPersistence';
import { DEFAULT_STATS_CONFIG } from './defaults';
import { normalizeSessionSolveOrder } from './solveOrder';
import { loadAndNormalizeData, mergeSettingsWithDefaults } from './storageState';
import { NewSyncAction, splitSyncAction, takeSyncBatch } from './syncUtils';

type SetAuth = Dispatch<SetStateAction<AuthState>>;
type QueueAction = (action: NewSyncAction) => void;

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
	const message = `CMOSTimer could not save ${key}. Keep this tab open and export a backup after freeing storage space.`;
	console.error(message, error);
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

const persistQueue = (queue: SyncAction[]): void => {
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

const mergeQueues = (...queues: SyncAction[][]): SyncAction[] => {
	const byId = new Map<string, SyncAction>();
	queues.flat().forEach((action) => {
		if (action?.opId) byId.set(action.opId, action);
	});
	return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
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
	useEffect(() => {
		if (!stateLoaded) return;
		safelyPersistItem('cmostimer_sessions', JSON.stringify(sessions));
		void writePersistedSolves(JSON.stringify(solves), true).catch((error: unknown) => {
			reportPersistenceFailure('cmostimer_solves', error);
		});
	}, [sessions, solves, stateLoaded]);

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
		safelyPersistItem('cmostimer_sync_queue', JSON.stringify(actionQueue));
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

	useEffect(() => {
		actionQueueRef.current = actionQueue;
	}, [actionQueue]);

	const queueAction = useCallback((action: NewSyncAction): void => {
		if (!auth.token) return;
		const queued = splitSyncAction({
			...action,
			opId: createOperationId(),
			timestamp: Date.now()
		});
		const nextQueue = mergeQueues(readQueue(), actionQueueRef.current, queued);
		actionQueueRef.current = nextQueue;
		persistQueue(nextQueue);
		if (auth.user?.id !== undefined) storage.setItem('cmostimer_sync_queue_user', String(auth.user.id));
		setAuth((prev) => ({ ...prev, isSynced: false }));
		setActionQueue(nextQueue);
		wakeSyncRef.current(500);
	}, [auth.token, auth.user?.id, setActionQueue, setAuth]);

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
		let retryDelay = 1000;

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
				const result = await api.sync(token, batch, 0);
				if (cancelled) return;

				const sentIds = new Set(batch.map((item) => item.opId));
				const latestQueue = mergeQueues(readQueue(), actionQueueRef.current);
				const remaining = latestQueue.filter((item) => !sentIds.has(item.opId));
				actionQueueRef.current = remaining;
				persistQueue(remaining);
				setActionQueue(remaining);
				if (remaining.length === 0) applyRemoteData(result.data);
				setAuth((prev) => ({ ...prev, isSynced: remaining.length === 0, lastSyncTime: result.syncedAt }));
				retryDelay = 1000;
				schedule(remaining.length > 0 ? 100 : 15000);
			} catch (error) {
				if (cancelled) return;
				console.error('Sync failed, retrying later', error);
				setAuth((prev) => ({ ...prev, isSynced: false }));
				if (error instanceof ApiError && error.status === 401) {
					storage.removeItem('cmostimer_token');
					setAuth((prev) => ({ ...prev, token: null, isSynced: false }));
					return;
				}
				schedule(retryDelay);
				retryDelay = Math.min(retryDelay * 2, 30000);
			} finally {
				inFlight = false;
			}
		};

		const handleOnline = (): void => schedule(0);
		const handleStorage = (event: StorageEvent): void => {
			if (event.key !== 'cmostimer_sync_queue') return;
			const merged = mergeQueues(actionQueueRef.current, readQueue());
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
	}, [applyRemoteData, auth.token, setActionQueue, setAuth, stateLoaded]);

	return queueAction;
};
