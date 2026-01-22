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

	for (let t = 0; t < times; t++) {
	// Map cuboid move to NxN layers
		if (base === 'U') {
			// Range: y = 0 .. depth-1
			for (let i = 0; i < depth; i++) applyLayerTurn(state, 'U', size, i);
			// Rotate U Face if layer 0 is included
			if (depth >= 1) state.U = rotateFaceClockwise(state.U);
		} else if (base === 'D') {
			// Range: y = H-1 .. H-depth
			// Corresponds to NxN D layers
			// D layer 0 is y=S-1. D layer k is y=S-1-k.
			// We want y = H-1-i.
			// S-1-layer = H-1-i => layer = S - H + i
			for (let i = 0; i < depth; i++) {
				const y = h - 1 - i; // e.g. H=4, i=0 -> y=3 (Bottom)
				// applyLayerTurn('D', size, layer) -> affects S-1-layer
				// We want S-1-layer = y
				// layer = S - 1 - y
				applyLayerTurn(state, 'D', size, size - 1 - y);
			}
			// Rotate D Face if H-1 is included (i=0)
			if (depth >= 1) state.D = rotateFaceClockwise(state.D);
		} else if (base === 'L') {
			// Range: x = 0 .. depth-1
			for (let i = 0; i < depth; i++) applyLayerTurn(state, 'L', size, i);
			if (depth >= 1) state.L = rotateFaceClockwise(state.L);
		} else if (base === 'R') {
			// Range: x = W-1 .. W-depth
			for (let i = 0; i < depth; i++) {
				const x = w - 1 - i;
				// applyLayerTurn('R', size, layer) -> affects S-1-layer
				// We want x. S-1-layer = x => layer = S - 1 - x
				applyLayerTurn(state, 'R', size, size - 1 - x);
			}
			if (depth >= 1) state.R = rotateFaceClockwise(state.R);
		} else if (base === 'F') {
			// Range: z = 0 .. depth-1
			for (let i = 0; i < depth; i++) applyLayerTurn(state, 'F', size, i);
			if (depth >= 1) state.F = rotateFaceClockwise(state.F);
		} else if (base === 'B') {
			// Range: z = D-1 .. D-depth (here D is depth dim)
			for (let i = 0; i < depth; i++) {
				const z = d - 1 - i;
				// applyLayerTurn('B', size, layer) -> affects S-1-layer (backwards)
				// Wait, earlier verification: B layer 0 -> S-1.
				// layer = S - 1 - z
				applyLayerTurn(state, 'B', size, size - 1 - z);
			}
			if (depth >= 1) state.B = rotateFaceClockwise(state.B);
		}
	}
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

const parseSize = (params: any): number => {
	if (typeof params === 'number') return params;
	if (Array.isArray(params) && params.length > 0 && typeof params[0] === 'number') return params[0];
	if (typeof params === 'object' && params !== null && 'size' in params) return params.size;
	return 3;
};

export const NxNPuzzle: PuzzleInterface<NxNState> & { isSolved: (state: NxNState) => boolean, applyCuboidMove: any } = {
	getInitialState: (params = 3) => getInitialStateNxN(parseSize(params)),
	applyMove: (state, move, params = 3) => applyMoveNxN(state, move, parseSize(params)),
	applyCuboidMove,
	isSolved: isSolvedNxN
};
