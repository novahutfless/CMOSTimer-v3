import { describe, expect, it } from 'vitest';
import { analyticsEvent, AnalyticsFilter, compareAnalyticsWeeks, filterAnalyticsSolves, summarizeAnalytics } from '../../utils/analytics';
import { Penalty, Solve, SolveInputSource } from '../../types';
import { DNF_VALUE } from '../../utils/constants';

const solve = (id: string, time: number, penalty = Penalty.NONE): Solve => ({ id, time, penalty, timestamp: Number(id), inspectionTime: -1, scramble: [], scramblerId: ['333'] });
const empty: AnalyticsFilter = { sessionIds: [], events: [], tags: [], penalties: [], inputSources: [], from: '', to: '' };

describe('analytics', () => {
	it('combines filters, respects inclusive local dates, and does not mutate data', () => {
		const a = { ...solve('1', 1000, Penalty.PLUS_TWO), tags: ['practice'], timestamp: +new Date('2026-09-17T23:59:59.999') };
		const b = { ...a, id: '2', timestamp: +new Date('2026-09-18T00:00:00') };
		const c = { ...a, id: '3', scramblerId: ['333', '222'] };
		const map = { '1': a, '2': b, '3': c };
		const sessions = [{ id: 's', name: 'Session', scramblerId: ['333'], solveIds: ['1', '2', '3', '1'] }];
		const filter = { ...empty, sessionIds: ['s'], events: [analyticsEvent(a)], tags: ['practice'], penalties: [Penalty.PLUS_TWO], from: '2026-09-17', to: '2026-09-17' };
		expect(filterAnalyticsSolves(map, sessions, filter)).toEqual([a]);
		expect(filterAnalyticsSolves(map, sessions, { ...filter, sessionIds: ['missing'] })).toEqual([]);
		expect(filterAnalyticsSolves(map, sessions, { ...filter, tags: ['missing'] })).toEqual([]);
		expect(filterAnalyticsSolves(map, sessions, { ...filter, from: '2026-09-18' })).toEqual([]);
		expect(Object.keys(map)).toEqual(['1', '2', '3']);
	});
	it('filters recorded sources and keeps legacy solves explicitly unknown', () => {
		const keyboard = { ...solve('1', 1000), inputSource: SolveInputSource.KEYBOARD };
		const historical = solve('2', 2000);
		const map = { '1': keyboard, '2': historical };
		expect(filterAnalyticsSolves(map, [], { ...empty, inputSources: [SolveInputSource.KEYBOARD] })).toEqual([keyboard]);
		expect(filterAnalyticsSolves(map, [], { ...empty, inputSources: ['UNKNOWN'] })).toEqual([historical]);
	});
	it('uses OR within multi-select filters and AND across categories', () => {
		const a = { ...solve('1', 1000), tags: ['training'], penalty: Penalty.NONE };
		const b = { ...solve('2', 2000), tags: ['competition'], penalty: Penalty.PLUS_TWO };
		const c = { ...solve('3', 3000), tags: ['other'], penalty: Penalty.DNF };
		const map = { '1': a, '2': b, '3': c };
		expect(filterAnalyticsSolves(map, [], { ...empty, tags: ['training', 'competition'], penalties: [Penalty.NONE, Penalty.PLUS_TWO] })).toEqual([a, b]);
		expect(filterAnalyticsSolves(map, [], { ...empty, tags: ['training', 'competition'], penalties: [Penalty.NONE] })).toEqual([a]);
	});
	it('computes interpolated percentiles and population deviation with penalties', () => {
		const result = summarizeAnalytics([solve('1', 1000), solve('2', 1000, Penalty.PLUS_TWO), solve('3', 999, Penalty.DNF), solve('4', 999, Penalty.DNS)]);
		expect(result).toMatchObject({ count: 4, valid: 2, dnf: 1, dns: 1, mean: 2000, median: 2000, p10: 1200, p90: 2800, deviation: 1000, consistency: 50 });
	});
	it('uses chronological rolling windows and the existing DNF trimming rules', () => {
		const solves = [solve('1', 1000), solve('2', 2000), solve('3', 3000), solve('4', 4000), solve('5', 5000, Penalty.DNF)];
		expect(summarizeAnalytics([...solves].reverse()).averages[0].value).toBe(3000);
		expect(summarizeAnalytics([...solves, solve('6', 1000, Penalty.DNF)]).averages[0].value).toBe(DNF_VALUE);
		expect(summarizeAnalytics(solves).averages[1].value).toBeNull();
	});
	it('returns unavailable metrics for empty or failed-only samples', () => {
		expect(summarizeAnalytics([])).toMatchObject({ count: 0, mean: null, median: null, deviation: null, consistency: null });
		expect(summarizeAnalytics([solve('1', 1000, Penalty.DNF)]).median).toBeNull();
		expect(summarizeAnalytics([solve('1', 0)]).consistency).toBeNull();
	});
	it('compares disjoint local calendar weeks including today and excluding future days', () => {
		const dated = (id: string, date: string): Solve => ({ ...solve(id, 1000), timestamp: +new Date(date) });
		const result = compareAnalyticsWeeks([
			dated('1', '2026-09-04T00:00:00'), dated('2', '2026-09-10T23:59:59'),
			dated('3', '2026-09-11T00:00:00'), dated('4', '2026-09-17T23:59:59'),
			dated('5', '2026-09-18T00:00:00'), dated('6', '2026-09-03T23:59:59')
		], +new Date('2026-09-17T12:00:00'));
		expect(result.recent.count).toBe(2);
		expect(result.previous.count).toBe(2);
	});
});
