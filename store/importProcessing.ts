import { Session, Settings, Solve, SolveMap, StatConfig, SyncAction, SyncActionType } from '../types';
import { generateId } from '../utils/common';
import { normalizeScramble, normalizeScramblerId } from './defaults';
import { sortSolveIdsChronologically } from './solveOrder';
import { LegacySession, LegacySolve } from './storageState';
import { chunkSolvesForSync } from './syncUtils';

export type ProcessImportData = {
	sessions: { session: Session; targetId: string | 'NEW' }[];
	settings?: Settings;
	statsConfig?: StatConfig[];
	deduplicate?: boolean;
};

type ImportPreparationResult = {
	sessions: Session[];
	solves: SolveMap;
	pendingSyncActions: Omit<SyncAction, 'timestamp'>[];
};

type SolveWithOptionalStats = (Solve | LegacySolve) & { stats?: unknown };

const getSolveMatchKey = (solve: Pick<Solve, 'timestamp' | 'time'>): string => `${solve.timestamp}::${solve.time}`;

const hydrateImportedSolves = (
	importedSession: Session,
	importedIdToStoredId: Map<string, string>,
	newSolvesMap: SolveMap,
	existingSolves: SolveMap
): (Solve | LegacySolve)[] => {
	const importSession = importedSession as LegacySession;
	if (Array.isArray(importSession.solves) && importSession.solves.length > 0) {
		return importSession.solves;
	}

	if (!Array.isArray(importedSession.solveIds)) {
		return [];
	}

	return importedSession.solveIds
		.map((rawId) => {
			const resolvedId = importedIdToStoredId.get(rawId) || rawId;
			return newSolvesMap[resolvedId] || existingSolves[resolvedId];
		})
		.filter((solve): solve is Solve => Boolean(solve));
};

const sanitizeImportedSolve = (solve: Solve | LegacySolve, sessionScramblerIds: string[]): Solve => {
	const solveWithOptionalStats = solve as SolveWithOptionalStats;
	const { stats: _stats, ...cleanSolve } = solveWithOptionalStats;
	void _stats;

	return {
		...cleanSolve,
		scramble: normalizeScramble(solve.scramble),
		scramblerId: normalizeScramblerId(solve.scramblerId, sessionScramblerIds)
	};
};

export const prepareImportData = (
	data: ProcessImportData,
	existingSessions: Session[],
	existingSolves: SolveMap
): ImportPreparationResult => {
	const newSolvesMap = { ...existingSolves };
	const newSessionsList = [...existingSessions];
	const shouldDeduplicate = data.deduplicate !== false;
	const importedIdToStoredId = new Map<string, string>();
	const pendingSyncActions: Omit<SyncAction, 'timestamp'>[] = [];

	data.sessions.forEach(({ session: importedSession, targetId }) => {
		const hydratedSolves = hydrateImportedSolves(importedSession, importedIdToStoredId, newSolvesMap, existingSolves);
		const sessionScramblerIds = Array.isArray(importedSession.scramblerId)
			? importedSession.scramblerId
			: [importedSession.scramblerId || '333'];
		const finalSolves = hydratedSolves.map((solve) => sanitizeImportedSolve(solve, sessionScramblerIds));
		const importedIds: string[] = [];
		const solvesToUpsert: Solve[] = [];
		const existingByMatchKey = new Map<string, string>();

		if (targetId !== 'NEW' && shouldDeduplicate) {
			const targetSession = newSessionsList.find((session) => session.id === targetId);
			if (targetSession) {
				targetSession.solveIds.forEach((id) => {
					const existing = newSolvesMap[id];
					if (!existing) return;
					existingByMatchKey.set(getSolveMatchKey(existing), id);
				});
			}
		}

		finalSolves.forEach((solve) => {
			let nextId = solve.id;
			const matchKey = getSolveMatchKey(solve);
			const matchedExistingId = shouldDeduplicate && targetId !== 'NEW'
				? existingByMatchKey.get(matchKey)
				: undefined;

			if (matchedExistingId) {
				nextId = matchedExistingId;
			} else if (newSolvesMap[nextId]) {
				nextId = generateId();
			}

			const solveToStore: Solve = { ...solve, id: nextId };
			newSolvesMap[nextId] = solveToStore;
			importedIdToStoredId.set(solve.id, nextId);
			solvesToUpsert.push(solveToStore);
			if (!matchedExistingId) importedIds.push(nextId);
			existingByMatchKey.set(matchKey, nextId);
		});

		pendingSyncActions.push(...chunkSolvesForSync(solvesToUpsert));

		if (targetId === 'NEW') {
			const { solves: _legacySolves, ...sessionWithoutLegacySolves } = importedSession as LegacySession;
			void _legacySolves;
			const newSession: Session = {
				...sessionWithoutLegacySolves,
				scramblerId: sessionScramblerIds,
				solveIds: sortSolveIdsChronologically(importedIds, newSolvesMap),
				sourceSessionIds: []
			};
			newSessionsList.push(newSession);
			pendingSyncActions.push({ type: SyncActionType.UPDATE_SESSION, payload: newSession });
			return;
		}

		const idx = newSessionsList.findIndex((session) => session.id === targetId);
		if (idx !== -1) {
			const updatedSession = {
				...newSessionsList[idx],
				solveIds: sortSolveIdsChronologically([...newSessionsList[idx].solveIds, ...importedIds], newSolvesMap)
			};
			newSessionsList[idx] = updatedSession;
			pendingSyncActions.push({ type: SyncActionType.UPDATE_SESSION, payload: updatedSession });
		}
	});

	return {
		sessions: newSessionsList,
		solves: newSolvesMap,
		pendingSyncActions
	};
};
