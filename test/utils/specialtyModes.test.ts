import { describe, expect, it } from 'vitest';
import { buildMultiBlindAttempt, countFmcMoves, getMultiBlindPoints } from '../../utils/specialtyModes';

describe('specialty session modes', () => {
	it('counts FMC moves but excludes annotations', () => {
		expect(countFmcMoves("R U R' U' (cancel into inverse) F2 /block/ D")).toBe(6);
		expect(countFmcMoves('  ')).toBe(0);
	});

	it('calculates multi-blind points', () => {
		expect(getMultiBlindPoints(8, 10)).toBe(6);
	});

	it('normalizes a multi-blind attempt', () => {
		expect(buildMultiBlindAttempt(5, 7, 'corners, parity, corners', 1)).toEqual({
			attempted: 5,
			solved: 5,
			mistakeTypes: ['corners', 'parity', 'corners'],
			memoSplitIndex: 1
		});
	});
});
