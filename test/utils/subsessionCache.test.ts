import { describe, expect, it } from 'vitest';
import { Penalty, Solve, SolveMap } from '../../types';
import { SubsessionCache } from '../../utils/subsessionCache';

const solve = (id: string, timestamp: number): Solve => ({
	id,
	timestamp,
	time: 1000,
	inspectionTime: -1,
	scramble: [[]],
	scramblerId: ['333'],
	penalty: Penalty.NONE
});

describe('SubsessionCache', () => {
	it('keeps cached boundaries for appends and invalidates them for inserted or retimed solves', () => {
		const cache = new SubsessionCache();
		const first = solve('first', 0);
		const second = solve('second', 10 * 60 * 1000);
		const initial: SolveMap = { first, second };

		expect(cache.get('session', [first, second], initial)).toHaveLength(1);

		const appendedElsewhere = solve('other-later', 20 * 60 * 1000);
		expect(cache.get('session', [first, second], { ...initial, 'other-later': appendedElsewhere })).toHaveLength(1);

		const insertedElsewhere = solve('other-earlier', 5 * 60 * 1000);
		expect(cache.get('session', [first, second], { ...initial, 'other-earlier': insertedElsewhere })).toHaveLength(2);

		const retimedSecond = { ...second, timestamp: 40 * 60 * 1000 };
		expect(cache.get('session', [first, retimedSecond], { first, second: retimedSecond })).toHaveLength(2);
	});

	it('only recomputes the trailing block when a session solve is appended', () => {
		const cache = new SubsessionCache();
		const first = solve('first', 0);
		const second = solve('second', 40 * 60 * 1000);
		const third = solve('third', 45 * 60 * 1000);
		const initial: SolveMap = { first, second };

		expect(cache.get('session', [first, second], initial).map(group => group.solves.map(solve => solve.id))).toEqual([['first'], ['second']]);
		expect(cache.get('session', [first, second, third], { ...initial, third }).map(group => group.solves.map(solve => solve.id))).toEqual([['first'], ['second', 'third']]);
	});
});
