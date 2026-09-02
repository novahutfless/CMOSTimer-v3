import { PuzzleType, ScramblerCategory } from '../types';
import { generateClock } from './movegen/clock';
import { generateCuboid } from './movegen/cuboid';
import { generateCustom, CustomScrambleConfig } from './movegen/custom';
import { generateMegaminx } from './movegen/megaminx';
import { generateNxN } from './movegen/nxn';
import { generateOptimalTwoByTwo, generateRandomStateCuboid, generateTwoByTwo } from './movegen/optimalSmallPuzzles';
import { generatePyraminx } from './movegen/pyraminx';
import { generateSkewb } from './movegen/skewb';
import { generateSquare1 } from './movegen/square1';
import { generateFTO } from './movegen/fto';
import { generateFewestMovesScramble, generateThreeByThreeRandomState, threeByThreeRandomStateMasks } from './movegen/threeByThreeRandomState';

export interface ScramblerDefinition {
	id: string;
	name: string;
	category: ScramblerCategory | string;
	visualizer: PuzzleType | string;
	randomState?: boolean;
	generate: (length?: number, customConfig?: unknown) => string[];
}

const BUILTIN_SCRAMBLERS: ScramblerDefinition[] = [
	{ id: '333', name: '3x3x3', category: ScramblerCategory.WCA, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState() },
	{ id: '222', name: '2x2x2', category: ScramblerCategory.WCA, visualizer: PuzzleType.TWO, randomState: true, generate: () => generateTwoByTwo() },
	{ id: '222_optimal', name: '2x2x2 Optimal', category: ScramblerCategory.WCA, visualizer: PuzzleType.TWO, randomState: true, generate: () => generateOptimalTwoByTwo() },
	{ id: '444', name: '4x4x4', category: ScramblerCategory.WCA, visualizer: PuzzleType.FOUR, generate: () => generateNxN(4, 40) },
	{ id: '555', name: '5x5x5', category: ScramblerCategory.WCA, visualizer: PuzzleType.FIVE, generate: () => generateNxN(5, 60) },
	{ id: '666', name: '6x6x6', category: ScramblerCategory.WCA, visualizer: PuzzleType.SIX, generate: () => generateNxN(6, 80) },
	{ id: '777', name: '7x7x7', category: ScramblerCategory.WCA, visualizer: PuzzleType.SEVEN, generate: () => generateNxN(7, 100) },
	{ id: 'pyram', name: 'Pyraminx', category: ScramblerCategory.WCA, visualizer: PuzzleType.PYRAMINX, randomState: true, generate: () => generatePyraminx() },
	{ id: 'minx', name: 'Megaminx', category: ScramblerCategory.WCA, visualizer: PuzzleType.MEGAMINX, generate: () => generateMegaminx() },
	{ id: 'skewb', name: 'Skewb', category: ScramblerCategory.WCA, visualizer: PuzzleType.SKEWB, randomState: true, generate: () => generateSkewb() },
	{ id: 'sq1', name: 'Square-1', category: ScramblerCategory.WCA, visualizer: PuzzleType.SQUARE1, generate: () => generateSquare1() },
	{ id: 'clock', name: 'Clock', category: ScramblerCategory.WCA, visualizer: PuzzleType.CLOCK, randomState: true, generate: () => generateClock('wca') },
	{ id: '888', name: '8x8x8', category: ScramblerCategory.NXN, visualizer: '8x8x8', generate: () => generateNxN(8, 120) },
	{ id: '999', name: '9x9x9', category: ScramblerCategory.NXN, visualizer: '9x9x9', generate: () => generateNxN(9, 140) },
	{ id: '101010', name: '10x10x10', category: ScramblerCategory.NXN, visualizer: '10x10x10', generate: () => generateNxN(10, 160) },
	{ id: '111111', name: '11x11x11', category: ScramblerCategory.NXN, visualizer: '11x11x11', generate: () => generateNxN(11, 180) },
	{ id: 'fto', name: 'Face-Turning Octahedron', category: ScramblerCategory.OTHER, visualizer: PuzzleType.FTO, randomState: true, generate: () => generateFTO() },
	{ id: '333fm', name: '3x3x3 Fewest Moves', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateFewestMovesScramble() },
	{ id: 'edges', name: 'Edges', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.edges) },
	{ id: 'corners', name: 'Corners', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.corners) },
	{ id: 'll', name: 'Last Layer', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.lastLayer) },
	{ id: 'f2l', name: 'F2L', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.f2l) },
	{ id: 'zbll', name: 'ZBLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.zbll) },
	{ id: 'zzll', name: 'ZZLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.zzll) },
	{ id: 'zbls', name: 'ZBLS', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.f2l) },
	{ id: 'ttll', name: 'TTLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.ttll) },
	{ id: 'eols', name: 'EOLS', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.eols) },
	{ id: 'wvls', name: 'WVLS', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.f2l) },
	{ id: 'vls', name: 'VLS', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.vls) },
	{ id: 'lse', name: 'LSE', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.lse) },
	{ id: 'cmll', name: 'CMLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.cmll) },
	{ id: 'cll', name: 'CLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.cll) },
	{ id: 'coll', name: 'COLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.coll) },
	{ id: 'ell', name: 'ELL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.ell) },
	{ id: 'pll', name: 'PLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.pll) },
	{ id: 'oll', name: 'OLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.lastLayer) },
	{ id: '2gll', name: '2GLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.twoGll) },
	{ id: 'sbrx', name: 'Roux Second Block', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.rouxSecondBlock) },
	{ id: 'mt3qb', name: 'Mehta 3QB', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaThreeQuarterBlocks) },
	{ id: 'mteole', name: 'Mehta EOLE', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaTdr) },
	{ id: 'mttdr', name: 'Mehta TDR', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaTdr) },
	{ id: 'mt6cp', name: 'Mehta 6CP', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaSixCornerPerm) },
	{ id: 'mtl5ep', name: 'Mehta L5EP', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaLastFiveEdgePerm) },
	{ id: 'mtcdrll', name: 'Mehta CDRLL', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.mehtaCdrll) },
	{ id: 'easyc', name: 'Easy Cross', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.eocross) },
	{ id: 'easyxc', name: 'Easy XCross', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.f2l) },
	{ id: 'eoline', name: 'EO Line', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.eoline) },
	{ id: 'eocross', name: 'EO Cross', category: ScramblerCategory.THREE_BY_THREE, visualizer: PuzzleType.THREE, randomState: true, generate: () => generateThreeByThreeRandomState(threeByThreeRandomStateMasks.eocross) },
	{ id: 'no_scramble', name: 'No Scramble', category: ScramblerCategory.OTHER, visualizer: PuzzleType.NO_VISUAL, generate: () => [] },
	{ id: '223', name: '2x2x3', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_THREE, randomState: true, generate: () => generateRandomStateCuboid(2, 3, 2, 15) },
	{ id: '332', name: '3x3x2', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_TWO, randomState: true, generate: () => generateRandomStateCuboid(3, 2, 3, 15) },
	{ id: '334', name: '3x3x4', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.THREE_BY_THREE_BY_FOUR, generate: () => generateCuboid(3, 4, 3, 25) },
	{ id: '224', name: '2x2x4', category: ScramblerCategory.CUBOIDS, visualizer: PuzzleType.TWO_BY_TWO_BY_FOUR, randomState: true, generate: () => generateRandomStateCuboid(2, 4, 2, 20) },
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
	{ id: '2gen_ru', name: '<R, U>', category: ScramblerCategory.SUBSETS, visualizer: PuzzleType.THREE, generate: () => generateCustom({ moves: 'R R\' R2 U U\' U2', opposites: 'R-U', length: 25 }) },
	{ id: '2gen_lu', name: '<L, U>', category: ScramblerCategory.SUBSETS, visualizer: PuzzleType.THREE, generate: () => generateCustom({ moves: 'L L\' L2 U U\' U2', opposites: 'L-U', length: 25 }) },
	{ id: '3gen_ruf', name: '<R, U, F>', category: ScramblerCategory.SUBSETS, visualizer: PuzzleType.THREE, generate: () => generateCustom({ moves: 'R R\' R2 U U\' U2 F F\' F2', opposites: '', length: 30 }) },
	{ id: 'custom', name: 'User Defined', category: ScramblerCategory.CUSTOM, visualizer: PuzzleType.THREE, generate: (_len, config) => generateCustom(config as CustomScrambleConfig | undefined) }
];

const pluginScramblersByOwner = new Map<string, Map<string, ScramblerDefinition>>();

const getAllScramblers = (): ScramblerDefinition[] =>
	[
		...BUILTIN_SCRAMBLERS,
		...Array.from(pluginScramblersByOwner.values()).flatMap(ownerMap => Array.from(ownerMap.values()))
	];

export const registerPluginScrambler = (ownerId: string, definition: ScramblerDefinition): void => {
	const normalizedId = definition.id.trim();
	if (!normalizedId) {
		throw new Error('Scrambler id must be a non-empty string.');
	}
	if (BUILTIN_SCRAMBLERS.some(scrambler => scrambler.id === normalizedId)) {
		throw new Error(`Cannot override built-in scrambler "${normalizedId}".`);
	}

	for (const [otherOwnerId, ownerScramblers] of pluginScramblersByOwner.entries()) {
		if (otherOwnerId !== ownerId && ownerScramblers.has(normalizedId)) {
			throw new Error(`Cannot register scrambler "${normalizedId}" for plugin "${ownerId}"; it is already owned by "${otherOwnerId}".`);
		}
	}

	const ownerScramblers = pluginScramblersByOwner.get(ownerId) || new Map<string, ScramblerDefinition>();
	ownerScramblers.set(normalizedId, definition);
	pluginScramblersByOwner.set(ownerId, ownerScramblers);
};

export const unregisterPluginScramblers = (ownerId: string): void => {
	pluginScramblersByOwner.delete(ownerId);
};

export const getScrambler = (id: string): ScramblerDefinition => {
	const scramblers = getAllScramblers();
	return scramblers.find(scrambler => scrambler.id === id) || BUILTIN_SCRAMBLERS[0];
};

export const generateScramble = (scramblerIds: string | string[], customConfig?: unknown): string[][] => {
	const ids = Array.isArray(scramblerIds) ? scramblerIds : [scramblerIds];
	return ids.map(id => {
		const scrambler = getScrambler(id);
		if (scrambler.id === 'custom' && customConfig) {
			return scrambler.generate(0, customConfig);
		}

		return scrambler.generate();
	});
};

export const shouldInitializeScramble = (stateLoaded: boolean, historyLength: number, scramblerIds?: string[]): boolean =>
	stateLoaded && historyLength === 0 && !!scramblerIds && scramblerIds.length > 0;

export const getScramblersByCategory = (): Record<string, ScramblerDefinition[]> => {
	const grouped: Record<string, ScramblerDefinition[]> = {};
	Object.values(ScramblerCategory).forEach(category => {
		grouped[category] = [];
	});
	getAllScramblers().forEach(scrambler => {
		if (!grouped[scrambler.category]) grouped[scrambler.category] = [];
		grouped[scrambler.category].push(scrambler);
	});
	return grouped;
};
