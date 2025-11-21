

import { PuzzleType } from '../types';
import { NxNPuzzle } from './puzzles/nxn';
import { PyraminxPuzzle } from './puzzles/pyraminx';
import { SkewbPuzzle } from './puzzles/skewb';
import { ClockPuzzle } from './puzzles/clock';

export const getScrambleState = (scramble: string | string[], type: PuzzleType) => {
    if (type === PuzzleType.NO_VISUAL) return null;
    
    const rawMoves = Array.isArray(scramble) ? scramble : (scramble ? scramble.trim().split(/\s+/) : []);
    // Ensure flat array of strings
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

    // NxN
    const size = type === PuzzleType.TWO ? 2 : type === PuzzleType.FOUR ? 4 : type === PuzzleType.FIVE ? 5 : type === PuzzleType.SIX ? 6 : type === PuzzleType.SEVEN ? 7 : 3;
    const state = NxNPuzzle.getInitialState(size);
    moves.forEach(m => NxNPuzzle.applyMove(state, m, size));
    return state;
};