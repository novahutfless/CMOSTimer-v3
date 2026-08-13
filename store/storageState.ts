import { AuthState, Goal, PluginScript, PuzzleType, Session, Settings, Solve, SolveMap, StatConfig, SyncAction } from '../types';
import { generateId } from '../utils/common';
import { normalizeLayoutConfig } from '../utils/layouts';
import { storage } from '../utils/platformStorage';
import { clearPersistedSolves, readPersistedSolves, writePersistedSolves } from '../utils/solvesPersistence';
import { DEFAULT_SETTINGS, DEFAULT_STATS_CONFIG, buildDefaultNormalizedData, normalizeScramble, normalizeScramblerId } from './defaults';
import { normalizeSessionSolveOrder } from './solveOrder';
import { splitSyncAction } from './syncUtils';

const createOperationId = (): string => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	} catch {
		// Fall back to the app ID generator in restricted runtimes.
	}
	return generateId();
};

type LegacyScramble = string | string[] | string[][];
type LegacyScramblerId = string | string[];
type SolveWithOptionalStats = Solve & { stats?: unknown };

export type LegacySolve = Omit<Solve, 'scramble' | 'scramblerId'> & {
	scramble?: LegacyScramble;
	scramblerId?: string | string[];
	stats?: unknown;
};

export type LegacySession = Omit<Session, 'scramblerId' | 'solveIds'> & {
	scramblerId?: string | string[];
	solves?: LegacySolve[];
	solveIds?: string[];
};

export const persistImportedSnapshotOrThrow = async (nextSessions: Session[], nextSolves: SolveMap): Promise<void> => {
	const prevSessionsRaw = storage.getItem('cmostimer_sessions');
	const prevSolvesRaw = await readPersistedSolves();
	const sessionsRaw = JSON.stringify(nextSessions);
	const solvesRaw = JSON.stringify(nextSolves);

	try {
		storage.setItem('cmostimer_sessions', sessionsRaw);
		await writePersistedSolves(solvesRaw, true);
	} catch (err) {
		// Roll back persistent storage to avoid partial imports across reloads.
		try {
			if (prevSessionsRaw === null) storage.removeItem('cmostimer_sessions');
			else storage.setItem('cmostimer_sessions', prevSessionsRaw);
		} catch {
			// Ignore rollback failures; the original persistence error is more actionable.
		}
		try {
			if (prevSolvesRaw === null) {
				await clearPersistedSolves();
			} else {
				await writePersistedSolves(prevSolvesRaw, false);
			}
		} catch {
			// Ignore rollback failures; the original persistence error is more actionable.
		}

		const msg = err instanceof Error ? err.message : 'Failed to persist imported data.';
		throw new Error(`Import canceled: ${msg}`);
	}
};

const backupCorruptStorage = async (savedSessions: string | null, savedSolves: string | null): Promise<void> => {
	const suffix = Date.now();
	try {
		if (savedSessions) storage.setItem(`cmostimer_sessions_corrupt_${suffix}`, savedSessions);
		if (savedSolves) storage.setItem(`cmostimer_solves_corrupt_${suffix}`, savedSolves);
		storage.removeItem('cmostimer_sessions');
		await clearPersistedSolves();
	} catch {
		// Ignore backup failures; app should still recover with defaults.
	}
};

export const mergeSettingsWithDefaults = (parsed: Partial<Settings>): Settings => ({
	...DEFAULT_SETTINGS,
	...parsed,
	layout: normalizeLayoutConfig(parsed.layout),
	timeDistribution: parsed.timeDistribution || DEFAULT_SETTINGS.timeDistribution,
	solvesOverTime: parsed.solvesOverTime || DEFAULT_SETTINGS.solvesOverTime,
	goalsWidget: parsed.goalsWidget || DEFAULT_SETTINGS.goalsWidget,
	metronome: parsed.metronome || DEFAULT_SETTINGS.metronome,
	mobileLayout: parsed.mobileLayout ? { ...DEFAULT_SETTINGS.mobileLayout, ...parsed.mobileLayout } : DEFAULT_SETTINGS.mobileLayout,
	scrambleImage: { ...DEFAULT_SETTINGS.scrambleImage, ...(parsed.scrambleImage || {}) },
	pbSheet: parsed.pbSheet ? { ...DEFAULT_SETTINGS.pbSheet, ...parsed.pbSheet } : DEFAULT_SETTINGS.pbSheet
});

export const loadPersistedCurrentSessionId = (): string =>
	storage.getItem('cmostimer_current_session') || 'default';

export const loadPersistedGoals = (): Goal[] => {
	try {
		const saved = storage.getItem('cmostimer_goals');
		return saved ? JSON.parse(saved) : [];
	} catch {
		return [];
	}
};

export const loadPersistedPlugins = (): PluginScript[] => {
	try {
		const saved = storage.getItem('cmostimer_plugins_state');
		if (saved) return JSON.parse(saved);

		const legacy = storage.getItem('cmostimer_plugins');
		if (legacy) return JSON.parse(legacy);
	} catch {
		// Ignore parse/storage failures and fall back to an empty plugin list.
	}
	return [];
};

export const loadPersistedStatsConfig = (): StatConfig[] => {
	try {
		const saved = storage.getItem('cmostimer_stats_config');
		return saved ? JSON.parse(saved) : DEFAULT_STATS_CONFIG;
	} catch {
		return DEFAULT_STATS_CONFIG;
	}
};

export const loadPersistedSettings = (): Settings => {
	try {
		const saved = storage.getItem('cmostimer_settings');
		if (saved) {
			return mergeSettingsWithDefaults(JSON.parse(saved) as Partial<Settings>);
		}
	} catch {
		// Ignore parse/storage failures and fall back to default settings.
	}
	return DEFAULT_SETTINGS;
};

export const loadPersistedActionQueue = (): SyncAction[] => {
	try {
		const saved = storage.getItem('cmostimer_sync_queue');
		const parsed = saved ? JSON.parse(saved) : [];
		return Array.isArray(parsed)
			? parsed.map((action) => ({ ...action, opId: action?.opId || createOperationId() })).flatMap(splitSyncAction)
			: [];
	} catch {
		return [];
	}
};

export const loadPersistedAuth = (): AuthState => {
	const token = storage.getItem('cmostimer_token');
	const userStr = storage.getItem('cmostimer_user');
	let user = null;
	if (userStr) {
		try {
			user = JSON.parse(userStr);
		} catch {
			user = null;
		}
	}
	return {
		token,
		user,
		isSynced: loadPersistedActionQueue().length === 0,
		lastSyncTime: 0
	};
};

export const loadAndNormalizeData = async (): Promise<{ sessions: Session[]; solves: SolveMap }> => {
	const savedSessions = storage.getItem('cmostimer_sessions');
	const savedSolves = await readPersistedSolves();

	let finalSessions: Session[] = [];
	let finalSolves: SolveMap = {};

	if (savedSolves && savedSessions) {
		try {
			finalSessions = JSON.parse(savedSessions);
			finalSolves = JSON.parse(savedSolves);
		} catch (e) {
			console.error('Load Error', e);
			await backupCorruptStorage(savedSessions, savedSolves);
			const fallback = buildDefaultNormalizedData();
			finalSessions = fallback.sessions;
			finalSolves = fallback.solves;
		}
	} else if (savedSessions) {
		try {
			const parsed = JSON.parse(savedSessions) as unknown;
			const oldSessions: LegacySession[] = Array.isArray(parsed) ? parsed : [];

			oldSessions.forEach((session) => {
				let scramblerId = session.scramblerId;
				if (!scramblerId) {
					if (session.scrambleType === PuzzleType.TWO) scramblerId = '222';
					else if (session.scrambleType === PuzzleType.FOUR) scramblerId = '444';
					else if (session.scrambleType === PuzzleType.FIVE) scramblerId = '555';
					else scramblerId = '333';
				}

				const solveIds: string[] = [];
				const list = Array.isArray(session.solves) ? session.solves : [];

				list.forEach((solve) => {
					if (solve && typeof solve === 'object') {
						const legacySolve = solve as LegacySolve;
						const sid = legacySolve.id || generateId();
						const normalizedSolve: SolveWithOptionalStats = {
							...legacySolve,
							id: sid,
							scramble: normalizeScramble(legacySolve.scramble),
							scramblerId: normalizeScramblerId(legacySolve.scramblerId, scramblerId)
						};
						if ('stats' in normalizedSolve) delete normalizedSolve.stats;

						finalSolves[sid] = normalizedSolve;
						solveIds.push(sid);
					}
				});

				finalSessions.push({
					id: session.id,
					name: session.name,
					tags: session.tags || [],
					scramblerId: Array.isArray(scramblerId) ? scramblerId : [scramblerId],
					solveIds,
					sourceSessionIds: session.sourceSessionIds || [],
					...(session.customScramblerConfig === undefined ? {} : { customScramblerConfig: session.customScramblerConfig }),
					...(session.settingsOverride === undefined ? {} : { settingsOverride: session.settingsOverride })
				});
			});
		} catch (e) {
			console.error('Migration Error', e);
			await backupCorruptStorage(savedSessions, null);
			const fallback = buildDefaultNormalizedData();
			finalSessions = fallback.sessions;
			finalSolves = fallback.solves;
		}
	} else {
		const defaults = buildDefaultNormalizedData();
		finalSessions = defaults.sessions;
		finalSolves = defaults.solves;
	}

	finalSessions.forEach((session) => {
		if (!Array.isArray(session.scramblerId)) session.scramblerId = [session.scramblerId];
		if (!session.sourceSessionIds) session.sourceSessionIds = [];
	});
	Object.values(finalSolves).forEach((solve) => {
		solve.scramble = normalizeScramble(solve.scramble as unknown as LegacyScramble);
		solve.scramblerId = normalizeScramblerId(solve.scramblerId as unknown as LegacyScramblerId);
	});

	return {
		sessions: normalizeSessionSolveOrder(finalSessions, finalSolves),
		solves: finalSolves
	};
};
