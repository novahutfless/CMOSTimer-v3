import { Solve, SolveMap } from '../types';
import { buildSubsessionEndIndexes, buildSubsessionsFromEndIndexes, Subsession } from './subsessions';

type SolveSnapshot = ReadonlyMap<string, number>;

interface CacheEntry<TSolve extends Solve> {
	chronological: TSolve[];
	snapshot: SolveSnapshot;
	endIndexes: number[];
}

const chronological = <TSolve extends Solve>(solves: readonly TSolve[]): TSolve[] =>
	[...solves].sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));

const snapshotSolves = (solves: SolveMap): SolveSnapshot =>
	new Map(Object.values(solves).map(solve => [solve.id, solve.timestamp]));

const isAppendOnly = <TSolve extends Solve>(entry: CacheEntry<TSolve>, next: readonly TSolve[], nextSnapshot: SolveSnapshot): boolean => {
	if (next.length < entry.chronological.length) return false;
	if (entry.snapshot.size > nextSnapshot.size) return false;
	if (entry.chronological.some((solve, index) => next[index]?.id !== solve.id || next[index]?.timestamp !== solve.timestamp)) return false;
	for (const [id, timestamp] of entry.snapshot) if (nextSnapshot.get(id) !== timestamp) return false;

	const priorLatestTimestamp = Math.max(...entry.snapshot.values());
	for (const [id, timestamp] of nextSnapshot) {
		if (!entry.snapshot.has(id) && timestamp < priorLatestTimestamp) return false;
	}
	return true;
};

/** In-memory-only cache of session boundaries. It is safe across toggles and appends. */
export class SubsessionCache {
	private readonly entries = new Map<string, CacheEntry<Solve>>();

	public get<TSolve extends Solve>(sessionId: string, sessionSolves: readonly TSolve[], allSolves: SolveMap): Subsession<TSolve>[] {
		const nextChronological = chronological(sessionSolves);
		const nextSnapshot = snapshotSolves(allSolves);
		const existing = this.entries.get(sessionId) as CacheEntry<TSolve> | undefined;
		if (existing && isAppendOnly(existing, nextChronological, nextSnapshot)) {
			if (nextChronological.length === existing.chronological.length) {
				existing.snapshot = nextSnapshot;
				return buildSubsessionsFromEndIndexes(nextChronological, existing.endIndexes);
			}
			const stableEndIndexes = existing.endIndexes.slice(0, -1);
			const startIndex = stableEndIndexes.length > 0 ? stableEndIndexes.at(-1)! + 1 : 0;
			const timestamps = Array.from(nextSnapshot.values()).sort((left, right) => left - right);
			const tailEndIndexes = buildSubsessionEndIndexes(nextChronological, timestamps, startIndex);
			const endIndexes = [...stableEndIndexes, ...tailEndIndexes];
			this.entries.set(sessionId, { chronological: nextChronological, snapshot: nextSnapshot, endIndexes });
			return buildSubsessionsFromEndIndexes(nextChronological, endIndexes);
		}

		const timestamps = Array.from(nextSnapshot.values()).sort((left, right) => left - right);
		const endIndexes = buildSubsessionEndIndexes(nextChronological, timestamps);
		this.entries.set(sessionId, { chronological: nextChronological, snapshot: nextSnapshot, endIndexes });
		return buildSubsessionsFromEndIndexes(nextChronological, endIndexes);
	}

	public clear(sessionId?: string): void {
		if (sessionId === undefined) this.entries.clear();
		else this.entries.delete(sessionId);
	}
}

export const subsessionCache = new SubsessionCache();
