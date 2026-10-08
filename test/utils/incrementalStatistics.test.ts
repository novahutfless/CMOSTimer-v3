import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelStatisticsCache, SessionStatisticsCache } from '../../utils/incrementalStatistics';
import * as math from '../../utils/math';
import { Penalty, Solve, StatConfig, StatType } from '../../types';

const solve = (index: number): Solve => ({ id: String(index), timestamp: index, time: 10000 + (index * 37 % 5000), inspectionTime: -1, scramble: [], scramblerId: [], penalty: index % 31 === 0 ? Penalty.DNF : Penalty.NONE });
const config: StatConfig[] = [
    { id: 'single', type: StatType.SINGLE, size: 1 },
    { id: 'ao100', type: StatType.AVERAGE, size: 100 },
    { id: 'mo25', type: StatType.MEAN, size: 25 },
    { id: 'success', type: StatType.SUCCESS_RATE, size: 0 },
];
afterEach(() => vi.restoreAllMocks());

describe('incremental statistics', () => {
    it('calculates only the new solve in a 50,000-solve time list and reuses historical objects', () => {
        const history = Array.from({ length: 50000 }, (_, index) => solve(index));
        const cache = new SessionStatisticsCache();
        const previous = cache.get(history, config);
        const calculate = vi.spyOn(math, 'calculateSolveStats');
        const nextHistory = [...history, solve(50000)];
        const next = cache.get(nextHistory, config);
        expect(calculate).toHaveBeenCalledTimes(1);
        expect(next[1]).toBe(previous[0]);
        expect(next[0].stats).toEqual(math.calculateSolveStats(nextHistory.at(-1)!, history));
        expect(next[0].historicalPBs).toEqual(new SessionStatisticsCache().get(nextHistory, config)[0].historicalPBs);
    });

    it('updates panel bests using only new configured windows', () => {
        const history = Array.from({ length: 200 }, (_, index) => solve(index));
        const cache = new PanelStatisticsCache();
        cache.get(history, config);
        const search = vi.spyOn(math, 'getBestStatValue');
        const next = [...history, solve(201), { ...solve(202), time: 1 }];
        const rows = cache.get(next, config);
        expect(search).not.toHaveBeenCalled();
        rows.forEach((row, index) => {
            expect(row.current).toEqual(math.getCurrentStatValue(config[index], next));
            expect(row.best).toEqual(math.getBestStatValue(config[index], next).best);
        });
    });

    it('rebuilds after edits, deletion, reordering, session and configuration changes', () => {
        const session = new SessionStatisticsCache();
        const panel = new PanelStatisticsCache();
        let history = Array.from({ length: 120 }, (_, index) => solve(index));
        session.get(history, config);
        panel.get(history, config);
        for (const change of [
            (items: Solve[]) => items.map((item, index) => index === 20 ? { ...item, penalty: Penalty.PLUS_TWO } : item),
            (items: Solve[]) => items.filter((_, index) => index !== 50),
            (items: Solve[]) => items.slice().reverse(),
        ]) {
            history = change(history);
            expect(session.get(history, config)).toEqual(new SessionStatisticsCache().get(history, config));
            expect(panel.get(history, config)).toEqual(new PanelStatisticsCache().get(history, config));
        }
        const changed = [{ id: 'ao50', type: StatType.AVERAGE, size: 50 }];
        expect(session.get(history, changed, { ao50: 1 }, 'different')).toEqual(new SessionStatisticsCache().get(history, changed, { ao50: 1 }, 'different'));
        expect(panel.get(history, changed)).toEqual(new PanelStatisticsCache().get(history, changed));
        expect(panel.get([...history, solve(300)], config)).toEqual(new PanelStatisticsCache().get([...history, solve(300)], config));
    });

    it('reuses the prefix after recent penalties and deletions and restores PBs', () => {
        const session = new SessionStatisticsCache();
        const panel = new PanelStatisticsCache();
        let history = Array.from({ length: 1000 }, (_, index) => solve(index));
        history[998] = { ...history[998], time: 1 };
        const prePBs = { single: 9000, AVERAGE_100: 12000 };
        let previous = session.get(history, config, prePBs, 'session');
        panel.get(history, config);
        for (const change of [
            (items: Solve[]) => items.map((item, index) => index === 998 ? { ...item, penalty: Penalty.PLUS_TWO } : item),
            (items: Solve[]) => items.map((item, index) => index === 998 ? { ...item, penalty: Penalty.DNF } : item),
            (items: Solve[]) => items.map((item, index) => index === 998 ? { ...item, penalty: Penalty.DNS } : item),
            (items: Solve[]) => items.map((item, index) => index === 998 ? { ...item, penalty: Penalty.NONE } : item),
            (items: Solve[]) => items.filter((_, index) => index !== 998),
            (items: Solve[]) => items.slice(0, -1),
            (items: Solve[]) => [...items, { ...solve(1001), time: 2 }],
            (items: Solve[]) => items.filter((_, index) => index !== items.length - 3 && index !== items.length - 1),
            (_items: Solve[]) => [],
            (_items: Solve[]) => [solve(1002)],
        ]) {
            const nextHistory = change(history);
            let prefix = 0;
            while (prefix < history.length && prefix < nextHistory.length && history[prefix] === nextHistory[prefix]) prefix++;
            const calculate = vi.spyOn(math, 'calculateSolveStats');
            const values = vi.spyOn(math, 'getCurrentStatValue');
            const next = session.get(nextHistory, config, prePBs, 'session');
            expect(calculate).toHaveBeenCalledTimes(nextHistory.length - prefix);
            calculate.mockRestore();
            values.mockClear();
            const rows = panel.get(nextHistory, config);
            expect(values.mock.calls.length).toBeLessThanOrEqual((nextHistory.length - prefix + 1) * config.length);
            values.mockRestore();
            const fresh = new SessionStatisticsCache();
            expect(next).toEqual(fresh.get(nextHistory, config, prePBs, 'session'));
            expect(session.bestSingle).toBe(fresh.bestSingle);
            for (let index = 0; index < prefix; index++) expect(next[next.length - 1 - index]).toBe(previous[previous.length - 1 - index]);
            rows.forEach((row, index) => {
                expect(row.current).toEqual(math.getCurrentStatValue(config[index], nextHistory));
                expect(row.best).toEqual(math.getBestStatValue(config[index], nextHistory).best);
            });
            history = nextHistory;
            previous = next;
        }
    });

    it('bounds next-solve searches to the requested window, including size one', () => {
        const history = Array.from({ length: 50000 }, (_, index) => solve(index));
        for (const size of [1, 25, 100]) {
            const stat = { id: 'mean', type: StatType.MEAN, size };
            expect(math.calculateNextSolveTarget(stat, history, 15000)).toEqual(math.calculateNextSolveTarget(stat, history.slice(-size), 15000));
        }
    });
});
