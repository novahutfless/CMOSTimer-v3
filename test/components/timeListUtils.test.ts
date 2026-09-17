import { describe, expect, it, vi } from 'vitest';
import { Penalty, StatType, type ComputedSolve, type Solve } from '../../types';
import { DNF_VALUE } from '../../utils/constants';
import { getStatValue, parseTimeExpression } from '../../components/timeList/timeListUtils';

vi.hoisted(() => {
	vi.stubGlobal('Audio', vi.fn());
});

const solve = (id: string, time: number, penalty = Penalty.NONE): Solve => ({
	id,
	timestamp: 0,
	time,
	inspectionTime: -1,
	scramble: [],
	scramblerId: ['333'],
	penalty
});

const computed = (id: string, time: number, penalty = Penalty.NONE, mean3: number | null = null): ComputedSolve => ({
	...solve(id, time, penalty),
	stats: { mean3, avg5: null, avg12: null }
});

describe('Time-list utilities', () => {
	it('filters by IDs, penalties, and numeric comparisons', () => {
		expect(parseTimeExpression('ID[a,b]')?.(solve('b', 1000))).toBe(true);
		expect(parseTimeExpression('ID[a,b]')?.(solve('c', 1000))).toBe(false);
		expect(parseTimeExpression('DNF')?.(solve('x', 1000, Penalty.DNF))).toBe(true);
		expect(parseTimeExpression('DNS')?.(solve('x', 1000, Penalty.DNS))).toBe(true);
		expect(parseTimeExpression('+2')?.(solve('x', 1000, Penalty.PLUS_TWO))).toBe(true);
		expect(parseTimeExpression('>1.5')?.(solve('x', 2000))).toBe(true);
		expect(parseTimeExpression('<=2000')?.(solve('x', 2000))).toBe(true);
	});

	it('supports AND/OR expressions and rejects malformed ID selectors', () => {
		const expression = parseTimeExpression('>1 & <3');
		expect(expression?.(solve('x', 2000))).toBe(true);
		expect(expression?.(solve('x', 5000))).toBe(false);
		expect(parseTimeExpression('>1 | DNF')?.(solve('x', 5000, Penalty.DNF))).toBe(true);
		expect(parseTimeExpression('')).toBeNull();
		expect(parseTimeExpression('ID[x] > 1')).toBeNull();
		expect(parseTimeExpression('not-a-filter')).toBeNull();
	});

	it('returns cached and calculated statistic values', () => {
		const solves = [computed('a', 1000), computed('b', 2000), computed('c', 3000, Penalty.NONE, 2222)];
		expect(getStatValue(solves[2], solves, 2, { id: 'single', type: StatType.SINGLE, size: 1 })).toBe(3000);
		expect(getStatValue(solves[2], solves, 2, { id: 'mean3', type: StatType.MEAN, size: 3 })).toBe(2222);
		expect(getStatValue(solves[2], solves, 0, { id: 'mean2', type: StatType.MEAN, size: 2 })).toBe(1500);
		expect(getStatValue(solves[0], solves, 0, { id: 'too-large', type: StatType.MEAN, size: 4 })).toBeNull();
		expect(getStatValue(computed('dnf', 1000, Penalty.DNF), solves, 0, { id: 'single', type: StatType.SINGLE, size: 1 })).toBe(DNF_VALUE);
	});
});
