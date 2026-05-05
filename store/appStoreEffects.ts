import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { AuthState, Goal, PluginScript, Session, Settings, SolveMap, StatConfig, SyncAction, SyncActionType } from '../types';
import { api } from '../utils/api';
import { storage } from '../utils/platformStorage';
import { writePersistedSolves } from '../utils/solvesPersistence';
import { buildSettingsPatch } from './solveOrder';
import { loadAndNormalizeData } from './storageState';
import { splitSyncAction, takeSyncBatch } from './syncUtils';

type SetAuth = Dispatch<SetStateAction<AuthState>>;
type QueueAction = (action: Omit<SyncAction, 'timestamp'>) => void;

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
	auth: AuthState;
	setAuth: SetAuth;
	actionQueue: SyncAction[];
	setActionQueue: Dispatch<SetStateAction<SyncAction[]>>;
	settings: Settings;
	statsConfig: StatConfig[];
	goals: Goal[];
	plugins: PluginScript[];
	currentSessionId: string;
};

const safelyPersistItem = (key: string, value: string): void => {
	try {
		storage.setItem(key, value);
	} catch {
		// Ignore persistence failures; the in-memory state remains authoritative.
	}
};

const useQueueStateChange = <T>(
	value: T,
	authToken: string | null,
	queueAction: QueueAction,
	actionFactory: (value: T) => Omit<SyncAction, 'timestamp'>
): void => {
	const previousValueRef = useRef(value);

	useEffect(() => {
		if (!authToken) {
			previousValueRef.current = value;
			return;
		}
		if (JSON.stringify(previousValueRef.current) !== JSON.stringify(value)) {
			queueAction(actionFactory(value));
			previousValueRef.current = value;
		}
	}, [value, authToken, queueAction, actionFactory]);
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
		void writePersistedSolves(JSON.stringify(solves), false).catch(() => undefined);
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
	auth,
	setAuth,
	actionQueue,
	setActionQueue,
	settings,
	statsConfig,
	goals,
	plugins,
	currentSessionId
}: SyncParams): QueueAction => {
	const queueAction = useCallback((action: Omit<SyncAction, 'timestamp'>): void => {
		if (!auth.token) return;
		setAuth((prev) => ({ ...prev, isSynced: false }));
		setActionQueue((prev) => [...prev, ...splitSyncAction({ ...action, timestamp: Date.now() })]);
	}, [auth.token, setActionQueue, setAuth]);

	const previousSettingsRef = useRef(settings);
	useEffect(() => {
		if (!auth.token) return;
		if (JSON.stringify(previousSettingsRef.current) !== JSON.stringify(settings)) {
			const patch = buildSettingsPatch(previousSettingsRef.current, settings);
			if (Object.keys(patch).length > 0) {
				queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: patch });
			}
			previousSettingsRef.current = settings;
		}
	}, [settings, auth.token, queueAction]);

	useQueueStateChange(statsConfig, auth.token, queueAction, (value) => ({
		type: SyncActionType.UPDATE_STATS_CONFIG,
		payload: value
	}));

	useQueueStateChange(goals, auth.token, queueAction, (value) => ({
		type: SyncActionType.UPDATE_GOALS,
		payload: value
	}));

	useQueueStateChange(plugins, auth.token, queueAction, (value) => ({
		type: SyncActionType.UPDATE_PLUGINS,
		payload: value
	}));

	const previousCurrentSessionIdRef = useRef(currentSessionId);
	useEffect(() => {
		if (!auth.token) {
			previousCurrentSessionIdRef.current = currentSessionId;
			return;
		}
		if (previousCurrentSessionIdRef.current !== currentSessionId) {
			queueAction({ type: SyncActionType.UPDATE_CURRENT_SESSION, payload: currentSessionId });
		}
		previousCurrentSessionIdRef.current = currentSessionId;
	}, [currentSessionId, auth.token, queueAction]);

	useEffect(() => {
		if (!auth.token || actionQueue.length === 0) return;
		const token = auth.token;

		const timer = setTimeout(async () => {
			const batch = takeSyncBatch(actionQueue);
			if (batch.length === 0) return;
			try {
				setAuth((prev) => ({ ...prev, isSynced: false }));
				await api.sync(token, batch, auth.lastSyncTime || 0);
				setActionQueue((prev) => prev.filter((item) => !batch.includes(item)));
				setAuth((prev) => ({ ...prev, isSynced: true, lastSyncTime: Date.now() }));
			} catch (error) {
				console.error('Sync failed, retrying later', error);
			}
		}, 5000);

		return (): void => clearTimeout(timer);
	}, [actionQueue, auth.token, auth.lastSyncTime, setActionQueue, setAuth]);

	return queueAction;
};
