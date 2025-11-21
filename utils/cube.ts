
import { ScrambleType } from '../types';
import { getInitialStateNxN, applyMoveNxN, NxNState } from './puzzles/nxn';
import { getInitialStatePyra, applyMovePyra, PyraState } from './puzzles/pyraminx';
import { getInitialStateSkewb, applyMoveSkewb, SkewbState } from './puzzles/skewb';
import { getInitialStateClock, applyMoveClock, ClockState } from './puzzles/clock';

export const getScrambleState = (scramble: string | string[], type: ScrambleType) => {
    if (type === ScrambleType.NO_VISUAL) return null;
    
    const moves = Array.isArray(scramble) ? scramble : (scramble ? scramble.trim().split(/\s+/) : []);

    if (type === ScrambleType.CLOCK) {
        const state = getInitialStateClock();
        moves.forEach(m => applyMoveClock(state, m));
        return state;
    }
    
    if (type === ScrambleType.PYRAMINX) {
        const state = getInitialStatePyra();
        moves.forEach(m => applyMovePyra(state, m));
        return state;
    }

    if (type === ScrambleType.SKEWB) {
        const state = getInitialStateSkewb();
        moves.forEach(m => applyMoveSkewb(state, m));
        return state;
    }

    // NxN
    const size = type === ScrambleType.TWO ? 2 : type === ScrambleType.FOUR ? 4 : type === ScrambleType.FIVE ? 5 : type === ScrambleType.SIX ? 6 : type === ScrambleType.SEVEN ? 7 : 3;
    const state = getInitialStateNxN(size);
    moves.forEach(m => applyMoveNxN(state, m, size));
    return state;
};
