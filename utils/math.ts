import { Solve, Penalty, SolveStats, StatConfig, StatType } from '../types';
import { DNF_VALUE } from './constants';

const PENALTY_ADDITIONS: Record<string, number> = {
	[Penalty.PLUS_TWO]: 2000,
	[Penalty.PLUS_FOUR]: 4000,
	[Penalty.PLUS_SIX]: 6000,
	[Penalty.PLUS_EIGHT]: 8000,
	[Penalty.PLUS_TEN]: 10000,
	[Penalty.PLUS_TWELVE]: 12000,
	[Penalty.PLUS_FOURTEEN]: 14000,
	[Penalty.PLUS_SIXTEEN]: 16000,
};

export const getSolveTime = (solve: Solve): number | null => {
	if (solve.penalty === Penalty.DNF || solve.penalty === Penalty.DNS) return null;
	const added = PENALTY_ADDITIONS[solve.penalty] || 0;
	return solve.time + added;
};

export const calculateMean = (solves: Solve[], size: number): number | null => {
	if (solves.length < size) return null;
	const subset = solves.slice(solves.length - size);
	let sum = 0;
	for (const s of subset) {
		const t = getSolveTime(s);
		if (t === null) return DNF_VALUE;
		sum += t;
	}
	return sum / size;
};

export const calculateAverage = (solves: Solve[], size: number): number | null => {
	if (!Number.isInteger(size) || size <= 0) return DNF_VALUE;
	if (solves.length < size) return null;
	const subset = solves.slice(solves.length - size);
	const dnfs = subset.filter(s => s.penalty === Penalty.DNF || s.penalty === Penalty.DNS).length;
	const numDiscard = Math.ceil(size * 0.05); 
	if (dnfs > numDiscard) return DNF_VALUE; 
  
	const times = subset.map(s => {
		const t = getSolveTime(s);
		return t === null ? Infinity : t;
	});
  
	times.sort((a, b) => a - b);
	const validTimes = times.slice(numDiscard, times.length - numDiscard);
	if (validTimes.length === 0) return DNF_VALUE;
	const sum = validTimes.reduce((acc, val) => acc + val, 0);
	const average = sum / validTimes.length;
	return Number.isFinite(average) ? average : DNF_VALUE;
};

export const calculateStandardDeviation = (solves: Solve[], size: number): number | null => {
	if (solves.length < size || size === 0) return null;
	const subset = solves.slice(solves.length - size);
	const validTimes: number[] = [];
	for(const s of subset) {
		const t = getSolveTime(s);
		if(t === null) return DNF_VALUE; 
		validTimes.push(t);
	}
	const mean = validTimes.reduce((a, b) => a + b, 0) / size;
	const variance = validTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / size;
	return Math.sqrt(variance);
};

export const calculateSuccessRate = (solves: Solve[], size: number): number | null => {
	if (solves.length < size && size !== 0) return null;
	let subset = size === 0 ? solves : solves.slice(solves.length - size);
	subset = subset.filter(s => s.penalty !== Penalty.DNS);
	if (subset.length === 0) return 0;
	const successes = subset.filter(s => s.penalty !== Penalty.DNF).length;
	return successes / subset.length;
};

export const calculateWeightedAverage = (solves: Solve[], size: number): number | null => {
	if (solves.length < size) return null;
	const subset = solves.slice(solves.length - size);
	let numerator = 0;
	let denominator = 0;
	for (let i = 0; i < size; i++) {
		const s = subset[i];
		const t = getSolveTime(s);
		if (t === null) return DNF_VALUE; 
		const weight = i + 1; 
		numerator += t * weight;
		denominator += weight;
	}
	if (denominator === 0) return null;
	return numerator / denominator;
};

export const calculateStatValue = (window: Solve[], stat: StatConfig): number | null => {
	const fmcValues = stat.type === StatType.FMC_MEAN || stat.type === StatType.FMC_AVERAGE
		? window.slice(window.length - stat.size).map(solve => solve.fmc?.moveCount) : [];
	if (stat.type === StatType.FMC_SINGLE) return window[window.length - 1]?.fmc?.moveCount ?? null;
	if (stat.type === StatType.FMC_MEAN) {
		if (fmcValues.length < stat.size || fmcValues.some(value => value === undefined)) return null;
		return fmcValues.reduce<number>((sum, value) => sum + value!, 0) / stat.size;
	}
	if (stat.type === StatType.FMC_AVERAGE) {
		if (fmcValues.length < stat.size || fmcValues.some(value => value === undefined)) return null;
		const sorted = (fmcValues as number[]).sort((a, b) => a - b);
		const discard = Math.ceil(stat.size * 0.05);
		const kept = sorted.slice(discard, sorted.length - discard);
		return kept.length ? kept.reduce((sum, value) => sum + value, 0) / kept.length : null;
	}
	switch(stat.type) {
	case StatType.SINGLE: {
		if (window.length === 0) return null;
		const t = getSolveTime(window[0]);
		return t === null ? DNF_VALUE : t;
	}
	case StatType.MEAN: return calculateMean(window, stat.size);
	case StatType.AVERAGE: return calculateAverage(window, stat.size);
	case StatType.STD_DEV: return calculateStandardDeviation(window, stat.size);
	case StatType.SUCCESS_RATE: return calculateSuccessRate(window, stat.size);
	case StatType.WEIGHTED_AVG: return calculateWeightedAverage(window, stat.size);
	default: return null;
	}
};

export type NextSolveTarget = number | null | 'IMPOSSIBLE' | 'ANY';

/** Slowest whole-millisecond next solve that produces a value strictly below target. */
export const calculateNextSolveTarget = (stat: StatConfig, history: Solve[], target: number | null): NextSolveTarget => {
	if (target === null || stat.type === StatType.SUCCESS_RATE || stat.size <= 0) return null;
	if (target === DNF_VALUE && stat.type === StatType.SINGLE) return 'ANY';
	if (stat.type === StatType.SINGLE) return target > 0 ? Math.ceil(target) - 1 : 'IMPOSSIBLE';
	if (history.length < stat.size - 1) return null;
	const candidate = (time: number): Solve => ({
		id: '__next_solve_target__', timestamp: Number.MAX_SAFE_INTEGER, time,
		inspectionTime: -1, scramble: [], scramblerId: [], penalty: Penalty.NONE
	});
	const trailing = history.slice(Math.max(0, history.length - stat.size + 1));
	const improves = (time: number): boolean => {
		const value = calculateStatValue([...trailing, candidate(time)], stat);
		return value !== null && value !== DNF_VALUE && (target === DNF_VALUE || value < target);
	};
	if (!improves(0)) return 'IMPOSSIBLE';
	const upper = Math.floor(Number.MAX_SAFE_INTEGER / 4);
	if (improves(upper)) return 'ANY';
	let low = 0;
	let high = upper;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (improves(middle)) low = middle;
		else high = middle - 1;
	}
	return low;
};

export const getCurrentStatValue = (stat: StatConfig, history: Solve[]): number | null => {
	if (history.length === 0) return null;
	if (stat.type === StatType.SINGLE || stat.type === StatType.FMC_SINGLE) {
		const newest = history[history.length - 1];
		return newest ? calculateStatValue([newest], stat) : null;
	}
	if (stat.type === StatType.SUCCESS_RATE && stat.size === 0) 
		return calculateSuccessRate(history, 0);
    
	return calculateStatValue(history, stat);
};

export const getBestStatValue = (stat: StatConfig, history: Solve[]): { best: number | null, bestWindow: Solve[] | null } => {
	const reqSize = stat.size || 1;
	if (history.length < reqSize || stat.size === 0) 
		return { best: null, bestWindow: null };
    
	const isHigherBetter = stat.type === StatType.SUCCESS_RATE;
	let best = Infinity;
	let bestMax = -Infinity;
	let bestWindow: Solve[] | null = null;

	if (stat.type === StatType.SINGLE || stat.type === StatType.FMC_SINGLE) {
		for (const s of history) {
			const t = stat.type === StatType.FMC_SINGLE ? s.fmc?.moveCount ?? DNF_VALUE : getSolveTime(s) ?? DNF_VALUE;
			if (t !== DNF_VALUE && t < best) {
				best = t;
				bestWindow = [s];
			}
		}
	} else {
		for (let i = 0; i <= history.length - stat.size; i++) {
			const window = history.slice(i, i + stat.size);
			const val = calculateStatValue(window, stat);
			if (val === null || val === DNF_VALUE) continue;

			if (isHigherBetter) {
				if (val > bestMax) {
					bestMax = val;
					bestWindow = window;
				}
			} else if (val < best) {
				best = val;
				bestWindow = window;
			}
		}
	}

	if (!bestWindow) return { best: null, bestWindow: null };
	return { best: isHigherBetter ? bestMax : best, bestWindow };
};

export const calculateSolveStats = (newSolve: Solve, pastSolves: Solve[]): SolveStats => {
	const context = [...pastSolves.slice(-11), newSolve];
	return {
		mean3: calculateMean(context, 3),
		avg5: calculateAverage(context, 5),
		avg12: calculateAverage(context, 12)
	};
};

export const recalculateSessionStats = (solves: Solve[]): (Solve & { stats: SolveStats })[] => {
	const sorted = [...solves].sort((a, b) => a.timestamp - b.timestamp);
	const result: (Solve & { stats: SolveStats })[] = [];
	for(const solve of sorted) 
		result.push({
			...solve,
			stats: calculateSolveStats(solve, result)
		});
    
	return result;
};
