import { pick, rand } from './helpers';

const FTO_MOVES = ['U', 'L', 'F', 'R', 'BR', 'B', 'BL', 'D'];
const SUFFIXES = ['', "'"];

const moveAxis = (move: string): string => move.replace(/'/g, '');

export const generateFTO = (length = 30): string[] => {
	const moves: string[] = [];
	let lastAxis = '';

	while (moves.length < length) {
		const base = FTO_MOVES[rand(FTO_MOVES.length)];
		if (moveAxis(base) === lastAxis) continue;
		moves.push(base + pick(SUFFIXES));
		lastAxis = base;
	}

	return moves;
};
