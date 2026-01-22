import { PuzzleType } from '../types';
import { NxNPuzzle, NxNState } from './puzzles/nxn';
import { PyraminxPuzzle, PyraState } from './puzzles/pyraminx';
import { SkewbPuzzle, SkewbState } from './puzzles/skewb';
import { ClockPuzzle, ClockState } from './puzzles/clock';

export const getScrambleState = (scramble: string | string[], type: PuzzleType): ClockState | PyraState | NxNState | SkewbState => {
	if (type === PuzzleType.NO_VISUAL) return null;
    
	const rawMoves = Array.isArray(scramble) ? scramble : (scramble ? scramble.trim().split(/\s+/) : []);
	const moves = rawMoves.flat(Infinity).filter(m => typeof m === 'string' && m.trim().length > 0) as string[];

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