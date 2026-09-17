import { describe, expect, it } from 'vitest';
import { Penalty, SyncAction, SyncActionType } from '../../types';
import { DurableSyncEngine, INITIAL_RETRY_DELAY_MS, isUnauthorizedSyncError, mergeSyncQueues, nextRetryDelay, shouldApplyRemoteState } from '../../store/syncEngine';

const action = (opId: string, timestamp = 1): SyncAction => ({
	opId, timestamp, type: SyncActionType.ADD_SOLVE_ATOMIC,
	payload: { solve: { id: opId, timestamp, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE }, sessionIds: [] }
});

describe('DurableSyncEngine', () => {
	it('persists an action before the caller can attempt a sync', () => {
		let queue: SyncAction[] = [];
		const engine = new DurableSyncEngine({ read: () => queue, write: (next) => { queue = next; } }, async () => ({}));
		engine.enqueue([action('a')]);
		expect(queue.map(item => item.opId)).toEqual(['a']);
	});

	it('keeps the queue intact when the response is lost, enabling an idempotent retry', async () => {
		let queue = [action('a')];
		let calls = 0;
		const engine = new DurableSyncEngine({ read: () => queue, write: (next) => { queue = next; } }, async () => {
			calls++;
			if (calls === 1) throw new Error('connection lost after server commit');
			return { ok: true };
		});
		await expect(engine.synchronize('token')).rejects.toThrow('connection lost');
		expect(queue.map(item => item.opId)).toEqual(['a']);
		await engine.synchronize('token');
		expect(queue).toEqual([]);
	});

	it('does not acknowledge an action added while a request is in flight', async () => {
		let queue = [action('sent')];
		let resolveTransport!: (value: { ok: boolean }) => void;
		const engine = new DurableSyncEngine({ read: () => queue, write: (next) => { queue = next; } }, () => new Promise(resolve => { resolveTransport = resolve; }));
		const pending = engine.synchronize('token');
		engine.enqueue([action('new', 2)]);
		resolveTransport({ ok: true });
		const result = await pending;
		expect(result.remaining.map(item => item.opId)).toEqual(['new']);
		expect(queue.map(item => item.opId)).toEqual(['new']);
		expect(shouldApplyRemoteState(result.remaining)).toBe(false);
	});

	it('merges a cross-tab queue update without duplicating an operation', () => {
		const tabA = [action('a', 1)];
		const tabB = [action('b', 2), action('a', 1)];
		expect(mergeSyncQueues(tabA, tabB).map(item => item.opId)).toEqual(['a', 'b']);
	});

	it('has bounded retry policy and recognizes only unauthorized failures as terminal auth failures', () => {
		let delay = INITIAL_RETRY_DELAY_MS;
		for (let i = 0; i < 10; i++) delay = nextRetryDelay(delay);
		expect(delay).toBe(30_000);
		expect(isUnauthorizedSyncError({ status: 401 })).toBe(true);
		expect(isUnauthorizedSyncError({ status: 500 })).toBe(false);
		expect(isUnauthorizedSyncError(new Error('offline'))).toBe(false);
	});
});
