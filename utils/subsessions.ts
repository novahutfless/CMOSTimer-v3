import { Solve, SolveMap } from '../types';
import { getSolveTime } from './math';

export const SUBSESSION_GAP_MS = 30 * 60 * 1000;

export interface Subsession<TSolve extends Solve = Solve> {
	id: string;
	solves: TSolve[];
	startedAt: number;
	averageTime: number | null;
}

const hasTimestampStrictlyBetween = (timestamps: readonly number[], from: number, to: number): boolean => {
	let low = 0;
	let high = timestamps.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		if (timestamps[middle]! <= from) low = middle + 1;
		else high = middle;
	}
	return low < timestamps.length && timestamps[low]! < to;
};

export const buildSubsessionEndIndexes = <TSolve extends Solve>(chronologicalSolves: readonly TSolve[], allSolveTimestamps: readonly number[], startIndex = 0): number[] => {
	if (chronologicalSolves.length === 0 || startIndex >= chronologicalSolves.length) return [];
	const ends: number[] = [];
	for (let index = startIndex + 1; index < chronologicalSolves.length; index++) {
		const previous = chronologicalSolves[index - 1]!;
		const current = chronologicalSolves[index]!;
		if (current.timestamp - previous.timestamp > SUBSESSION_GAP_MS || hasTimestampStrictlyBetween(allSolveTimestamps, previous.timestamp, current.timestamp)) {
			ends.push(index - 1);
		}
	}
	ends.push(chronologicalSolves.length - 1);
	return ends;
};

export const buildSubsessionsFromEndIndexes = <TSolve extends Solve>(chronologicalSolves: readonly TSolve[], endIndexes: readonly number[]): Subsession<TSolve>[] => {
	let start = 0;
	return endIndexes.map(end => {
		const solves = chronologicalSolves.slice(start, end + 1);
		start = end + 1;
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

/**
 * Splits a session into chronological blocks. A solve in any session between
 * two current-session solves ends the block, even when their timestamps are
 * less than 30 minutes apart.
 */
export const buildSubsessions = <TSolve extends Solve>(sessionSolves: TSolve[], allSolves: SolveMap): Subsession<TSolve>[] => {
	const chronological = [...sessionSolves].sort((left, right) => left.timestamp - right.timestamp);
	const allTimestamps = Object.values(allSolves).map(solve => solve.timestamp).sort((left, right) => left - right);
	return buildSubsessionsFromEndIndexes(chronological, buildSubsessionEndIndexes(chronological, allTimestamps));
};
