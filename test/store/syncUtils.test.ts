import { describe, expect, it } from 'vitest';
import { Penalty, Solve, SyncActionType } from '../../types';
import { MAX_SOLVES_SYNC_ACTION_CHARS, splitSyncAction } from '../../store/syncUtils';

const solveWithComment = (id: string, comment: string): Solve => ({
	id,
	timestamp: 1,
	time: 1000,
	inspectionTime: -1,
	scramble: [['R']],
	scramblerId: ['333'],
	penalty: Penalty.NONE,
	comment
});

describe('syncUtils', () => {
	it('gives every persisted chunk a stable, distinct operation ID', () => {
		const largeComment = 'x'.repeat(Math.floor(MAX_SOLVES_SYNC_ACTION_CHARS * 0.6));
		const chunks = splitSyncAction({
			opId: 'operation-1',
			timestamp: 100,
			type: SyncActionType.UPSERT_SOLVES,
			payload: [solveWithComment('a', largeComment), solveWithComment('b', largeComment)]
		});

		expect(chunks).toHaveLength(2);
		expect(chunks.map((chunk) => chunk.opId)).toEqual(['operation-1', 'operation-1:1']);
		expect(chunks.map((chunk) => chunk.timestamp)).toEqual([100, 101]);
	});

	it('fragments an oversized non-solve action without corrupting Unicode', () => {
		const original = {
			opId: 'large-plugin',
			timestamp: 200,
			type: SyncActionType.UPSERT_PLUGIN,
			payload: { id: 'plugin-1', name: 'Large', enabled: true, code: `🚀${'x'.repeat(800_000)}` }
		};
		const fragments = splitSyncAction(original);

		expect(fragments.length).toBeGreaterThan(1);
		expect(fragments.every((fragment) => fragment.type === SyncActionType.SYNC_FRAGMENT)).toBe(true);
		const reconstructed = fragments
			.map((fragment) => (fragment.payload as { data: string }).data)
			.join('');
		expect(JSON.parse(reconstructed)).toEqual(original);
	});
});
