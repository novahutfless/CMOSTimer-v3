import { MultiBlindAttemptData } from '../types';
import { PuzzleType } from '../types';
import { NxNPuzzle } from './puzzles/nxn';

export const parseFmcMoves = (solution: string): string[] => solution
	.replace(/\([^)]*\)/g, ' ')
	.replace(/\/[^/]*\//g, ' ')
	.trim()
	.split(/\s+/)
	.filter(Boolean);

/** Counts an FMC solution while ignoring free-form annotations in (...) or /.../. */
export const countFmcMoves = (solution: string): number => {
	return parseFmcMoves(solution).length;
};

export type FmcValidation = 'SOLVED' | 'NOT_SOLVED' | 'UNSUPPORTED' | 'INVALID';

export const validateFmcSolution = (scramble: string[], solution: string, puzzleType: PuzzleType): FmcValidation => {
	const sizeMatch = puzzleType.match(/^(\d+)x\1$/);
	const size = puzzleType === PuzzleType.THREE ? 3 : sizeMatch ? Number(sizeMatch[1]) : null;
	if (!size) return 'UNSUPPORTED';
	const moves = parseFmcMoves(solution);
	if (moves.some(move => !/^(?:\d+)?[URFDLBMESxyz](?:w)?(?:2|'|2')?$/.test(move))) return 'INVALID';
	try {
		const state = NxNPuzzle.getInitialState(size);
		[...scramble, ...moves].forEach(move => NxNPuzzle.applyMove(state, move, size));
		return NxNPuzzle.isSolved(state) ? 'SOLVED' : 'NOT_SOLVED';
	} catch {
		return 'INVALID';
	}
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
