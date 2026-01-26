import { describe, it, expect } from 'vitest';
import { getScrambleState } from '../../utils/cube';
import { PuzzleType } from '../../types';
import { NxNPuzzle } from '../../utils/puzzles/nxn';
import { PyraminxPuzzle } from '../../utils/puzzles/pyraminx';

describe('Cube Utils', () => {
	it('returns null for no-visual puzzles', () => {
		expect(getScrambleState('R U', PuzzleType.NO_VISUAL)).toBeNull();
	});

	it('returns initial state for empty scramble', () => {
		const state = getScrambleState('', PuzzleType.THREE);
		const initial = NxNPuzzle.getInitialState(3);
		expect(state).toEqual(initial);
	});

	it('applies moves for pyraminx scrambles', () => {
		const initial = PyraminxPuzzle.getInitialState();
		const state = getScrambleState('U', PuzzleType.PYRAMINX);
		expect(state).not.toEqual(initial);
	});
});
