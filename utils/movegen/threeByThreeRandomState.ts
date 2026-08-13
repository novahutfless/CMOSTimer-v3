import * as min2phase from 'min2phase/src/min2phase.js';

type CubieState = {
	cp: number[];
	co: number[];
	ep: number[];
	eo: number[];
};

type StateMask = readonly [edgePermutation: number, edgeOrientation: number, cornerPermutation: number, cornerOrientation: number];

const FULL_RANDOM: StateMask = [0xffffffffffff, 0xffffffffffff, 0xffffffff, 0xffffffff];

const parity = (permutation: readonly number[]): number => {
	let inversions = 0;
	for (let i = 0; i < permutation.length; i++) {
		for (let j = i + 1; j < permutation.length; j++) {
			if (permutation[i] > permutation[j]) inversions++;
		}
	}
	return inversions % 2;
};

const randomIndex = (length: number): number => Math.floor(Math.random() * length);

const parseMask = (mask: number, length: number): number[] => {
	const values: number[] = [];
	for (let index = 0; index < length; index++) {
		const value = Math.floor(mask % 16);
		values.push(value === 15 ? -1 : value);
		mask = Math.floor(mask / 16);
	}
	return values;
};

const fillOrientations = (orientation: number[], base: number): void => {
	let total = 0;
	const unknown = orientation.reduce<number[]>((indexes, value, index) => {
		if (value === -1) indexes.push(index);
		else total += value;
		return indexes;
	}, []);

	unknown.forEach((index, unknownIndex) => {
		orientation[index] = unknownIndex === unknown.length - 1
			? (base - (total % base)) % base
			: randomIndex(base);
		total += orientation[index];
	});
};

const fillPermutation = (permutation: number[], requiredParity: number | null): void => {
	const available = Array.from({ length: permutation.length }, (_, index) => index)
		.filter(value => !permutation.includes(value));
	const unknown = permutation.reduce<number[]>((indexes, value, index) => {
		if (value === -1) indexes.push(index);
		return indexes;
	}, []);

	for (let i = available.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1);
		[available[i], available[j]] = [available[j], available[i]];
	}
	unknown.forEach((index, valueIndex) => {
		permutation[index] = available[valueIndex];
	});

	if (requiredParity !== null && parity(permutation) !== requiredParity && unknown.length >= 2) {
		const first = unknown[unknown.length - 1];
		const second = unknown[unknown.length - 2];
		[permutation[first], permutation[second]] = [permutation[second], permutation[first]];
	}
};

const isSolved = (state: CubieState): boolean =>
	state.cp.every((piece, index) => piece === index && state.co[index] === 0)
	&& state.ep.every((piece, index) => piece === index && state.eo[index] === 0);

const randomStateFromMask = ([edgePermutation, edgeOrientation, cornerPermutation, cornerOrientation]: StateMask): CubieState => {
	for (;;) {
		const state: CubieState = {
			ep: parseMask(edgePermutation, 12),
			eo: parseMask(edgeOrientation, 12),
			cp: parseMask(cornerPermutation, 8),
			co: parseMask(cornerOrientation, 8)
		};

		fillOrientations(state.eo, 2);
		fillOrientations(state.co, 3);
		fillPermutation(state.ep, null);
		fillPermutation(state.cp, parity(state.ep));

		if (!isSolved(state)) return state;
	}
};

/**
 * Generates a legal scramble for a uniformly sampled state matching the supplied
 * cubie constraints. Inverting a sampled state still gives a uniform sample, so
 * min2phase's solution can be displayed directly as the scramble.
 */
export const generateThreeByThreeRandomState = (mask: StateMask = FULL_RANDOM): string[] => {
	const solution = min2phase.solve(randomStateFromMask(mask));
	if (solution.startsWith('Error')) throw new Error(`Unable to generate 3x3 random-state scramble: ${solution}`);
	return solution.trim().split(/\s+/).filter(Boolean);
};

export const generateFewestMovesScramble = (): string[] => [
	"R'", 'U\'', 'F',
	...generateThreeByThreeRandomState(),
	"R'", 'U\'', 'F'
];

export const threeByThreeRandomStateMasks = {
	full: FULL_RANDOM,
	edges: [0xffffffffffff, 0xffffffffffff, 0x76543210, 0x00000000],
	corners: [0xba9876543210, 0x000000000000, 0xffffffff, 0xffffffff],
	lastLayer: [0xba987654ffff, 0x00000000ffff, 0x7654ffff, 0x0000ffff],
	f2l: [0xffff7654ffff, 0xffff0000ffff, 0xffffffff, 0xffffffff],
	zbll: [0xba987654ffff, 0x000000000000, 0x7654ffff, 0x0000ffff],
	pll: [0xba987654ffff, 0x000000000000, 0x7654ffff, 0x00000000],
	ttll: [0xba987654ffff, 0x000000000000, 0x7654ffff, 0x00000000],
	zzll: [0xba9876543f1f, 0x000000000000, 0x7654ffff, 0x0000ffff],
	eols: [0xba9f7654ffff, 0x000000000000, 0x765fffff, 0x000fffff],
	vls: [0xba9f7654ff8f, 0x000f00000000, 0x765fff4f, 0x000f0020],
	lse: [0xba98f6f4ffff, 0x0000f0f0ffff, 0x76543210, 0x00000000],
	cmll: [0xba98f6f4ffff, 0x0000f0f0ffff, 0x7654ffff, 0x0000ffff],
	cll: [0xba987654ffff, 0x00000000ffff, 0x7654ffff, 0x0000ffff],
	coll: [0xba987654ffff, 0x000000000000, 0x7654ffff, 0x0000ffff],
	ell: [0xba987654ffff, 0x00000000ffff, 0x76543210, 0x00000000],
	twoGll: [0xba987654ffff, 0x000000000000, 0x76543210, 0x0000ffff],
	rouxSecondBlock: [0xfa9ff6ffffff, 0xf00ff0ffffff, 0xf65fffff, 0xf00fffff],
	eoline: [0xffff7f5fffff, 0x000000000000, 0xffffffff, 0xffffffff],
	eocross: [0xffff7654ffff, 0x000000000000, 0xffffffff, 0xffffffff],
	mehtaThreeQuarterBlocks: [0xffff765fffff, 0xffff000fffff, 0xf65fffff, 0xf00fffff],
	mehtaTdr: [0xba98765fffff, 0x000000000000, 0xf65fffff, 0xf00fffff],
	mehtaSixCornerPerm: [0xba98765fffff, 0x000000000000, 0xf65fffff, 0x00000000],
	mehtaLastFiveEdgePerm: [0xba98765fffff, 0x000000000000, 0x76543210, 0x00000000],
	mehtaCdrll: [0xba98765fffff, 0x000000000000, 0x7654ffff, 0x0000ffff]
} as const satisfies Record<string, StateMask>;
