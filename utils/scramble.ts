

import { PuzzleType, ScramblerCategory } from '../types';

export interface ScramblerDefinition {
  id: string;
  name: string;
  category: ScramblerCategory | string;
  visualizer: PuzzleType | string;
  generate: (length?: number, customConfig?: any) => string[];
}

// --- Helper Functions ---
const rand = (n: number): number => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];

// General NxN Generator
const generateNxN = (size: number, length: number): string[] => {
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

const generatePyraminx = (): string[] => {
	const moves = [];
	const core = ['U', 'L', 'R', 'B'];
	const tips = ['u', 'l', 'r', 'b'];
	const suffixes = ['', "'"];
    
	let last = -1;
	for(let i=0; i<11; i++) {
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

const generateSkewb = (): string[] => {
	const moves = [];
	const faces = ['R', 'L', 'U', 'B']; // Fixed Corner notation
	const suffixes = ['', "'"];
	let last = -1;
    
	for(let i=0; i<10; i++) {
		let idx;
		do idx = rand(4); while (idx === last);
		last = idx;
		moves.push(faces[idx] + pick(suffixes));
	}
	return moves;
};

const generateClock = (variant: 'wca' | 'no0' | 'pre2025' = 'wca'): string[] => {
	const moves: string[] = [];
    
	const addMove = (type: string): void => {
		const turn = rand(12) - 5; // -5 to 6
		const suffix = turn >= 0 ? `${turn}+` : `${Math.abs(turn)}-`;
		if (turn === 0 && variant === 'no0') return;
		moves.push(`${type}${suffix}`);
	};

	const seq1 = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
	seq1.forEach(m => addMove(m));
	moves.push("y2");
	const seq2 = ["U", "R", "D", "L", "ALL"];
	seq2.forEach(m => addMove(m));

	if (variant === 'pre2025') {
		const pins = ["UR", "DR", "DL", "UL"];
		pins.forEach(p => {
			if (Math.random() > 0.5) moves.push(p);
		});
	}
    
	return moves;
};

const generateMegaminx = (): string[] => {
	const lines = 7;
	const moves: string[] = [];
	const suffixes = ["++", "--"];
    
	for (let i = 0; i < lines; i++) {
		// 5 pairs of R D
		for (let j = 0; j < 5; j++) {
			moves.push("R" + pick(suffixes));
			moves.push("D" + pick(suffixes));
		}
		// End with U
		moves.push("U" + (Math.random() > 0.5 ? "'" : ""));
	}
	return moves;
};

const generateSquare1 = (): string[] => {
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
		moves.push("/");
	}
	return moves;
};

// --- Robust Custom / Subset Generator ---
const generateCustom = (config?: { moves: string, opposites: string, length: number }): string[] => {
	const cfg = config || { moves: "U D R L F B", opposites: "U-D R-L F-B", length: 20 };
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
	let lastBase = "";
	let secondLastBase = "";

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

		if (candidate) {
			result.push(candidate.raw);
			secondLastBase = lastBase;
			lastBase = candidate.base;
		}
	}
	return result;
};

// --- Cuboid Generator (Generalized) ---
const generateCuboid = (w: number, h: number, d: number, length = 20): string[] => {
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
    		if (result.length > 0 && result[result.length-1].substring(0,2) === m.substring(0,2)) {
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

// --- Scrambler Registry ---
let SCRAMBLERS: ScramblerDefinition[] = [
	// WCA
	{ id: '333', name: '3x3x3', category: ScramblerCategory.WCA, visualizer: PuzzleType.THREE, generate: () => generateNxN(3, 24) },
	{ id: '222', name: '2x2x2', category: ScramblerCategory.WCA, visualizer: PuzzleType.TWO, generate: () => generateNxN(2, 11) },
	{ id: '444', name: '4x4x4', category: ScramblerCategory.WCA, visualizer: PuzzleType.FOUR, generate: () => generateNxN(4, 40) },
	{ id: '555', name: '5x5x5', category: ScramblerCategory.WCA, visualizer: PuzzleType.FIVE, generate: () => generateNxN(5, 60) },
	{ id: '666', name: '6x6x6', category: ScramblerCategory.WCA, visualizer: PuzzleType.SIX, generate: () => generateNxN(6, 80) },
	{ id: '777', name: '7x7x7', category: ScramblerCategory.WCA, visualizer: PuzzleType.SEVEN, generate: () => generateNxN(7, 100) },
	{ id: 'pyram', name: 'Pyraminx', category: ScramblerCategory.WCA, visualizer: PuzzleType.PYRAMINX, generate: () => generatePyraminx() },
	{ id: 'minx', name: 'Megaminx', category: ScramblerCategory.WCA, visualizer: PuzzleType.NO_VISUAL, generate: () => generateMegaminx() },
	{ id: 'skewb', name: 'Skewb', category: ScramblerCategory.WCA, visualizer: PuzzleType.SKEWB, generate: () => generateSkewb() },
	{ id: 'sq1', name: 'Square-1', category: ScramblerCategory.WCA, visualizer: PuzzleType.NO_VISUAL, generate: () => generateSquare1() },
	{ id: 'clock', name: 'Clock', category: ScramblerCategory.WCA, visualizer: PuzzleType.CLOCK, generate: () => generateClock('wca') },
    
	// Big Cubes (NxNxN)
	{ id: '888', name: '8x8x8', category: ScramblerCategory.NXN, visualizer: '8x8x8', generate: () => generateNxN(8, 120) },
	{ id: '999', name: '9x9x9', category: ScramblerCategory.NXN, visualizer: '9x9x9', generate: () => generateNxN(9, 140) },
	{ id: '101010', name: '10x10x10', category: ScramblerCategory.NXN, visualizer: '10x10x10', generate: () => generateNxN(10, 160) },
	{ id: '111111', name: '11x11x11', category: ScramblerCategory.NXN, visualizer: '11x11x11', generate: () => generateNxN(11, 180) },

	// Other
	{ id: 'no_scramble', name: 'No Scramble', category: ScramblerCategory.OTHER, visualizer: PuzzleType.NO_VISUAL, generate: () => [] },

	// Cuboids
	{ id: '223', name: '2x2x3', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_THREE, generate: () => generateCuboid(2, 3, 2, 15) },
	{ id: '332', name: '3x3x2', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_TWO, generate: () => generateCuboid(3, 2, 3, 15) },
	{ id: '334', name: '3x3x4', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_FOUR, generate: () => generateCuboid(3, 4, 3, 25) },

	// Cuboids
	{ id: '224', name: '2x2x4', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_FOUR, generate: () => generateCuboid(2, 4, 2, 20) },
	{ id: '225', name: '2x2x5', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_FIVE, generate: () => generateCuboid(2, 5, 2, 20) },
	{ id: '226', name: '2x2x6', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_SIX, generate: () => generateCuboid(2, 6, 2, 25) },
	{ id: '227', name: '2x2x7', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_SEVEN, generate: () => generateCuboid(2, 7, 2, 25) },

	{ id: '335', name: '3x3x5', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_FIVE, generate: () => generateCuboid(3, 5, 3, 25) },
	{ id: '336', name: '3x3x6', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_SIX, generate: () => generateCuboid(3, 6, 3, 30) },
	{ id: '337', name: '3x3x7', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_SEVEN, generate: () => generateCuboid(3, 7, 3, 35) },
	{ id: '338', name: '3x3x8', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_EIGHT, generate: () => generateCuboid(3, 8, 3, 40) },

	{ id: '442', name: '4x4x2', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.FOUR_BY_FOUR_BY_TWO, generate: () => generateCuboid(4, 2, 4, 20) },
	{ id: '443', name: '4x4x3', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.FOUR_BY_FOUR_BY_THREE, generate: () => generateCuboid(4, 3, 4, 25) },
	{ id: '445', name: '4x4x5', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.FOUR_BY_FOUR_BY_FIVE, generate: () => generateCuboid(4, 5, 4, 35) },
	{ id: '446', name: '4x4x6', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.FOUR_BY_FOUR_BY_SIX, generate: () => generateCuboid(4, 6, 4, 40) },

	{ id: '554', name: '5x5x4', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.FIVE_BY_FIVE_BY_FOUR, generate: () => generateCuboid(5, 4, 5, 35) },

	// Subsets
	{ 
		id: '2gen_ru', 
		name: '<R, U>', 
		category: ScramblerCategory.SUBSETS, 
		visualizer: PuzzleType.THREE, 
		generate: () => generateCustom({ moves: "R R' R2 U U' U2", opposites: "R-U", length: 25 }) 
	},
	{ 
		id: '2gen_lu', 
		name: '<L, U>', 
		category: ScramblerCategory.SUBSETS, 
		visualizer: PuzzleType.THREE, 
		generate: () => generateCustom({ moves: "L L' L2 U U' U2", opposites: "L-U", length: 25 }) 
	},
	{ 
		id: '3gen_ruf', 
		name: '<R, U, F>', 
		category: ScramblerCategory.SUBSETS, 
		visualizer: PuzzleType.THREE, 
		generate: () => generateCustom({ moves: "R R' R2 U U' U2 F F' F2", opposites: "", length: 30 }) 
	},
	// Custom
	{ 
		id: 'custom', 
		name: 'User Defined', 
		category: ScramblerCategory.CUSTOM, 
		visualizer: PuzzleType.THREE, 
		generate: (_len, config) => generateCustom(config)
	}
];

export { SCRAMBLERS };

export const registerScrambler = (definition: ScramblerDefinition): void => {
	SCRAMBLERS = SCRAMBLERS.filter(s => s.id !== definition.id);
	SCRAMBLERS.push(definition);
};

export const getScrambler = (id: string): ScramblerDefinition => {
	return SCRAMBLERS.find(s => s.id === id) || SCRAMBLERS[0];
};

export const generateScramble = (scramblerIds: string | string[], customConfig?: any): string[][] => {
	const ids = Array.isArray(scramblerIds) ? scramblerIds : [scramblerIds];
	return ids.map(id => {
		const scrambler = getScrambler(id);
		if (scrambler.id === 'custom' && customConfig) 
			return scrambler.generate(0, customConfig);
        
		return scrambler.generate();
	});
};

export const getScramblersByCategory = (): Record<string, ScramblerDefinition[]> => {
	const grouped: Record<string, ScramblerDefinition[]> = {};
	Object.values(ScramblerCategory).forEach(c => grouped[c] = []);
	SCRAMBLERS.forEach(s => {
		if (!grouped[s.category]) grouped[s.category] = [];
		grouped[s.category].push(s);
	});
	return grouped;
};
