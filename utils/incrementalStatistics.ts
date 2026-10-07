import { ComputedSolve, Penalty, Solve, StatConfig, StatType } from '../types';
import { DNF_VALUE } from './constants';
import { calculateSolveStats, getBestStatValue, getCurrentStatValue, getSolveTime } from './math';

// Immutable solve references let us distinguish appends from edits, deletion,
// reordering and remote replacement. Those changes rebuild the cache.
const isAppend = (previous: Solve[], next: Solve[]): boolean =>
    next.length >= previous.length && previous.every((solve, index) => solve === next[index]);

export class SessionStatisticsCache {
    private history: Solve[] = [];
    private computed: ComputedSolve[] = [];
    private bests = new Map<string, number>();
    private key = '';
    bestSingle = Infinity;
    private successes = 0;
    private attempts = 0;

    get(history: Solve[], config: StatConfig[], prePBs?: Record<string, number>, sessionId = ''): ComputedSolve[] {
        const key = JSON.stringify([sessionId, config, prePBs]);
        if (key !== this.key || !isAppend(this.history, history)) {
            this.history = [];
            this.computed = [];
            this.bestSingle = Infinity;
            this.successes = 0;
            this.attempts = 0;
            this.bests = new Map(Object.entries(prePBs || {}));
            this.key = key;
        }
        const next = this.computed;
        for (let index = this.history.length; index < history.length; index++) {
            const solve = history[index];
            const time = getSolveTime(solve);
            if (time !== null && Number.isFinite(time)) this.bestSingle = Math.min(this.bestSingle, time);
            if (solve.penalty !== Penalty.DNS) {
                this.attempts++;
                if (solve.penalty !== Penalty.DNF) this.successes++;
            }
            const historicalPBs: Record<string, boolean> = {};
            for (const stat of config) {
                // A zero-sized success rate means the whole session.
                const size = stat.type === StatType.SINGLE || stat.type === StatType.FMC_SINGLE ? 1 : stat.size;
                const window = size === 0 ? [] : history.slice(Math.max(0, index + 1 - size), index + 1);
                const value = stat.type === StatType.SUCCESS_RATE && size === 0
                    ? (this.attempts ? this.successes / this.attempts : 0) : getCurrentStatValue(stat, window);
                if (value === null || value === DNF_VALUE) continue;
                const genericKey = `${stat.type}_${stat.size}`;
                const higher = stat.type === StatType.SUCCESS_RATE;
                const best = this.bests.get(stat.id) ?? this.bests.get(genericKey) ?? (higher ? -Infinity : Infinity);
                if (higher ? value >= best : value <= best) {
                    historicalPBs[stat.id] = true;
                    this.bests.set(stat.id, value);
                    this.bests.set(genericKey, value);
                }
            }
            next.push({ ...solve, stats: calculateSolveStats(solve, history.slice(Math.max(0, index - 11), index)), historicalPBs });
        }
        this.history = history;
        this.computed = next;
        return next.slice().reverse();
    }
}

type Best = ReturnType<typeof getBestStatValue>;

export class PanelStatisticsCache {
    private history: Solve[] = [];
    private bests = new Map<string, Best>();

    get(history: Solve[], config: StatConfig[]): { current: number | null; best: number | null }[] {
        const append = isAppend(this.history, history);
        if (!append) this.bests.clear();
        const rows = config.map(stat => {
            const key = JSON.stringify(stat);
            let result = this.bests.get(key);
            if (!result) {
                result = getBestStatValue(stat, history);
            } else {
                for (let index = this.history.length; index < history.length; index++) {
                    if (stat.size === 0 || index + 1 < stat.size) continue;
                    const size = stat.type === StatType.SINGLE || stat.type === StatType.FMC_SINGLE ? 1 : stat.size;
                    const window = history.slice(Math.max(0, index + 1 - size), index + 1);
                    const value = getCurrentStatValue(stat, window);
                    if (value === null || value === DNF_VALUE) continue;
                    if (result.best === null || (stat.type === StatType.SUCCESS_RATE ? value > result.best : value < result.best)) {
                        result = { best: value, bestWindow: window };
                    }
                }
            }
            this.bests.set(key, result);
            return { current: getCurrentStatValue(stat, history), best: result.best };
        });
        // Drop removed configurations: otherwise re-adding one would reuse a stale best.
        const keys = new Set(config.map(stat => JSON.stringify(stat)));
        for (const key of this.bests.keys()) if (!keys.has(key)) this.bests.delete(key);
        this.history = history;
        return rows;
    }
}
