import { describe, expect, it } from 'vitest';
import {
	applyMoves,
	defaultCanFollow,
	hasMinimumMoveCount,
	 invertMove,
	invertSequence,
	isStateWithinMoveCount,
	padSolution,
	randomWalk,
	solvePuzzle,
	type MovePuzzle
} from '../../utils/solver';

type State = { value: number };

const puzzle: MovePuzzle<State> = {
	moves: ['+', '-'],
	getInitialState: () => ({ value: 0 }),
	applyMove: (state, move) => {
		state.value += move === '+' ? 1 : -1;
	},
	invertMove: (move) => move === '+' ? '-' : '+',
	canFollow: () => true
};

describe('Solver Utils', () => {
	it('inverts individual moves and reverses sequences', () => {
		expect(invertMove('R')).toBe("R'");
		expect(invertMove("R'")).toBe('R');
		expect(invertMove('R2')).toBe('R2');
		expect(invertSequence(['R', 'U', "F'"])).toEqual(['F', "U'", "R'"]);
	});

	it('enforces the default face-following rule', () => {
		expect(defaultCanFollow(undefined, 'R')).toBe(true);
		expect(defaultCanFollow('R', 'R2')).toBe(false);
		expect(defaultCanFollow('R', 'U')).toBe(true);
	});

	it('solves a state within the requested depth without mutating it', () => {
		const initial = { value: 1 };
		const solution = solvePuzzle(puzzle, initial, { maxDepth: 1 });

		expect(solution).toEqual(['-']);
		expect(initial).toEqual({ value: 1 });
		expect(solvePuzzle(puzzle, initial, { maxDepth: 0 })).toBeNull();
		expect(solvePuzzle(puzzle, { value: 0 })).toEqual([]);
	});

	it('reports move-count boundaries', () => {
		const state = { value: 2 };
		expect(isStateWithinMoveCount(puzzle, state, 2)).toBe(true);
		expect(isStateWithinMoveCount(puzzle, state, 1)).toBe(false);
		expect(hasMinimumMoveCount(puzzle, state, 2)).toBe(true);
	});

	it('applies moves and pads approximate solutions with canceling pairs', () => {
		expect(applyMoves(puzzle, ['+', '+', '-'])).toEqual({ value: 1 });
		expect(padSolution(['+'], puzzle.moves, 5)).toHaveLength(5);
	});

	it('creates a random walk that respects the puzzle move rule', () => {
		const walked = randomWalk(puzzle, 6);
		expect(walked.moves).toHaveLength(6);
		expect(walked.state).toEqual(applyMoves(puzzle, walked.moves));
	});
});
