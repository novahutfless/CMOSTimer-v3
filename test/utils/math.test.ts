import { describe, it, expect } from 'vitest';
import { calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage, calculateStatValue, getCurrentStatValue, getBestStatValue, calculateSolveStats, recalculateSessionStats, getSolveTime } from '../../utils/math';
import { Solve, Penalty, StatType, StatConfig } from '../../types';
import { DNF_VALUE } from '../../utils/constants';

// Helper to create a mock solve with minimal required properties
const createSolve = (time: number, penalty: Penalty = Penalty.NONE): Solve => ({
	id: 'test',
	timestamp: 0,
	time,
	inspectionTime: 0,
	scramble: [],
	scramblerId: [],
	penalty
});

describe('Math Utils', () => {
	describe('getSolveTime', () => {
		it('returns raw time for no penalty', () => {
			const solve = createSolve(1000);
			expect(getSolveTime(solve)).toBe(1000);
		});

		it('adds 2000ms for +2 penalty', () => {
			const solve = createSolve(1000, Penalty.PLUS_TWO);
			expect(getSolveTime(solve)).toBe(3000);
		});

		it('returns null for DNF', () => {
			const solve = createSolve(1000, Penalty.DNF);
			expect(getSolveTime(solve)).toBeNull();
		});
	});

	describe('calculateMean', () => {
		it('returns null if not enough solves', () => {
			const solves = [createSolve(1000), createSolve(2000)];
			expect(calculateMean(solves, 3)).toBeNull();
		});

		it('calculates mean of 3', () => {
			const solves = [createSolve(1000), createSolve(2000), createSolve(3000)];
			expect(calculateMean(solves, 3)).toBe(2000);
		});

		it('returns DNF_VALUE if any solve in window is DNF', () => {
			const solves = [createSolve(1000), createSolve(2000), createSolve(1000, Penalty.DNF)];
			expect(calculateMean(solves, 3)).toBe(DNF_VALUE);
		});
	});

	describe('calculateAverage', () => {
		it('returns DNF for an undefined average', () => {
			expect(calculateAverage([createSolve(1000)], 1)).toBe(DNF_VALUE);
		});

		it('calculates ao5 correctly (removes best and worst)', () => {
			// Times: 10s, 12s, 15s, 20s, 100s. 
			// Best: 10s, Worst: 100s. 
			// Counting: 12, 15, 20. Avg = 47/3 = 15.666...
			const solves = [
				createSolve(10000), 
				createSolve(12000), 
				createSolve(15000), 
				createSolve(20000), 
				createSolve(100000)
			];
			const avg = calculateAverage(solves, 5);
			expect(avg).toBeCloseTo(15666.66, 1);
		});

		it('handles single DNF in ao5 (counts as worst)', () => {
			// Times: 10, 12, 15, 20, DNF. 
			// Best: 10, Worst: DNF.
			// Counting: 12, 15, 20.
			const solves = [
				createSolve(10000), 
				createSolve(12000), 
				createSolve(15000), 
				createSolve(20000), 
				createSolve(5000, Penalty.DNF)
			];
			const avg = calculateAverage(solves, 5);
			expect(avg).toBeCloseTo(15666.66, 1);
		});

		it('returns DNF_VALUE if more than 1 DNF in ao5 (more than 5%)', () => {
			const solves = [
				createSolve(10000), 
				createSolve(12000), 
				createSolve(15000), 
				createSolve(5000, Penalty.DNF),
				createSolve(5000, Penalty.DNF)
			];
			expect(calculateAverage(solves, 5)).toBe(DNF_VALUE);
		});
	});

	describe('calculateStandardDeviation', () => {
		it('calculates std dev correctly', () => {
			// 2, 4, 4, 4, 5, 5, 7, 9
			// Mean = 5
			// Variance = 4
			// SD = 2
			const times = [2000, 4000, 4000, 4000, 5000, 5000, 7000, 9000];
			const solves = times.map(t => createSolve(t));
            
			expect(calculateStandardDeviation(solves, 8)).toBe(2000);
		});
	});

	describe('calculateSuccessRate', () => {
		it('calculates success rate for window', () => {
			const solves = [createSolve(1000), createSolve(1000, Penalty.DNF)];
			expect(calculateSuccessRate(solves, 2)).toBe(0.5);
		});

		it('returns 0 for empty subset', () => {
			expect(calculateSuccessRate([], 0)).toBe(0);
		});
	});

	describe('calculateWeightedAverage', () => {
		it('weights later solves higher', () => {
			const solves = [createSolve(1000), createSolve(2000), createSolve(3000)];
			const avg = calculateWeightedAverage(solves, 3);
			// (1*1000 + 2*2000 + 3*3000) / 6 = 2333.33
			expect(avg).toBeCloseTo(2333.33, 1);
		});
	});

	describe('calculateStatValue and stat helpers', () => {
		it('calculates single stat value', () => {
			const stat: StatConfig = { id: 'single', type: StatType.SINGLE, size: 1 };
			expect(calculateStatValue([createSolve(1500)], stat)).toBe(1500);
		});

		it('gets current stat value for success rate', () => {
			const stat: StatConfig = { id: 'success', type: StatType.SUCCESS_RATE, size: 0 };
			const history = [createSolve(1000), createSolve(1000, Penalty.DNF)];
			expect(getCurrentStatValue(stat, history)).toBe(0.5);
		});

		it('gets best stat value for averages', () => {
			const stat: StatConfig = { id: 'ao3', type: StatType.AVERAGE, size: 3 };
			const history = [createSolve(1000), createSolve(3000), createSolve(2000)];
			const best = getBestStatValue(stat, history);
			expect(best.best).toBe(2000);
			expect(best.bestWindow).not.toBeNull();
		});
	});

	describe('calculateSolveStats and session recompute', () => {
		it('computes rolling stats', () => {
			const first = createSolve(1000);
			const stats = calculateSolveStats(first, []);
			expect(stats.mean3).toBeNull();
		});

		it('recalculates session stats in timestamp order', () => {
			const solves = [
				{ ...createSolve(2000), timestamp: 2 },
				{ ...createSolve(1000), timestamp: 1 }
			];
			const recalculated = recalculateSessionStats(solves);
			expect(recalculated[0].timestamp).toBe(1);
			expect(recalculated[0].stats).toBeDefined();
		});
	});
});
