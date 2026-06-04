import { ComputedSolve, Penalty, Solve, StatConfig, StatType } from '../../types';
import { DNF_VALUE, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage, getSolveTime } from '../../utils';

type SolveFilterInput = Pick<Solve, 'id' | 'time' | 'penalty'>;

const PENALTY_SECONDS_FILTER_MAP: Record<string, Penalty> = {
	'+2': Penalty.PLUS_TWO,
	'+4': Penalty.PLUS_FOUR,
	'+6': Penalty.PLUS_SIX,
	'+8': Penalty.PLUS_EIGHT,
	'+10': Penalty.PLUS_TEN,
	'+12': Penalty.PLUS_TWELVE,
	'+14': Penalty.PLUS_FOURTEEN,
	'+16': Penalty.PLUS_SIXTEEN
};

export const parseTimeExpression = (expr: string): ((solve: SolveFilterInput) => boolean) | null => {
	const clean = expr.trim();
	if (!clean) return null;

	const idMatch = clean.match(/^ID\[(.*)\]$/i);
	if (idMatch) {
		const raw = idMatch[1].trim();
		if (!raw) return () => false;
		const ids = new Set(raw.split(',').map(x => x.trim()).filter(Boolean));
		return (solve) => ids.has(String(solve.id));
	}

	// ID[...] is a standalone selector and cannot be combined with operators.
	if (/ID\[/i.test(clean)) return null;

	if (clean.includes('&')) {
		const parts = clean.split('&').map(parseTimeExpression);
		return (solve) => parts.every(fn => fn ? fn(solve) : true);
	}
	if (clean.includes('|')) {
		const parts = clean.split('|').map(parseTimeExpression);
		return (solve) => parts.some(fn => fn ? fn(solve) : false);
	}

	if (clean.toUpperCase() === 'DNF') return (solve) => solve.penalty === Penalty.DNF;
	if (clean.toUpperCase() === 'DNS') return (solve) => solve.penalty === Penalty.DNS;

	const penaltyFilter = PENALTY_SECONDS_FILTER_MAP[clean];
	if (penaltyFilter !== undefined) return (solve) => solve.penalty === penaltyFilter;

	let operator = '==';
	let numStr = clean;
	if (clean.startsWith('<=')) {
		operator = '<='; numStr = clean.substring(2);
	} else if (clean.startsWith('>=')) {
		operator = '>='; numStr = clean.substring(2);
	} else if (clean.startsWith('<')) {
		operator = '<'; numStr = clean.substring(1);
	} else if (clean.startsWith('>')) {
		operator = '>'; numStr = clean.substring(1);
	}

	const numVal = parseFloat(numStr);
	if (isNaN(numVal)) return null;

	const msVal = numVal < 1000 ? numVal * 1000 : numVal;

	return (solve: SolveFilterInput) => {
		const realTime = getSolveTime(solve as Solve);
		if (realTime === null) return false;
		switch(operator) {
		case '<': return realTime < msVal;
		case '>': return realTime > msVal;
		case '<=': return realTime <= msVal;
		case '>=': return realTime >= msVal;
		default: return Math.abs(realTime - msVal) < 10;
		}
	};
};

export const getStatValue = (solve: ComputedSolve, solves: ComputedSolve[], index: number, stat: StatConfig): number | null => {
	if (stat.type === StatType.SINGLE) {
		const t = getSolveTime(solve);
		return t === null ? DNF_VALUE : t;
	}
	if (stat.type === StatType.MEAN && stat.size === 3) return solve.stats.mean3;
	if (stat.type === StatType.AVERAGE && stat.size === 5) return solve.stats.avg5;
	if (stat.type === StatType.AVERAGE && stat.size === 12) return solve.stats.avg12;

	const endIndex = index + stat.size;
	if (endIndex > solves.length) return null;
	const window = solves.slice(index, endIndex).reverse();

	switch(stat.type) {
	case StatType.MEAN: return calculateMean(window, stat.size);
	case StatType.AVERAGE: return calculateAverage(window, stat.size);
	case StatType.STD_DEV: return calculateStandardDeviation(window, stat.size);
	case StatType.SUCCESS_RATE: return calculateSuccessRate(window, stat.size);
	case StatType.WEIGHTED_AVG: return calculateWeightedAverage(window, stat.size);
	default: return null;
	}
};
