import { Goal, GoalFrequency, GoalType, Penalty, Solve, ComputedSolve } from '../types';
import { getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear } from './date';
import { getSolveTime } from './math';
import { DNF_VALUE } from './constants';

export interface GoalProgress {
    current: number;
    target: number;
    percent: number;
    label: string;
    isCompleted: boolean;
}

const filterSolves = <T extends Solve>(solves: T[], goal: Goal): T[] => {
	// Scope is resolved by the caller because solves reference their session through Session.solveIds,
	// not through a sessionId field on Solve. This function only applies the goal's time and speed filters.
	const now = Date.now();
	let startTime = 0;
	let endTime = Infinity;

	switch (goal.frequency) {
	case GoalFrequency.DAILY: startTime = getStartOfDay(now); break;
	case GoalFrequency.WEEKLY: startTime = getStartOfWeek(now); break;
	case GoalFrequency.MONTHLY: startTime = getStartOfMonth(now); break;
	case GoalFrequency.YEARLY: startTime = getStartOfYear(now); break;
	case GoalFrequency.BY_DATE: 
		startTime = goal.createdAt; 
		endTime = goal.deadline || Infinity; 
		break;
	case GoalFrequency.INFINITE: startTime = 0; break;
	}

	const timeWindowFiltered = solves.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);

	if (goal.maxSolveTimeMs === undefined || goal.maxSolveTimeMs <= 0) return timeWindowFiltered;

	return timeWindowFiltered.filter(s => {
		const t = getSolveTime(s);
		return t !== null && t < goal.maxSolveTimeMs!;
	});
};

export const calculateGoalProgress = (goal: Goal, solves: ComputedSolve[]): GoalProgress => {
	const relevantSolves = filterSolves(solves, goal);

	let current = 0;
	const target = goal.targetValue;

	if (goal.type === GoalType.SOLVE_COUNT) {
		// DNS attempts do not count toward solve-count goals.
		current = relevantSolves.filter(s => s.penalty !== Penalty.DNS).length;
	} else if (goal.type === GoalType.TIME_SPENT) {
		// Sum of time (ms)
		current = relevantSolves.reduce((acc, s) => {
			const t = getSolveTime(s);
			return acc + (t && t > 0 ? t : 0);
		}, 0);
	} else if (goal.type === GoalType.STAT_TARGET) {
		// Evaluate the best supported statistic value within the filtered period.
        
		if (!goal.statConfig)
			return { current: 0, target: 0, percent: 0, label: 'Error', isCompleted: false };

		let best = Infinity;
        
		relevantSolves.forEach(s => {
			let val: number | null = null;
			if (goal.statConfig!.type === 'SINGLE')
				val = getSolveTime(s);
			else if (goal.statConfig!.type === 'MEAN' && goal.statConfig!.size === 3)
				val = s.stats.mean3;
			else if (goal.statConfig!.type === 'AVERAGE' && goal.statConfig!.size === 5)
				val = s.stats.avg5;
			else if (goal.statConfig!.type === 'AVERAGE' && goal.statConfig!.size === 12)
				val = s.stats.avg12;
            
			if (val !== null && val !== DNF_VALUE && val < best) 
				best = val;
		});
        
		current = best === Infinity ? 0 : best;
	}

	let percent = 0;
	if (goal.type === GoalType.STAT_TARGET) {
		if (current === 0) percent = 0;
		else if (current <= target) percent = 100;
		else percent = (target / current) * 100;
	} else {
		percent = Math.min(100, (current / target) * 100);
	}

	return {
		current,
		target,
		percent,
		label: '',
		isCompleted: percent >= 100
	};
};
