import { PuzzleType } from '../types';
import { NxNPuzzle, NxNState } from './puzzles/nxn';
import { PyraminxPuzzle, PyraState } from './puzzles/pyraminx';
import { SkewbPuzzle, SkewbState } from './puzzles/skewb';
import { ClockPuzzle, ClockState } from './puzzles/clock';
import { Square1Puzzle, Square1State } from './puzzles/square1';
import { MegaminxPuzzle, MegaminxState } from './puzzles/megaminx';
import { FTOPuzzle, FTOState } from './puzzles/fto';

const parseSquare1Moves = (scramble: string | string[]): string[] => {
	if (Array.isArray(scramble)) return scramble.flat(Infinity).filter(m => typeof m === 'string' && m.trim().length > 0) as string[];

	const moves: string[] = [];
	const pattern = /\((-?\d+)\s*,\s*(-?\d+)\)|\//g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(scramble)) !== null) {
		moves.push(match[0] === '/' ? '/' : `(${match[1]},${match[2]})`);
	}
	return moves;
};

export const getScrambleState = (scramble: string | string[], type: PuzzleType): ClockState | PyraState | NxNState | SkewbState | Square1State | MegaminxState | FTOState | null => {
	if (type === PuzzleType.NO_VISUAL) return null;
    
	const moves = type === PuzzleType.SQUARE1
		? parseSquare1Moves(scramble)
		: (Array.isArray(scramble) ? scramble : (scramble ? scramble.trim().split(/\s+/) : []))
			.flat(Infinity)
			.filter(m => typeof m === 'string' && m.trim().length > 0) as string[];

	if (type === PuzzleType.CLOCK) {
		const state = ClockPuzzle.getInitialState();
		moves.forEach(m => ClockPuzzle.applyMove(state, m));
		return state;
	}
    
	if (type === PuzzleType.PYRAMINX) {
		const state = PyraminxPuzzle.getInitialState();
		moves.forEach(m => PyraminxPuzzle.applyMove(state, m));
		return state;
	}

	if (type === PuzzleType.SKEWB) {
		const state = SkewbPuzzle.getInitialState();
		moves.forEach(m => SkewbPuzzle.applyMove(state, m));
		return state;
	}

	if (type === PuzzleType.SQUARE1) {
		const state = Square1Puzzle.getInitialState();
		moves.forEach(m => Square1Puzzle.applyMove(state, m));
		return state;
	}

	if (type === PuzzleType.MEGAMINX) {
		const state = MegaminxPuzzle.getInitialState();
		moves.forEach(m => MegaminxPuzzle.applyMove(state, m));
		return state;
	}

	if (type === PuzzleType.FTO) {
		const state = FTOPuzzle.getInitialState();
		moves.forEach(m => FTOPuzzle.applyMove(state, m));
		return state;
	}

	// Cuboids Logic
	// Generalized handler
	// Extract dimensions from type string e.g. "3x3x4"
	const dimMatch = type.match(/^(\d+)x(\d+)x(\d+)$/);
	if (dimMatch) {
		const w = parseInt(dimMatch[1]);
		const d = parseInt(dimMatch[2]);
		const h = parseInt(dimMatch[3]);
		const size = Math.max(w, d, h);
        
		const state = NxNPuzzle.getInitialState(size);
		// For visual alignment (Top-Left), we don't need offset in logic if we just treat 0..W-1 as valid.
		moves.forEach(m => NxNPuzzle.applyCuboidMove(state, m, w, h, d, size));
		return state;
	}

	// Standard NxN Fallback
	const size = type === PuzzleType.TWO ? 2 : type === PuzzleType.FOUR ? 4 : type === PuzzleType.FIVE ? 5 : type === PuzzleType.SIX ? 6 : type === PuzzleType.SEVEN ? 7 : 3;
	const state = NxNPuzzle.getInitialState(size);
	moves.forEach(m => NxNPuzzle.applyMove(state, m, size));
	return state;
};
