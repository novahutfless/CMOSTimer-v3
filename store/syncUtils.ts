import { Solve, SyncAction, SyncActionType } from '../types';

export const MAX_SYNC_BATCH_CHARS = 750_000;
export const MAX_SOLVES_SYNC_ACTION_CHARS = 500_000;

export const measureSyncAction = (action: Omit<SyncAction, 'timestamp'> | SyncAction): number =>
	JSON.stringify(action).length;

export const chunkSolvesForSync = (solvesToUpsert: Solve[]): Omit<SyncAction, 'timestamp'>[] => {
	const actions: Omit<SyncAction, 'timestamp'>[] = [];
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

export const splitSyncAction = (action: SyncAction): SyncAction[] => {
	if (action.type !== SyncActionType.UPSERT_SOLVES || !Array.isArray(action.payload)) return [action];

	return chunkSolvesForSync(action.payload as Solve[]).map((chunkedAction, index) => ({
		...chunkedAction,
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
