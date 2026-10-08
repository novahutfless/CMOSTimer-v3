import { pick } from './helpers';

export const generateMegaminx = (): string[] => {
	const lines = 7;
	const moves: string[] = [];
	const suffixes = ['++', '--'];
	
	for (let i = 0; i < lines; i++) {
		// 5 pairs of R D
		for (let j = 0; j < 5; j++) {
			moves.push('R' + pick(suffixes));
			moves.push('D' + pick(suffixes));
		}
		// Match the U turn to the final D turn in this row.
		moves.push(moves[moves.length - 1] === 'D++' ? 'U' : "U'");
	}
	return moves;
};
