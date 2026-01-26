import { rand } from './helpers';

export const generateSquare1 = (): string[] => {
	const moves: string[] = [];
	const length = 12; // Pairs
	
	for (let i = 0; i < length; i++) {
		// x, y between -5 and 6
		const x = rand(12) - 5;
		const y = rand(12) - 5;
		
		// (x,y)
		if (x === 0 && y === 0 && i !== 0) {
			// Skip 0,0 if not forced, though 0,0 / is valid but useless?
			// Usually just retry
			i--; continue;
		}
		moves.push(`(${x}, ${y})`);
		moves.push('/');
	}
	return moves;
};
