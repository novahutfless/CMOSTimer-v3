import { rand, pick } from './helpers';

export const generateNxN = (size: number, length: number): string[] => {
	const moves: string[] = [];
	const faceMap = [['R', 'L'], ['U', 'D'], ['F', 'B']];
	const suffixes = ['', "'", '2'];
	
	// For 4x4+, wide moves
	const isBig = size > 3;

	let lastAxis = -1;
	let secondLastAxis = -1;

	for (let i = 0; i < length; i++) {
		let axis;
		do 
			axis = rand(3);
		while (axis === lastAxis || axis === secondLastAxis); // Simplistic axis exclusion

		if (axis !== lastAxis) 
			secondLastAxis = -1;
		else 
			secondLastAxis = lastAxis;
		
		lastAxis = axis;

		const faceIdx = rand(2);
		const face = faceMap[axis][faceIdx];
		const suffix = pick(suffixes);
		
		let move = face;
		if (isBig) {
			const wide = Math.random();
			// Probability of wide move
			if (wide > 0.5) {
				// Determine depth
				// For 4x4: only 2 layers (Rw) or 1 layer (R)
				// For 5x5: 2 layers (Rw). 
				// For 6x6+: 3Rw, etc.
				const maxDepth = Math.floor(size / 2);
				// Pick a depth between 2 and maxDepth
				// Weight lower depths higher? Uniform for now.
				const depth = Math.floor(Math.random() * (maxDepth - 1)) + 2;
				
				if (depth === 2) 
					move += 'w';
				else 
					move = `${depth}${move}w`;
				
			}
		}
		
		moves.push(move + suffix);
	}
	return moves;
};
