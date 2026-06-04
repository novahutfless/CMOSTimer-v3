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
		// End with U
		moves.push('U' + (Math.random() > 0.5 ? "'" : ''));
	}
	return moves;
};
