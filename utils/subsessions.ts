import { Solve, SolveMap } from '../types';
import { getSolveTime } from './math';

export const SUBSESSION_GAP_MS = 30 * 60 * 1000;

export interface Subsession<TSolve extends Solve = Solve> {
	id: string;
	solves: TSolve[];
	startedAt: number;
	averageTime: number | null;
}

const hasInterruption = (from: number, to: number, allSolves: SolveMap): boolean =>
	Object.values(allSolves).some(solve => solve.timestamp > from && solve.timestamp < to);

/**
 * Splits a session into chronological blocks. A solve in any session between
 * two current-session solves ends the block, even when their timestamps are
 * less than 30 minutes apart.
 */
export const buildSubsessions = <TSolve extends Solve>(sessionSolves: TSolve[], allSolves: SolveMap): Subsession<TSolve>[] => {
	const chronological = [...sessionSolves].sort((left, right) => left.timestamp - right.timestamp);
	const groups: TSolve[][] = [];

	chronological.forEach(solve => {
		const current = groups.at(-1);
		const previous = current?.at(-1);
		const startsNewSubsession = !previous
			|| solve.timestamp - previous.timestamp > SUBSESSION_GAP_MS
			|| hasInterruption(previous.timestamp, solve.timestamp, allSolves);
		if (startsNewSubsession) groups.push([solve]);
		else current!.push(solve);
	});

	return groups.map(solves => {
		const times = solves.map(getSolveTime).filter((time): time is number => time !== null);
		const first = solves[0]!;
		const last = solves.at(-1)!;
		return {
			id: `subsession:${first.id}:${last.id}`,
			solves,
			startedAt: first.timestamp,
			averageTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : null
		};
	});
};
