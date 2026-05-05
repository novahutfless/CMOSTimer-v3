import { PuzzleInterface } from './types';

type Vertex = 'U' | 'L' | 'R' | 'B';
export type PyraFace = 'F' | 'L' | 'R' | 'D';
type Weights = Record<Vertex, number>;

export type PyraState = Record<PyraFace, string[]>;

type Sticker = {
	face: PyraFace;
	index: number;
	center: Weights;
	maxCornerWeight: Weights;
};

const VERTICES: Vertex[] = ['U', 'L', 'R', 'B'];

const emptyWeights = (): Weights => ({ U: 0, L: 0, R: 0, B: 0 });

const getInitialStatePyra = (): PyraState => ({
	F: Array(9).fill('F'),
	L: Array(9).fill('L'),
	R: Array(9).fill('R'),
	D: Array(9).fill('D')
});

const FACE_VERTICES: Record<PyraFace, Vertex[]> = {
	F: ['U', 'L', 'R'],
	L: ['L', 'B', 'U'],
	R: ['R', 'U', 'B'],
	D: ['B', 'L', 'R']
};

const UP_FACE_TRIANGLES: Array<{ index: number; base: [number, number, number]; inverted: boolean }> = [
	{ index: 0, base: [2, 0, 0], inverted: false },
	{ index: 1, base: [1, 1, 0], inverted: false },
	{ index: 2, base: [1, 0, 0], inverted: true },
	{ index: 3, base: [1, 0, 1], inverted: false },
	{ index: 4, base: [0, 2, 0], inverted: false },
	{ index: 5, base: [0, 1, 0], inverted: true },
	{ index: 6, base: [0, 1, 1], inverted: false },
	{ index: 7, base: [0, 0, 1], inverted: true },
	{ index: 8, base: [0, 0, 2], inverted: false },
];

const DOWN_FACE_TRIANGLES: Array<{ index: number; base: [number, number, number]; inverted: boolean }> = [
	{ index: 8, base: [2, 0, 0], inverted: false },
	{ index: 5, base: [1, 1, 0], inverted: false },
	{ index: 6, base: [1, 0, 0], inverted: true },
	{ index: 7, base: [1, 0, 1], inverted: false },
	{ index: 0, base: [0, 2, 0], inverted: false },
	{ index: 1, base: [0, 1, 0], inverted: true },
	{ index: 2, base: [0, 1, 1], inverted: false },
	{ index: 3, base: [0, 0, 1], inverted: true },
	{ index: 4, base: [0, 0, 2], inverted: false },
];

const faceTriangles = (face: PyraFace): Array<{ index: number; base: [number, number, number]; inverted: boolean }> =>
	face === 'F' ? UP_FACE_TRIANGLES : DOWN_FACE_TRIANGLES;

const buildSticker = (
	face: PyraFace,
	index: number,
	faceVertices: Vertex[],
	base: [number, number, number],
	inverted: boolean
): Sticker => {
	const center = emptyWeights();
	const maxCornerWeight = emptyWeights();
	const offsets: Array<[number, number, number]> = inverted
		? [[1, 1, 0], [1, 0, 1], [0, 1, 1]]
		: [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

	offsets.forEach(offset => {
		offset.forEach((delta, localIdx) => {
			const vertex = faceVertices[localIdx];
			const value = base[localIdx] + delta;
			center[vertex] += value;
			maxCornerWeight[vertex] = Math.max(maxCornerWeight[vertex], value);
		});
	});

	return { face, index, center, maxCornerWeight };
};

const STICKERS: Sticker[] = (Object.keys(FACE_VERTICES) as PyraFace[]).flatMap(face =>
	faceTriangles(face).map(({ index, base, inverted }) =>
		buildSticker(face, index, FACE_VERTICES[face], base, inverted)
	)
);

const stickerKey = (weights: Weights): string => VERTICES.map(vertex => weights[vertex]).join(',');

const STICKER_BY_POSITION = new Map<string, Sticker>(
	STICKERS.map(sticker => [stickerKey(sticker.center), sticker])
);

const CLOCKWISE_VERTEX_CYCLES: Record<Vertex, Record<Vertex, Vertex>> = {
	U: { U: 'U', L: 'B', B: 'R', R: 'L' },
	L: { L: 'L', U: 'R', R: 'B', B: 'U' },
	R: { R: 'R', U: 'B', B: 'L', L: 'U' },
	B: { B: 'B', U: 'L', L: 'R', R: 'U' }
};

const invertCycle = (cycle: Record<Vertex, Vertex>): Record<Vertex, Vertex> => {
	const inverted = {} as Record<Vertex, Vertex>;
	VERTICES.forEach(vertex => {
		inverted[cycle[vertex]] = vertex;
	});
	return inverted;
};

const rotateWeights = (weights: Weights, cycle: Record<Vertex, Vertex>): Weights => {
	const rotated = emptyWeights();
	VERTICES.forEach(vertex => {
		rotated[cycle[vertex]] = weights[vertex];
	});
	return rotated;
};

const cloneState = (state: PyraState): PyraState => ({
	F: [...state.F],
	L: [...state.L],
	R: [...state.R],
	D: [...state.D]
});

const applyMovePyra = (state: PyraState, move: string): void => {
	const base = move.charAt(0);
	const vertex = base.toUpperCase() as Vertex;
	const clockwiseCycle = CLOCKWISE_VERTEX_CYCLES[vertex];
	if (!clockwiseCycle) return;

	const isTipOnly = base === base.toLowerCase();
	const isPrime = move.includes("'");
	const cycle = isPrime ? invertCycle(clockwiseCycle) : clockwiseCycle;
	const previous = cloneState(state);

	STICKERS.forEach(sticker => {
		const layerThreshold = isTipOnly ? 3 : 2;
		if (sticker.maxCornerWeight[vertex] < layerThreshold) return;

		const rotatedCenter = rotateWeights(sticker.center, cycle);
		const nextSticker = STICKER_BY_POSITION.get(stickerKey(rotatedCenter));
		if (!nextSticker) return;

		state[nextSticker.face][nextSticker.index] = previous[sticker.face][sticker.index];
	});
};

export const PyraminxPuzzle: PuzzleInterface<PyraState> = {
	getInitialState: () => getInitialStatePyra(),
	applyMove: (state, move) => applyMovePyra(state, move)
};
