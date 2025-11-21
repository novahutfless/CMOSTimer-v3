
import { Solve, Penalty, SolveStats } from '../types';
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
  const sum = validTimes.reduce((acc, val) => acc + val, 0);
  return sum / validTimes.length;
};

export const calculateStandardDeviation = (solves: Solve[], size: number): number | null => {
  if (solves.length < size) return null;
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
  const subset = size === 0 ? solves : solves.slice(solves.length - size);
  if (subset.length === 0) return 0;
  const successes = subset.filter(s => s.penalty !== Penalty.DNF && s.penalty !== Penalty.DNS).length;
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
  return numerator / denominator;
};

export const calculateSolveStats = (newSolve: Solve, pastSolves: Solve[]): SolveStats => {
    const context = [...pastSolves, newSolve];
    return {
        mean3: calculateMean(context, 3),
        avg5: calculateAverage(context, 5),
        avg12: calculateAverage(context, 12)
    };
};

export const recalculateSessionStats = (solves: Solve[]): Solve[] => {
    const sorted = [...solves].sort((a, b) => a.timestamp - b.timestamp);
    const result: Solve[] = [];
    for(const solve of sorted) {
        result.push({
            ...solve,
            stats: calculateSolveStats(solve, result)
        });
    }
    return result;
};
