import { describe, expect, it } from 'vitest';
import { Penalty, Solve, SolveMap } from '../../types';
import { buildSubsessions, SUBSESSION_GAP_MS } from '../../utils/subsessions';

const solve = (id: string, timestamp: number, time = 1000): Solve => ({
	id,
	timestamp,
	time,
	inspectionTime: -1,
	scramble: [[]],
	scramblerId: ['333'],
	penalty: Penalty.NONE
});

describe('buildSubsessions', () => {
	it('splits on a 30-minute gap or a solve from another session', () => {
		const first = solve('first', 0, 1000);
		const second = solve('second', 20 * 60 * 1000, 3000);
		const interrupted = solve('interrupted', 25 * 60 * 1000, 4000);
		const third = solve('third', 29 * 60 * 1000, 5000);
		const fourth = solve('fourth', 29 * 60 * 1000 + SUBSESSION_GAP_MS + 1, 7000);
		const allSolves: SolveMap = { first, second, interrupted, third, fourth };

		const groups = buildSubsessions([fourth, first, third, second], allSolves);

		expect(groups.map(group => group.solves.map(solve => solve.id))).toEqual([
			['first', 'second'],
			['third'],
			['fourth']
		]);
		expect(groups[0]?.averageTime).toBe(2000);
	});

	it('keeps a gap of exactly 30 minutes in the same subsession', () => {
		const first = solve('first', 0);
		const second = solve('second', SUBSESSION_GAP_MS);
		const allSolves: SolveMap = { first, second };

		expect(buildSubsessions([first, second], allSolves)).toHaveLength(1);
	});
});
