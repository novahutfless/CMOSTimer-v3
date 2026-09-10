import { pick } from './helpers';

export type CustomScrambleConfig = { moves: string; opposites: string; length: number };

export const generateCustom = (config?: CustomScrambleConfig): string[] => {
	const cfg = config || { moves: 'U D R L F B', opposites: 'U-D R-L F-B', length: 20 };
	const rawPool = cfg.moves.split(/[\s,]+/).filter(x => x);
	if (rawPool.length === 0) return [];

	const parseMove = (m: string): { raw: string, base: string } => {
		const base = m.replace(/['2w]/g, '');
		return { raw: m, base };
	};

	const pool = rawPool.map(parseMove);
	const oppositesMap = new Map<string, string>(); 
	
	if (cfg.opposites) 
		cfg.opposites.split(/[\s,]+/).forEach(pair => {
			const [a, b] = pair.split('-');
			if (a && b) {
				oppositesMap.set(a, b);
				oppositesMap.set(b, a);
			}
		});
	

	const result: string[] = [];
	let lastBase = '';
	let secondLastBase = '';

	for (let i = 0; i < cfg.length; i++) {
		let candidate;
		let isValid = false;
		let attempts = 0;

		while (!isValid && attempts < 50) {
			candidate = pick(pool);
			attempts++;
			
			if (candidate.base === lastBase) continue;

			const isOpposite = oppositesMap.get(candidate.base) === lastBase;
			if (isOpposite && candidate.base === secondLastBase) continue;

			isValid = true;
		}

		if (candidate && isValid) {
			result.push(candidate.raw);
			secondLastBase = lastBase;
			lastBase = candidate.base;
		}
	}
	return result;
};
