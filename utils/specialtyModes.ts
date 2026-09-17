import { MultiBlindAttemptData } from '../types';

/** Counts an FMC solution while ignoring free-form annotations in (...) or /.../. */
export const countFmcMoves = (solution: string): number => {
	const movesOnly = solution.replace(/\([^)]*\)/g, ' ').replace(/\/[^/]*\//g, ' ').trim();
	return movesOnly ? movesOnly.split(/\s+/).length : 0;
};

/** WCA multi-blind points: solved cubes minus unsolved cubes. */
export const getMultiBlindPoints = (solved: number, attempted: number): number => 2 * solved - attempted;

export const buildMultiBlindAttempt = (
	attempted: number,
	solved: number,
	mistakes: string,
	memoSplitIndex?: number
): MultiBlindAttemptData => ({
	attempted: Math.max(2, Math.round(attempted)),
	solved: Math.max(0, Math.min(Math.round(solved), Math.max(2, Math.round(attempted)))),
	mistakeTypes: mistakes.split(',').map(value => value.trim()).filter(Boolean),
	...(memoSplitIndex === undefined ? {} : { memoSplitIndex })
});
