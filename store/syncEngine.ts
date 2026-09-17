import { SyncAction } from '../types';
import { takeSyncBatch } from './syncUtils';

/**
 * The durable outbox rules are deliberately independent from React, timers and
 * fetch. This makes acknowledgement and retry behaviour testable without a
 * browser or a running server.
 */
export const mergeSyncQueues = (...queues: SyncAction[][]): SyncAction[] => {
	const byId = new Map<string, SyncAction>();
	queues.flat().forEach((action) => {
		if (action?.opId) byId.set(action.opId, action);
	});
	return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
};

export const acknowledgeSyncBatch = (latestQueue: SyncAction[], sentBatch: SyncAction[]): SyncAction[] => {
	const sentIds = new Set(sentBatch.map((action) => action.opId));
	return latestQueue.filter((action) => !sentIds.has(action.opId));
};

/** A remote snapshot is authoritative only after every local operation is acknowledged. */
export const shouldApplyRemoteState = (remainingQueue: SyncAction[]): boolean => remainingQueue.length === 0;

export const INITIAL_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 30_000;

export const nextRetryDelay = (currentDelay: number): number =>
	Math.min(Math.max(currentDelay, INITIAL_RETRY_DELAY_MS) * 2, MAX_RETRY_DELAY_MS);

/** Keep transport-specific errors out of the sync policy. */
export const isUnauthorizedSyncError = (error: unknown): boolean =>
	typeof error === 'object' && error !== null && 'status' in error
		&& (error as { status?: unknown }).status === 401;

export type SyncTransport<Result> = (token: string, actions: SyncAction[]) => Promise<Result>;

export type DurableQueueStore = {
	read: () => SyncAction[];
	write: (queue: SyncAction[]) => void;
};

export class DurableSyncEngine<Result> {
	public constructor(private readonly store: DurableQueueStore, private readonly transport: SyncTransport<Result>) {}

	/** Persist before returning, so a page crash cannot lose a queued operation. */
	enqueue(actions: SyncAction[]): SyncAction[] {
		const next = mergeSyncQueues(this.store.read(), actions);
		this.store.write(next);
		return next;
	}

	/**
	 * Removes only operations acknowledged by this call. Actions written while
	 * the request was in flight are read again and therefore survive the ack.
	 * A rejected transport leaves the durable queue untouched for retry.
	 */
	async synchronize(token: string): Promise<{ result: Result; sent: SyncAction[]; remaining: SyncAction[] }> {
		const sent = takeSyncBatch(this.store.read());
		const result = await this.transport(token, sent);
		const remaining = acknowledgeSyncBatch(mergeSyncQueues(this.store.read()), sent);
		this.store.write(remaining);
		return { result, sent, remaining };
	}
}
