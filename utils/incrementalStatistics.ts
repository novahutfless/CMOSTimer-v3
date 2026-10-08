import { ComputedSolve, Penalty, Solve, StatConfig, StatType } from '../types';
import { DNF_VALUE } from './constants';
import { calculateSolveStats, getCurrentStatValue, getSolveTime } from './math';

// Only statistics at and after the first changed solve can be affected.
const unchangedPrefix = (previous: Solve[], next: Solve[]): number => {
    let index = 0;
    while (index < previous.length && index < next.length && previous[index] === next[index]) index++;
    return index;
};

export class SessionStatisticsCache {
    private history: Solve[] = [];
    private computed: ComputedSolve[] = [];
    private bests = new Map<string, number>();
    private key = '';
    private checkpoints: { bestSingle: number; successes: number; attempts: number; bests: Map<string, number> }[] = [];
    bestSingle = Infinity;
    private successes = 0;
    private attempts = 0;

    get(history: Solve[], config: StatConfig[], prePBs?: Record<string, number>, sessionId = ''): ComputedSolve[] {
        const key = JSON.stringify([sessionId, config, prePBs]);
        if (key !== this.key) {
            this.history = [];
            this.computed = [];
            this.checkpoints = [];
            this.bestSingle = Infinity;
            this.successes = 0;
            this.attempts = 0;
            this.bests = new Map(Object.entries(prePBs || {}));
            this.key = key;
        }
        const start = unchangedPrefix(this.history, history);
        if (start < this.history.length) {
            const checkpoint = this.checkpoints[start - 1];
            this.bestSingle = checkpoint?.bestSingle ?? Infinity;
            this.successes = checkpoint?.successes ?? 0;
            this.attempts = checkpoint?.attempts ?? 0;
            this.bests = new Map(checkpoint?.bests ?? Object.entries(prePBs || {}));
            this.computed.length = start;
            this.checkpoints.length = start;
        }
        const next = this.computed;
        for (let index = start; index < history.length; index++) {
            const solve = history[index];
            const time = getSolveTime(solve);
            if (time !== null && Number.isFinite(time)) this.bestSingle = Math.min(this.bestSingle, time);
            if (solve.penalty !== Penalty.DNS) {
                this.attempts++;
                if (solve.penalty !== Penalty.DNF) this.successes++;
            }
            const historicalPBs: Record<string, boolean> = {};
            let copiedBests = false;
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
                    if (!copiedBests) {
                        this.bests = new Map(this.bests);
                        copiedBests = true;
                    }
                    historicalPBs[stat.id] = true;
                    this.bests.set(stat.id, value);
                    this.bests.set(genericKey, value);
                }
            }
            // Best maps are immutable between PBs, so most checkpoints share one.
            this.checkpoints.push({ bestSingle: this.bestSingle, successes: this.successes, attempts: this.attempts, bests: this.bests });
            next.push({ ...solve, stats: calculateSolveStats(solve, history.slice(Math.max(0, index - 11), index)), historicalPBs });
        }
        this.history = history;
        this.computed = next;
        return next.slice().reverse();
    }
}

export class PanelStatisticsCache {
    private history: Solve[] = [];
    private bests = new Map<string, (number | null)[]>();

    get(history: Solve[], config: StatConfig[]): { current: number | null; best: number | null }[] {
        const start = unchangedPrefix(this.history, history);
        const rows = config.map(stat => {
            const key = JSON.stringify(stat);
            let prefixBests = this.bests.get(key);
            const from = prefixBests ? start : 0;
            if (!prefixBests) prefixBests = [];
            prefixBests.length = from;
            let best = prefixBests[from - 1] ?? null;
            for (let index = from; index < history.length; index++) {
                const single = stat.type === StatType.SINGLE || stat.type === StatType.FMC_SINGLE;
                if (stat.size !== 0 && (single || index + 1 >= stat.size)) {
                    const size = single ? 1 : stat.size;
                    const window = history.slice(Math.max(0, index + 1 - size), index + 1);
                    const value = getCurrentStatValue(stat, window);
                    if (value !== null && value !== DNF_VALUE &&
                        (best === null || (stat.type === StatType.SUCCESS_RATE ? value > best : value < best))) best = value;
                }
                prefixBests.push(best);
            }
            this.bests.set(key, prefixBests);
            return { current: getCurrentStatValue(stat, history), best: stat.size === 0 || history.length < (stat.size || 1) ? null : best };
        });
        // Drop removed configurations: otherwise re-adding one would reuse a stale best.
        const keys = new Set(config.map(stat => JSON.stringify(stat)));
        for (const key of this.bests.keys()) if (!keys.has(key)) this.bests.delete(key);
        this.history = history;
        return rows;
    }
}
