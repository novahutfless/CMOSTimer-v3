import { Solve, SyncAction, SyncActionType } from '../types';

export const MAX_SYNC_BATCH_CHARS = 750_000;
export const MAX_SOLVES_SYNC_ACTION_CHARS = 500_000;
export const MAX_SYNC_FRAGMENT_CHARS = 350_000;

export type NewSyncAction = Omit<SyncAction, 'timestamp' | 'opId'>;

export const measureSyncAction = (action: NewSyncAction | SyncAction): number =>
	JSON.stringify(action).length;

export const chunkSolvesForSync = (solvesToUpsert: Solve[]): NewSyncAction[] => {
	const actions: NewSyncAction[] = [];
	let chunk: Solve[] = [];
	let chunkSize = measureSyncAction({ type: SyncActionType.UPSERT_SOLVES, payload: [] });

	solvesToUpsert.forEach(solve => {
		const solveSize = JSON.stringify(solve).length + 1;
		if (chunk.length > 0 && chunkSize + solveSize > MAX_SOLVES_SYNC_ACTION_CHARS) {
			actions.push({ type: SyncActionType.UPSERT_SOLVES, payload: chunk });
			chunk = [];
			chunkSize = measureSyncAction({ type: SyncActionType.UPSERT_SOLVES, payload: [] });
		}
		chunk.push(solve);
		chunkSize += solveSize;
	});

	if (chunk.length > 0) actions.push({ type: SyncActionType.UPSERT_SOLVES, payload: chunk });
	return actions;
};

const fragmentOversizedAction = (action: SyncAction): SyncAction[] => {
	if (action.type === SyncActionType.SYNC_FRAGMENT || measureSyncAction(action) <= MAX_SYNC_BATCH_CHARS) return [action];
	const serialized = JSON.stringify(action);
	const fragments: string[] = [];
	let start = 0;
	while (start < serialized.length) {
		let end = Math.min(start + MAX_SYNC_FRAGMENT_CHARS, serialized.length);
		if (end < serialized.length) {
			const lastCodeUnit = serialized.charCodeAt(end - 1);
			if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) end--;
		}
		fragments.push(serialized.slice(start, end));
		start = end;
	}
	return fragments.map((data, index) => ({
		type: SyncActionType.SYNC_FRAGMENT,
		opId: `${action.opId}:fragment:${index}`,
		timestamp: action.timestamp + index,
		payload: { transferId: action.opId, index, total: fragments.length, data }
	}));
};

export const splitSyncAction = (action: SyncAction): SyncAction[] => {
	if (action.type !== SyncActionType.UPSERT_SOLVES || !Array.isArray(action.payload)) {
		return fragmentOversizedAction(action);
	}

	return chunkSolvesForSync(action.payload as Solve[]).flatMap((chunkedAction, index) => fragmentOversizedAction({
		...chunkedAction,
		opId: index === 0 ? action.opId : `${action.opId}:${index}`,
		timestamp: action.timestamp + index
	}));
};

export const takeSyncBatch = (queue: SyncAction[]): SyncAction[] => {
	const batch: SyncAction[] = [];
	let size = 2;

	for (const action of queue) {
		const actionSize = measureSyncAction(action) + 1;
		if (batch.length > 0 && size + actionSize > MAX_SYNC_BATCH_CHARS) break;
		batch.push(action);
		size += actionSize;
	}

	return batch;
};
