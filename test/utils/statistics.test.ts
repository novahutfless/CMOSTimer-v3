import { describe, it, expect } from 'vitest';
import {
	buildGlobalStats,
	buildDailySummaryData,
	buildAvailableStats,
	buildSolveChartData,
	buildSolveFrequencyData,
	buildPenaltyData,
	buildPbHistory,
	buildTotals
} from '../../utils/statistics';
import { Penalty, StatType, Language, Solve, Session, StatConfig } from '../../types';

const createSolve = (id: string, timestamp: number, time = 10000, penalty: Penalty = Penalty.NONE): Solve => ({
	id,
	timestamp,
	time,
	inspectionTime: 1000,
	scramble: [],
	scramblerId: [],
	penalty
});

describe('Statistics Utils', () => {
	it('builds global stats', () => {
		const solves = [
			createSolve('a', 1, 10000),
			createSolve('b', 2, 20000, Penalty.PLUS_TWO),
			createSolve('c', 3, 5000, Penalty.DNF)
		];
		const stats = buildGlobalStats(solves);
		expect(stats.count).toBe(3);
		expect(stats.time).toBe(10000 + 22000);
		expect(stats.avg).toBe((10000 + 22000) / 2);
	});

	it('builds daily summary data', () => {
		const base = new Date('2025-01-10T12:00:00').getTime();
		const solves = [createSolve('a', base), createSolve('b', base + 86400000)];
		const sessions: Session[] = [
			{ id: 's1', name: 'Session A', scramblerId: [], solveIds: ['a'] },
			{ id: 's2', name: 'Session B', scramblerId: [], solveIds: ['b'] }
		];
		const data = buildDailySummaryData(solves, sessions, new Date('2025-01-01T00:00:00'));
		expect(data.length).toBe(2);
		expect(data[0].total).toBe(1);
	});

	it('builds available stats with single fallback', () => {
		const statsConfig: StatConfig[] = [{ id: 'avg5', type: StatType.AVERAGE, size: 5 }];
		const stats = buildAvailableStats(statsConfig, Language.EN);
		expect(stats.some(s => s.type === StatType.SINGLE)).toBe(true);
	});

	it('builds solve chart data', () => {
		const solves = [
			createSolve('a', 1, 10000),
			createSolve('b', 2, 12000)
		];
		const stat: StatConfig = { id: 'single', type: StatType.SINGLE, size: 1 };
		const chart = buildSolveChartData(solves, stat);
		expect(chart[0].val).toBe(10);
		expect(chart[1].val).toBe(12);
	});

	it('builds solve frequency data by day', () => {
		const t1 = new Date('2025-01-01T12:00:00').getTime();
		const t2 = new Date('2025-01-03T12:00:00').getTime();
		const data = buildSolveFrequencyData([createSolve('a', t1), createSolve('b', t2)], 'day');
		expect(data.length).toBe(3);
		expect(data[0].count).toBe(1);
	});

	it('builds penalty data', () => {
		const solves = [
			createSolve('a', 1, 10000, Penalty.NONE),
			createSolve('b', 2, 10000, Penalty.PLUS_TWO),
			createSolve('c', 3, 10000, Penalty.DNF)
		];
		const data = buildPenaltyData(solves, '#fff');
		expect(data.find(d => d.name === 'Clean')?.value).toBe(1);
		expect(data.find(d => d.name === '+2')?.value).toBe(1);
		expect(data.find(d => d.name === 'DNF')?.value).toBe(1);
	});

	it('builds pb history', () => {
		const solves = [
			createSolve('a', 1, 20000),
			createSolve('b', 2, 15000),
			createSolve('c', 3, 18000)
		];
		const history = buildPbHistory(solves, StatType.SINGLE, 1);
		expect(history[0].solve.id).toBe('b');
	});

	it('builds totals', () => {
		const solves = [
			createSolve('a', 1, 10000),
			createSolve('b', 2, 10000, Penalty.DNF)
		];
		const totals = buildTotals(solves);
		expect(totals.time).toBe(10000);
		expect(totals.inspection).toBe(2000);
	});
});
