import { rand, pick } from './helpers';

export const generateSkewb = (): string[] => {
	const moves: string[] = [];
	const faces = ['R', 'L', 'U', 'B']; // Fixed Corner notation
	const suffixes = ['', "'"];
	let last = -1;
	
	for (let i = 0; i < 10; i++) {
		let idx;
		do idx = rand(4); while (idx === last);
		last = idx;
		moves.push(faces[idx] + pick(suffixes));
	}
	return moves;
};
