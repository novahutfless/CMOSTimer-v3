import { rand, pick } from './helpers';

export const generatePyraminx = (): string[] => {
	const moves: string[] = [];
	const core = ['U', 'L', 'R', 'B'];
	const tips = ['u', 'l', 'r', 'b'];
	const suffixes = ['', "'"];
		
	let last = -1;
	for (let i = 0; i < 11; i++) {
		let idx;
		do idx = rand(4); while (idx === last);
		last = idx;
		moves.push(core[idx] + pick(suffixes));
	}
		
	tips.forEach(t => {
		if (Math.random() > 0.5) 
			moves.push(t + pick(suffixes));
		
	});
	return moves;
};
