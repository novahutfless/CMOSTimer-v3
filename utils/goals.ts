import { Goal, GoalFrequency, GoalScope, GoalType, Solve, ComputedSolve } from '../types';
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

const filterSolves = <T extends Solve>(solves: T[], goal: Goal, currentSessionId: string): T[] => {
	// 1. Scope Filter
	const filtered = solves;
	if (goal.scope === GoalScope.SESSION) {
		// For session scope, we assume 'solves' passed in are already potentially from that session, 
		// or we rely on caller. 
		// BUT, the store might pass ALL solves.
		// Actually, 'ComputedSolve' list in App is usually the CURRENT session.
		// If goal.sessionId !== currentSessionId, we can't compute it easily without full session list.
		// For now, we assume the widget handles data fetching or we only show current session goals if in session mode.
		// Simpler: The App passes solves relevant to the context.
		// If GoalScope is SESSION, we double check match if we have session info on solve.
		// However, Solve object doesn't have sessionId stored directly in model currently (it's in Session.solveIds).
		// We will rely on the caller to pass the correct list of solves for the goal's target session.
	}

	// 2. Time Filter
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

	return filtered.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
};

export const calculateGoalProgress = (goal: Goal, solves: ComputedSolve[]): GoalProgress => {
	const relevantSolves = filterSolves(solves, goal, ''); // Session filtering done by caller typically

	let current = 0;
	const target = goal.targetValue;

	if (goal.type === GoalType.SOLVE_COUNT) {
		// Count non-DNS? Usually just count solves.
		current = relevantSolves.length;
	} else if (goal.type === GoalType.TIME_SPENT) {
		// Sum of time (ms)
		current = relevantSolves.reduce((acc, s) => {
			const t = getSolveTime(s);
			return acc + (t && t > 0 ? t : 0);
		}, 0);
	} else if (goal.type === GoalType.STAT_TARGET) {
		// Target is a specific time (e.g. sub-10s avg).
		// Current is the BEST value in the period? Or Current value?
		// Usually "Get a sub-X avg" implies Best.
		// BUT, if frequency is "Daily", it means "Get sub-X TODAY".
        
		if (!goal.statConfig) return { current: 0, target: 0, percent: 0, label: 'Error', isCompleted: false };

		// We need to find the best value for this stat in the relevant solves.
		// Since relevantSolves is filtered by date, we look for best in that set.
		// Note: calculating AO100 requires 100 solves. 
		// If we filtered by "Today", and did 5 solves, we can't calc AO100.
		// We need the context of previous solves if the window overlaps?
		// No, usually goals reset. "Do a sub-10 ao5 today".
        
		let best = Infinity;
		const statId = goal.statConfig.id;
        
		// We use the pre-computed stats on the solves if available match
		// Or we re-calc? ComputedSolves have stats, but maybe not the custom one in goal.
		// Assuming standard stats or matching ID.
		// If goal uses a custom stat config not in standard list, we might not have it computed.
		// For simplicity, we only support Single, Mo3, Ao5, Ao12, Ao50, Ao100 which are usually computed or easily computable.
        
		// Actually, ComputedSolve has `stats` object (mean3, avg5, avg12). 
		// For 50/100, we check `historicalPBs`? No, that's boolean.
        
		// Fallback: Recalculate if needed, or just scan solves if it's Single.
		// If it's a big average, we might need to re-run calc over the window.
        
		// Simplification for MVP: Only support Single, Mo3, Ao5, Ao12.
        
		relevantSolves.forEach(s => {
			let val: number | null = null;
			if (goal.statConfig!.type === 'SINGLE') val = getSolveTime(s);
			else if (goal.statConfig!.type === 'MEAN' && goal.statConfig!.size === 3) val = s.stats.mean3;
			else if (goal.statConfig!.type === 'AVERAGE' && goal.statConfig!.size === 5) val = s.stats.avg5;
			else if (goal.statConfig!.type === 'AVERAGE' && goal.statConfig!.size === 12) val = s.stats.avg12;
            
			if (val !== null && val !== DNF_VALUE && val < best) 
				best = val;
            
		});
        
		current = best === Infinity ? 0 : best;
		// For Stat Target, Progress is inverse. Lower is better.
		// If Current <= Target, 100%.
		// If Current > Target, how close?
		// e.g. Target 10. Current 20. 0%? 
		// e.g. Target 10. Current 11. Close.
		// We can clamp.
	}

	let percent = 0;
	if (goal.type === GoalType.STAT_TARGET) 
		if (current === 0) percent = 0;
		else if (current <= target) percent = 100;
		else 
		// Logic: scaled. If current is 2x target, 0%?
		// percent = target / current * 100? 
		// 10 / 20 = 50%. 10 / 11 = 90%. 10 / 10 = 100%.
			percent = (target / current) * 100;
        
	else 
		percent = Math.min(100, (current / target) * 100);
    

	return {
		current,
		target,
		percent,
		label: '',
		isCompleted: percent >= 100
	};
};
