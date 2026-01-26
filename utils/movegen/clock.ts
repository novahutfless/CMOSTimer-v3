import { rand } from './helpers';

export const generateClock = (variant: 'wca' | 'no0' | 'pre2025' = 'wca'): string[] => {
	const moves: string[] = [];
	
	const addMove = (type: string): void => {
		const turn = rand(12) - 5; // -5 to 6
		const suffix = turn >= 0 ? `${turn}+` : `${Math.abs(turn)}-`;
		if (turn === 0 && variant === 'no0') return;
		moves.push(`${type}${suffix}`);
	};

	const seq1 = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'];
	seq1.forEach(m => addMove(m));
	moves.push('y2');
	const seq2 = ['U', 'R', 'D', 'L', 'ALL'];
	seq2.forEach(m => addMove(m));

	if (variant === 'pre2025') {
		const pins = ['UR', 'DR', 'DL', 'UL'];
		pins.forEach(p => {
			if (Math.random() > 0.5) moves.push(p);
		});
	}
	
	return moves;
};
