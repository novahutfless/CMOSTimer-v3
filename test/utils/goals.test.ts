import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateGoalProgress } from '../../utils/goals';
import { GoalFrequency, GoalScope, GoalType, Penalty, StatType, ComputedSolve, StatConfig } from '../../types';
import { DNF_VALUE } from '../../utils/constants';

const createSolve = (timestamp: number, time = 10000, penalty: Penalty = Penalty.NONE, stats?: Partial<ComputedSolve['stats']>): ComputedSolve => ({
	id: `s-${timestamp}`,
	timestamp,
	time,
	inspectionTime: 0,
	scramble: [],
	scramblerId: [],
	penalty,
	stats: {
		mean3: stats?.mean3 ?? null,
		avg5: stats?.avg5 ?? null,
		avg12: stats?.avg12 ?? null
	}
});

describe('Goals Utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calculates solve count goals', () => {
		const now = new Date('2025-01-15T12:00:00').getTime();
		const yesterday = new Date('2025-01-14T12:00:00').getTime();
		const solves = [createSolve(now), createSolve(now + 1000), createSolve(yesterday)];
		const goal = {
			id: 'g1',
			type: GoalType.SOLVE_COUNT,
			frequency: GoalFrequency.DAILY,
			scope: GoalScope.GLOBAL,
			targetValue: 2,
			createdAt: now
		};
		const progress = calculateGoalProgress(goal, solves);
		expect(progress.current).toBe(2);
		expect(progress.percent).toBe(100);
		expect(progress.isCompleted).toBe(true);
	});

	it('does not count DNS attempts toward solve count goals', () => {
		const now = new Date('2025-01-15T12:00:00').getTime();
		const solves = [createSolve(now), createSolve(now + 1000, 0, Penalty.DNS)];
		const goal = {
			id: 'g1-dns',
			type: GoalType.SOLVE_COUNT,
			frequency: GoalFrequency.DAILY,
			scope: GoalScope.GLOBAL,
			targetValue: 2,
			createdAt: now
		};
		const progress = calculateGoalProgress(goal, solves);
		expect(progress.current).toBe(1);
		expect(progress.isCompleted).toBe(false);
	});

	it('calculates time spent goals', () => {
		const now = new Date('2025-01-15T12:00:00').getTime();
		const solves = [createSolve(now, 10000), createSolve(now, 20000, Penalty.PLUS_TWO), createSolve(now, 0, Penalty.DNF)];
		const goal = {
			id: 'g2',
			type: GoalType.TIME_SPENT,
			frequency: GoalFrequency.DAILY,
			scope: GoalScope.GLOBAL,
			targetValue: 32000,
			createdAt: now
		};
		const progress = calculateGoalProgress(goal, solves);
		expect(progress.current).toBe(10000 + 22000);
		expect(progress.isCompleted).toBe(true);
	});

	it('calculates stat target goals using best values', () => {
		const now = new Date('2025-01-15T12:00:00').getTime();
		const statConfig: StatConfig = { id: 'avg5', type: StatType.AVERAGE, size: 5 };
		const solves = [
			createSolve(now, 10000, Penalty.NONE, { avg5: 15000 }),
			createSolve(now + 1000, 10000, Penalty.NONE, { avg5: 11000 }),
			createSolve(now + 2000, 10000, Penalty.NONE, { avg5: DNF_VALUE })
		];
		const goal = {
			id: 'g3',
			type: GoalType.STAT_TARGET,
			frequency: GoalFrequency.DAILY,
			scope: GoalScope.GLOBAL,
			targetValue: 12000,
			createdAt: now,
			statConfig
		};
		const progress = calculateGoalProgress(goal, solves);
		expect(progress.current).toBe(11000);
		expect(progress.isCompleted).toBe(true);
	});
});
