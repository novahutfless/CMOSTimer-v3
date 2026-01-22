import { ComputedSolve, Penalty, StatConfig, StatType } from '../../types';
import { DNF_VALUE, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage } from '../../utils';

export const parseTimeExpression = (expr: string): ((t: number, p: Penalty) => boolean) | null => {
	const clean = expr.trim();
	if (!clean) return null;

	if (clean.includes('&')) {
		const parts = clean.split('&').map(parseTimeExpression);
		return (t, p) => parts.every(fn => fn ? fn(t, p) : true);
	}
	if (clean.includes('|')) {
		const parts = clean.split('|').map(parseTimeExpression);
		return (t, p) => parts.some(fn => fn ? fn(t, p) : false);
	}

	if (clean.toUpperCase() === 'DNF') return (_, p) => p === Penalty.DNF;
	if (clean.toUpperCase() === 'DNS') return (_, p) => p === Penalty.DNS;

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

	return (time: number, penalty: Penalty) => {
		if (penalty === Penalty.DNF || penalty === Penalty.DNS) return false;
		const realTime = time + (penalty === Penalty.PLUS_TWO ? 2000 : 0);
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
		if (solve.penalty === Penalty.DNF) return DNF_VALUE;
		return solve.time + (solve.penalty === Penalty.PLUS_TWO ? 2000 : 0);
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
