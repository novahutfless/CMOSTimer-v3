import { pick } from './helpers';

export const generateCuboid = (w: number, h: number, d: number, length = 20): string[] => {
	const movesSide = ['R2', 'L2', 'F2', 'B2'];
	
	interface HMove {
		name: string;
		cutIndex: number;
	}
	
	const movesH: HMove[] = [];
	const suffixes = ['', "'", '2'];

	// Top half
	for (let i = 1; i <= Math.ceil((h - 1) / 2); i++) {
		let base = '';
		if (i === 1) base = 'U';
		else if (i === 2) base = 'Uw';
		else base = `${i}Uw`;
		suffixes.forEach(s => movesH.push({ name: base + s, cutIndex: i }));
	}

	// Bottom half
	for (let i = 1; i <= Math.floor((h - 1) / 2); i++) {
		let base = '';
		if (i === 1) base = 'D';
		else if (i === 2) base = 'Dw';
		else base = `${i}Dw`;
		suffixes.forEach(s => movesH.push({ name: base + s, cutIndex: h - i }));
	}

	const result: string[] = [];
	let lastGroup = -1; // 0 = Side, 1 = H-Axis

	for (let i = 0; i < length; i++) 
		if (lastGroup === 1) {
			const m = pick(movesSide);
			if (result.length > 0 && result[result.length - 1].substring(0, 2) === m.substring(0, 2)) {
				i--; continue; 
			}
			result.push(m);
			lastGroup = 0;
		} else {
			const m = pick(movesH);
			result.push(m.name);
			lastGroup = 1;
		}
	
	
	return result;
};
