import { PuzzleInterface } from './types';

type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
type Vector = [number, number, number];

export type SkewbState = Record<Face, string[]>;

type StickerPosition = {
	face: Face;
	index: number;
	normal: Vector;
	position: Vector;
};

// Center at index 0, corners at 1-4.
const getInitialStateSkewb = (): SkewbState => ({
	U: Array(5).fill('U'),
	R: Array(5).fill('R'),
	F: Array(5).fill('F'),
	D: Array(5).fill('D'),
	L: Array(5).fill('L'),
	B: Array(5).fill('B'),
});

const FACE_NORMALS: Record<Face, Vector> = {
	U: [0, 1, 0],
	R: [1, 0, 0],
	F: [0, 0, 1],
	D: [0, -1, 0],
	L: [-1, 0, 0],
	B: [0, 0, -1],
};

const STICKERS: StickerPosition[] = [
	{ face: 'U', index: 0, normal: FACE_NORMALS.U, position: FACE_NORMALS.U },
	{ face: 'U', index: 1, normal: FACE_NORMALS.U, position: [-1, 1, -1] },
	{ face: 'U', index: 2, normal: FACE_NORMALS.U, position: [1, 1, -1] },
	{ face: 'U', index: 3, normal: FACE_NORMALS.U, position: [1, 1, 1] },
	{ face: 'U', index: 4, normal: FACE_NORMALS.U, position: [-1, 1, 1] },

	{ face: 'R', index: 0, normal: FACE_NORMALS.R, position: FACE_NORMALS.R },
	{ face: 'R', index: 1, normal: FACE_NORMALS.R, position: [1, 1, 1] },
	{ face: 'R', index: 2, normal: FACE_NORMALS.R, position: [1, 1, -1] },
	{ face: 'R', index: 3, normal: FACE_NORMALS.R, position: [1, -1, -1] },
	{ face: 'R', index: 4, normal: FACE_NORMALS.R, position: [1, -1, 1] },

	{ face: 'F', index: 0, normal: FACE_NORMALS.F, position: FACE_NORMALS.F },
	{ face: 'F', index: 1, normal: FACE_NORMALS.F, position: [-1, 1, 1] },
	{ face: 'F', index: 2, normal: FACE_NORMALS.F, position: [1, 1, 1] },
	{ face: 'F', index: 3, normal: FACE_NORMALS.F, position: [1, -1, 1] },
	{ face: 'F', index: 4, normal: FACE_NORMALS.F, position: [-1, -1, 1] },

	{ face: 'D', index: 0, normal: FACE_NORMALS.D, position: FACE_NORMALS.D },
	{ face: 'D', index: 1, normal: FACE_NORMALS.D, position: [-1, -1, 1] },
	{ face: 'D', index: 2, normal: FACE_NORMALS.D, position: [1, -1, 1] },
	{ face: 'D', index: 3, normal: FACE_NORMALS.D, position: [1, -1, -1] },
	{ face: 'D', index: 4, normal: FACE_NORMALS.D, position: [-1, -1, -1] },

	{ face: 'L', index: 0, normal: FACE_NORMALS.L, position: FACE_NORMALS.L },
	{ face: 'L', index: 1, normal: FACE_NORMALS.L, position: [-1, 1, -1] },
	{ face: 'L', index: 2, normal: FACE_NORMALS.L, position: [-1, 1, 1] },
	{ face: 'L', index: 3, normal: FACE_NORMALS.L, position: [-1, -1, 1] },
	{ face: 'L', index: 4, normal: FACE_NORMALS.L, position: [-1, -1, -1] },

	{ face: 'B', index: 0, normal: FACE_NORMALS.B, position: FACE_NORMALS.B },
	{ face: 'B', index: 1, normal: FACE_NORMALS.B, position: [1, 1, -1] },
	{ face: 'B', index: 2, normal: FACE_NORMALS.B, position: [-1, 1, -1] },
	{ face: 'B', index: 3, normal: FACE_NORMALS.B, position: [-1, -1, -1] },
	{ face: 'B', index: 4, normal: FACE_NORMALS.B, position: [1, -1, -1] },
];

const STICKER_BY_GEOMETRY = new Map<string, StickerPosition>(
	STICKERS.map(sticker => [`${sticker.normal.join(',')}|${sticker.position.join(',')}`, sticker])
);

const MOVE_AXES: Record<string, Vector> = {
	R: [1, -1, -1],
	L: [-1, -1, 1],
	U: [-1, 1, -1],
	B: [-1, -1, -1],
};

const MOVE_CLOCKWISE_USES_PRIME: Record<string, boolean> = {
	R: false,
	L: false,
	U: false,
	B: true,
};

const dot = (a: Vector, b: Vector): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const rotateAroundBodyDiagonal = (v: Vector, axis: Vector, prime: boolean): Vector => {
	const [x, y, z] = v;
	const [ax, ay, az] = axis;
	const withAxisSigns: Vector = [x * ax, y * ay, z * az];
	const rotated = prime
		? [withAxisSigns[1], withAxisSigns[2], withAxisSigns[0]]
		: [withAxisSigns[2], withAxisSigns[0], withAxisSigns[1]];

	return [rotated[0] * ax, rotated[1] * ay, rotated[2] * az];
};

const cloneState = (state: SkewbState): SkewbState => ({
	U: [...state.U],
	R: [...state.R],
	F: [...state.F],
	D: [...state.D],
	L: [...state.L],
	B: [...state.B],
});

const applyMoveSkewb = (state: SkewbState, move: string): void => {
	const base = move.charAt(0);
	const axis = MOVE_AXES[base];
	if (!axis) return;

	const isPrime = move.includes("'");
	const clockwise = MOVE_CLOCKWISE_USES_PRIME[base] ? isPrime : !isPrime;
	const previous = cloneState(state);

	STICKERS.forEach(sticker => {
		if (dot(sticker.position, axis) <= 0) return;

		const nextNormal = rotateAroundBodyDiagonal(sticker.normal, axis, clockwise);
		const nextPosition = rotateAroundBodyDiagonal(sticker.position, axis, clockwise);
		const nextSticker = STICKER_BY_GEOMETRY.get(`${nextNormal.join(',')}|${nextPosition.join(',')}`);

		if (!nextSticker) return;
		state[nextSticker.face][nextSticker.index] = previous[sticker.face][sticker.index];
	});
};

export const SkewbPuzzle: PuzzleInterface<SkewbState> = {
	getInitialState: () => getInitialStateSkewb(),
	applyMove: (state, move) => applyMoveSkewb(state, move)
};
