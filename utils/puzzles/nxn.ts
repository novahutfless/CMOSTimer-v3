import { PuzzleInterface } from './types';

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type NxNState = Record<Face, string[][]>; 

const createFace = (faceId: string, size: number): string[][] => 
	Array(size).fill(null).map(() => Array(size).fill(faceId));

const getInitialStateNxN = (size: number): NxNState => {
	return {
		U: createFace('U', size),
		R: createFace('R', size),
		F: createFace('F', size),
		D: createFace('D', size),
		L: createFace('L', size),
		B: createFace('B', size),
	};
};

// Standard full-face rotations (for normal NxN)
const rotateFaceClockwise = (matrix: string[][]): string[][] => {
	if (!matrix || matrix.length === 0) return [];
	const N = matrix.length;
	const newMatrix = matrix.map(row => [...row]);
	for(let i=0; i<N; i++) 
		for(let j=0; j<N; j++) 
			newMatrix[j][N-1-i] = matrix[i][j];
	
	return newMatrix;
};

const rotateFaceCounterClockwise = (matrix: string[][]): string[][] => {
	if (!matrix || matrix.length === 0) return [];
	const N = matrix.length;
	const newMatrix = matrix.map(row => [...row]);
	for(let i=0; i<N; i++) 
		for(let j=0; j<N; j++) 
			newMatrix[N-1-j][i] = matrix[i][j];
	
	return newMatrix;
};

const rotateFace180 = (matrix: string[][]): string[][] => {
	if (!matrix) return [];
	return matrix.map(row => [...row].reverse()).reverse();
};

const getCol = (matrix: string[][], col: number): string[] => matrix.map(row => row[col]);
const setCol = (matrix: string[][], col: number, data: string[]): void => {
	data.forEach((val, i) => {
		if (matrix[i]) matrix[i][col] = val;
	});
};

const applyRotation = (state: NxNState, axis: string, isPrime: boolean, isDouble: boolean): void => {
	const times = isDouble ? 2 : isPrime ? 3 : 1;
    
	for(let t=0; t<times; t++) {
		const U = state.U, D = state.D, L = state.L, R = state.R, F = state.F, B = state.B;
        
		if (axis === 'y') {
			state.U = rotateFaceClockwise(U);
			state.D = rotateFaceCounterClockwise(D);
            
			const tempF = F;
			state.F = R;
			state.R = B;
			state.B = L;
			state.L = tempF;
		} else if (axis === 'x') {
			state.R = rotateFaceClockwise(R);
			state.L = rotateFaceCounterClockwise(L);
            
			const tempF = F;
			state.F = D;
			state.D = rotateFace180(B);
			state.B = rotateFace180(U);
			state.U = tempF;
		} else if (axis === 'z') {
			state.F = rotateFaceClockwise(F);
			state.B = rotateFaceCounterClockwise(B);
            
			const tempU = U;
			state.U = rotateFaceClockwise(L);
			state.L = rotateFaceClockwise(D);
			state.D = rotateFaceClockwise(R);
			state.R = rotateFaceClockwise(tempU);
		}
	}
};

const applyLayerTurn = (state: NxNState, face: Face, size: number, layer: number): void => {
	if (layer >= size) return;
    
	const U = state.U, D = state.D, L = state.L, R = state.R, F = state.F, B = state.B;

	if (face === 'U') {
		const temp = F[layer];
		F[layer] = R[layer];
		R[layer] = B[layer];
		B[layer] = L[layer];
		L[layer] = temp;
	} else if (face === 'D') {
		const idx = size - 1 - layer;
		const temp = F[idx];
		F[idx] = L[idx];
		L[idx] = B[idx];
		B[idx] = R[idx];
		R[idx] = temp;
	} else if (face === 'F') {
		const invIdx = size - 1 - layer;
		const uRow = [...U[invIdx]];
		const rCol = getCol(R, layer);
		const dRow = [...D[layer]];
		const lCol = getCol(L, invIdx);
        
		U[invIdx] = lCol.reverse();
		setCol(R, layer, uRow);
		D[layer] = rCol.reverse();
		setCol(L, invIdx, dRow);
	} else if (face === 'B') {
		const uRow = [...U[layer]];
		const lCol = getCol(L, layer);
		const dRow = [...D[size - 1 - layer]];
		const rCol = getCol(R, size - 1 - layer);

		U[layer] = rCol;
		setCol(L, layer, uRow.reverse());
		D[size - 1 - layer] = lCol;
		setCol(R, size - 1 - layer, dRow.reverse());
	} else if (face === 'L') {
		const idx = layer;
		const colU = getCol(U, idx);
		const colF = getCol(F, idx);
		const colD = getCol(D, idx);
		const colB = getCol(B, size - 1 - idx);

		setCol(U, idx, colB.reverse());
		setCol(F, idx, colU);
		setCol(D, idx, colF);
		setCol(B, size - 1 - idx, colD.reverse());
	} else if (face === 'R') {
		const idx = size - 1 - layer; 
		const bIdx = layer; 
        
		const colU = getCol(U, idx);
		const colB = getCol(B, bIdx);
		const colD = getCol(D, idx);
		const colF = getCol(F, idx);
        
		setCol(U, idx, colF);
		setCol(F, idx, colD);
		setCol(D, idx, colB.reverse());
		setCol(B, bIdx, colU.reverse());
	}
};

const applyMoveNxN = (state: NxNState, move: string, size: number): void => {
	if (typeof move !== 'string' || !move) return;

	let base = move.charAt(0);
	const isPrime = move.includes("'");
	const isDouble = move.includes("2");

	if (['x', 'y', 'z'].includes(base.toLowerCase())) {
		applyRotation(state, base.toLowerCase(), isPrime, isDouble);
		return;
	}
    
	if (['M', 'E', 'S'].includes(base)) {
		let targetFace: Face = 'L';
		if (base === 'E') targetFace = 'D';
		if (base === 'S') targetFace = 'F';
        
		const layer = Math.floor(size / 2); 
        
		const times = isDouble ? 2 : isPrime ? 3 : 1;
		for(let t=0; t<times; t++) 
			applyLayerTurn(state, targetFace, size, layer);
        
		return;
	}

	let depth = 1;
	let isWide = false;
    
	if (move.includes('w')) {
		isWide = true;
		const match = move.match(/(\d+)(\w)w/);
		if (match) {
			depth = parseInt(match[1]);
			base = match[2];
		} else {
			depth = 2; 
			base = move.charAt(0);
		}
	}
    
	if (!state[base as Face]) return;
	const face = base as Face;
    
	const times = isDouble ? 2 : isPrime ? 3 : 1;

	for(let t=0; t<times; t++) {
		state[face] = rotateFaceClockwise(state[face]);
		const layers: number[] = [];
		if (isWide) 
			for(let i=0; i<depth; i++) layers.push(i);
		else 
			layers.push(0);
        
		layers.forEach(layer => {
			applyLayerTurn(state, face, size, layer);
		});
	}
};

/**
 * Cuboid specific logic
 */

type CuboidVector = [number, number, number];

type CuboidSticker = {
	face: Face;
	row: number;
	col: number;
	position: CuboidVector;
	normal: CuboidVector;
};

const FACE_BY_NORMAL: Record<string, Face> = {
	'0,-1,0': 'U',
	'0,1,0': 'D',
	'0,0,-1': 'F',
	'0,0,1': 'B',
	'-1,0,0': 'L',
	'1,0,0': 'R',
};

const cuboidStickerKey = (normal: CuboidVector, position: CuboidVector): string =>
	`${normal.join(',')}|${position.join(',')}`;

const createCuboidSticker = (face: Face, row: number, col: number, w: number, h: number, d: number): CuboidSticker => {
	if (face === 'U') return { face, row, col, position: [col, 0, row], normal: [0, -1, 0] };
	if (face === 'D') return { face, row, col, position: [col, h - 1, row], normal: [0, 1, 0] };
	if (face === 'F') return { face, row, col, position: [col, row, 0], normal: [0, 0, -1] };
	if (face === 'B') return { face, row, col, position: [w - 1 - col, row, d - 1], normal: [0, 0, 1] };
	if (face === 'L') return { face, row, col, position: [0, row, d - 1 - col], normal: [-1, 0, 0] };
	return { face, row, col, position: [w - 1, row, col], normal: [1, 0, 0] };
};

const createCuboidStickers = (w: number, h: number, d: number): CuboidSticker[] => {
	const stickers: CuboidSticker[] = [];
	for (let row = 0; row < d; row++)
		for (let col = 0; col < w; col++) {
			stickers.push(createCuboidSticker('U', row, col, w, h, d));
			stickers.push(createCuboidSticker('D', row, col, w, h, d));
		}

	for (let row = 0; row < h; row++)
		for (let col = 0; col < w; col++) {
			stickers.push(createCuboidSticker('F', row, col, w, h, d));
			stickers.push(createCuboidSticker('B', row, col, w, h, d));
		}

	for (let row = 0; row < h; row++)
		for (let col = 0; col < d; col++) {
			stickers.push(createCuboidSticker('L', row, col, w, h, d));
			stickers.push(createCuboidSticker('R', row, col, w, h, d));
		}

	return stickers;
};

const rotateCuboidVector = (v: CuboidVector, axis: Face, clockwise: boolean, w: number, h: number, d: number): CuboidVector => {
	const [x, y, z] = v;
	if (axis === 'U' || axis === 'D') return clockwise ? [d - 1 - z, y, x] : [z, y, w - 1 - x];
	if (axis === 'R' || axis === 'L') return [x, h - 1 - y, d - 1 - z];
	if (axis === 'F' || axis === 'B') return [w - 1 - x, h - 1 - y, z];
	return v;
};

const rotateCuboidNormal = (v: CuboidVector, axis: Face, clockwise: boolean): CuboidVector => {
	const [x, y, z] = v;
	if (axis === 'U' || axis === 'D') return clockwise ? [-z, y, x] : [z, y, -x];
	if (axis === 'R' || axis === 'L') return [x, -y, -z];
	if (axis === 'F' || axis === 'B') return [-x, -y, z];
	return v;
};

const cuboidLayerContains = (position: CuboidVector, face: Face, depth: number, w: number, h: number, d: number): boolean => {
	const [x, y, z] = position;
	if (face === 'U') return y < depth;
	if (face === 'D') return y >= h - depth;
	if (face === 'L') return x < depth;
	if (face === 'R') return x >= w - depth;
	if (face === 'F') return z < depth;
	if (face === 'B') return z >= d - depth;
	return false;
};

const resetHiddenCuboidCells = (state: NxNState, w: number, h: number, d: number, size: number): void => {
	(['U', 'D', 'F', 'B', 'L', 'R'] as Face[]).forEach(faceName => {
		for (let row = 0; row < size; row++)
			for (let col = 0; col < size; col++) {
				const visible =
					(faceName === 'U' || faceName === 'D') ? row < d && col < w :
						(faceName === 'L' || faceName === 'R') ? row < h && col < d :
							row < h && col < w;
				if (!visible) state[faceName][row][col] = faceName;
			}
	});
};

const cloneCuboidState = (state: NxNState): NxNState => ({
	U: state.U.map(row => [...row]),
	R: state.R.map(row => [...row]),
	F: state.F.map(row => [...row]),
	D: state.D.map(row => [...row]),
	L: state.L.map(row => [...row]),
	B: state.B.map(row => [...row]),
});

const applyCuboidMove = (state: NxNState, move: string, w: number, h: number, d: number, size: number): void => {
	if (!move) return;
	const match = move.match(/^(\d*)([URFDLB])(w?)(['2]?)$/);
	if (!match) return;

	const [, depthStr, base, wideStr, suffix] = match;
	const isWide = !!wideStr;
	const depth = depthStr ? parseInt(depthStr) : (isWide ? 2 : 1);
	const isPrime = suffix === "'";
	const isDouble = suffix === "2";
	const times = isDouble ? 2 : isPrime ? 3 : 1;
	const face = base as Face;
	const isSideHalfTurn = ['R', 'L', 'F', 'B'].includes(face);

	if (depth < 1) return;
	if ((face === 'U' || face === 'D') && w !== d) return;
	if ((face === 'R' || face === 'L') && !isDouble) return;
	if ((face === 'F' || face === 'B') && !isDouble) return;

	const stickers = createCuboidStickers(w, h, d);
	const stickerByGeometry = new Map(stickers.map(sticker => [cuboidStickerKey(sticker.normal, sticker.position), sticker]));

	const effectiveTimes = isSideHalfTurn ? 1 : times;

	for (let t = 0; t < effectiveTimes; t++) {
		const previous = cloneCuboidState(state);
		const clockwise = face === 'D' ? isPrime : !isPrime;

		stickers.forEach(sticker => {
			if (!cuboidLayerContains(sticker.position, face, depth, w, h, d)) return;

			const nextPosition = rotateCuboidVector(sticker.position, face, clockwise, w, h, d);
			const nextNormal = rotateCuboidNormal(sticker.normal, face, clockwise);
			const nextSticker = stickerByGeometry.get(cuboidStickerKey(nextNormal, nextPosition));

			if (!FACE_BY_NORMAL[nextNormal.join(',')] || !nextSticker) return;
			state[nextSticker.face][nextSticker.row][nextSticker.col] = previous[sticker.face][sticker.row][sticker.col];
		});
	}

	resetHiddenCuboidCells(state, w, h, d, size);
};

const isSolvedNxN = (state: NxNState): boolean => {
	const faces: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
	for (const face of faces) {
		const grid = state[face];
		const targetColor = grid[0][0];
		for (const row of grid) 
			for (const cell of row) 
				if (cell !== targetColor) return false;
	}
	return true;
};

const parseSize = (params: unknown): number => {
	if (typeof params === 'number') return params;
	if (Array.isArray(params) && params.length > 0 && typeof params[0] === 'number') return params[0];
	if (typeof params === 'object' && params !== null && 'size' in params) {
		const size = (params as { size?: unknown }).size;
		if (typeof size === 'number') return size;
	}
	return 3;
};

export const NxNPuzzle: PuzzleInterface<NxNState> & { isSolved: (state: NxNState) => boolean; applyCuboidMove: (state: NxNState, move: string, w: number, h: number, d: number, size: number) => void } = {
	getInitialState: (params: unknown = 3) => getInitialStateNxN(parseSize(params)),
	applyMove: (state, move, params: unknown = 3) => applyMoveNxN(state, move, parseSize(params)),
	applyCuboidMove,
	isSolved: isSolvedNxN
};
