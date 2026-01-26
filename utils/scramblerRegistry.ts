import { PuzzleType, ScramblerCategory } from '../types';
import { generateClock } from './movegen/clock';
import { generateCuboid } from './movegen/cuboid';
import { generateCustom, CustomScrambleConfig } from './movegen/custom';
import { generateMegaminx } from './movegen/megaminx';
import { generateNxN } from './movegen/nxn';
import { generatePyraminx } from './movegen/pyraminx';
import { generateSkewb } from './movegen/skewb';
import { generateSquare1 } from './movegen/square1';

export interface ScramblerDefinition {
	id: string;
	name: string;
	category: ScramblerCategory | string;
	visualizer: PuzzleType | string;
	generate: (length?: number, customConfig?: unknown) => string[];
}

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
		generate: () => generateCustom({ moves: 'R R\' R2 U U\' U2', opposites: 'R-U', length: 25 }) 
	},
	{ 
		id: '2gen_lu', 
		name: '<L, U>', 
		category: ScramblerCategory.SUBSETS, 
		visualizer: PuzzleType.THREE, 
		generate: () => generateCustom({ moves: 'L L\' L2 U U\' U2', opposites: 'L-U', length: 25 }) 
	},
	{ 
		id: '3gen_ruf', 
		name: '<R, U, F>', 
		category: ScramblerCategory.SUBSETS, 
		visualizer: PuzzleType.THREE, 
		generate: () => generateCustom({ moves: 'R R\' R2 U U\' U2 F F\' F2', opposites: '', length: 30 }) 
	},
	// Custom
	{ 
		id: 'custom', 
		name: 'User Defined', 
		category: ScramblerCategory.CUSTOM, 
		visualizer: PuzzleType.THREE, 
		generate: (_len, config) => generateCustom(config as CustomScrambleConfig | undefined)
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

export const generateScramble = (scramblerIds: string | string[], customConfig?: unknown): string[][] => {
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
