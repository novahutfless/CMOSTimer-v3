import { rand } from './helpers';
import {
	applySquare1Slash,
	applySquare1Tuple,
	cloneSquare1State,
	Square1Puzzle
} from '../puzzles/square1';

const TURN_VALUES = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const getLegalTuples = (state: ReturnType<typeof Square1Puzzle.getInitialState>): Array<[number, number]> => {
	const tuples: Array<[number, number]> = [];

	TURN_VALUES.forEach(top => {
		TURN_VALUES.forEach(bottom => {
			if (top === 0 && bottom === 0) return;
			const next = cloneSquare1State(state);
			if (applySquare1Tuple(next, top, bottom) && applySquare1Slash(next)) tuples.push([top, bottom]);
		});
	});

	return tuples;
};

export const generateSquare1 = (): string[] => {
	const moves: string[] = [];
	const state = Square1Puzzle.getInitialState();
	const length = 12;

	for (let i = 0; i < length; i++) {
		const legalTuples = getLegalTuples(state);
		if (legalTuples.length === 0) break;

		const chosen = legalTuples[rand(legalTuples.length)];

		if (!chosen) break;

		applySquare1Tuple(state, chosen[0], chosen[1]);
		applySquare1Slash(state);
		moves.push(`(${chosen[0]},${chosen[1]})`, '/');
	}

	return moves;
};
