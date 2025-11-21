

import { PuzzleInterface } from './types';

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type NxNState = Record<Face, string[][]>; 

const createFace = (faceId: string, size: number) => 
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

const rotateFaceClockwise = (matrix: string[][]) => {
    if (!matrix || matrix.length === 0) return [];
    const N = matrix.length;
    const newMatrix = matrix.map(row => [...row]);
    for(let i=0; i<N; i++) {
        for(let j=0; j<N; j++) {
            newMatrix[j][N-1-i] = matrix[i][j];
        }
    }
    return newMatrix;
};

const rotateFaceCounterClockwise = (matrix: string[][]) => {
    if (!matrix || matrix.length === 0) return [];
    const N = matrix.length;
    const newMatrix = matrix.map(row => [...row]);
    for(let i=0; i<N; i++) {
        for(let j=0; j<N; j++) {
            newMatrix[N-1-j][i] = matrix[i][j];
        }
    }
    return newMatrix;
};

const rotateFace180 = (matrix: string[][]) => {
    if (!matrix) return [];
    // Reverse rows and reverse elements in rows (180 degree rotation)
    return matrix.map(row => [...row].reverse()).reverse();
};

const getCol = (matrix: string[][], col: number) => matrix.map(row => row[col]);
const setCol = (matrix: string[][], col: number, data: string[]) => {
    data.forEach((val, i) => {
        if (matrix[i]) matrix[i][col] = val;
    });
};

const applyRotation = (state: NxNState, axis: string, isPrime: boolean, isDouble: boolean) => {
    const times = isDouble ? 2 : isPrime ? 3 : 1;
    
    for(let t=0; t<times; t++) {
        const U = state.U, D = state.D, L = state.L, R = state.R, F = state.F, B = state.B;
        
        if (axis === 'y') {
            // y: Rotate around U/D axis. U (CW), D (CCW)
            // New F = Old R, New R = Old B, New B = Old L, New L = Old F
            state.U = rotateFaceClockwise(U);
            state.D = rotateFaceCounterClockwise(D);
            
            const tempF = F;
            state.F = R;
            state.R = B;
            state.B = L;
            state.L = tempF;
        } else if (axis === 'x') {
            // x: Rotate around R/L axis. R (CW), L (CCW)
            // F -> U -> B -> D -> F
            state.R = rotateFaceClockwise(R);
            state.L = rotateFaceCounterClockwise(L);
            
            // Correct X mapping:
            // F moves to U
            // U moves to B (Rotated 180: Back-Left U becomes Bottom-Right B)
            // B moves to D (Rotated 180: Top-Right B becomes Front-Left D)
            // D moves to F
            
            const tempF = F;
            state.F = D;
            state.D = rotateFace180(B);
            state.B = rotateFace180(U);
            state.U = tempF;
        } else if (axis === 'z') {
            // z: Rotate around F/B axis. F (CW), B (CCW)
            // U -> L -> D -> R -> U
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

const applyMoveNxN = (state: NxNState, move: string, size: number) => {
    if (typeof move !== 'string' || !move) return;

    let base = move.charAt(0);
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");

    // Handle Rotations (x, y, z)
    if (['x', 'y', 'z'].includes(base.toLowerCase())) {
        applyRotation(state, base.toLowerCase(), isPrime, isDouble);
        return;
    }
    
    // Handle Slice Moves (M, E, S)
    if (['M', 'E', 'S'].includes(base)) {
        let targetFace: Face = 'L';
        if (base === 'E') targetFace = 'D';
        if (base === 'S') targetFace = 'F';
        
        const layer = Math.floor(size / 2); 
        
        let times = isDouble ? 2 : isPrime ? 3 : 1;
        for(let t=0; t<times; t++) {
            applyLayerTurn(state, targetFace, size, layer);
        }
        return;
    }

    // Handle '3Uw' or 'Rw' parsing
    let depth = 1;
    let isWide = false;
    
    if (move.includes('w')) {
        isWide = true;
        const match = move.match(/(\d+)(\w)w/); // 3Rw
        if (match) {
            depth = parseInt(match[1]);
            base = match[2];
        } else {
            depth = 2; // Rw is 2 layers (for 3x3, it's R and M)
            base = move.charAt(0);
        }
    }
    
    // Validate face
    if (!state[base as Face]) return;
    const face = base as Face;
    
    let times = isDouble ? 2 : isPrime ? 3 : 1;

    for(let t=0; t<times; t++) {
        // Rotate the face itself (only for regular moves or wide moves starting from 0)
        state[face] = rotateFaceClockwise(state[face]);
        
        const layers: number[] = [];
        if (isWide) {
            for(let i=0; i<depth; i++) layers.push(i);
        } else {
            layers.push(0);
        }
        
        layers.forEach(layer => {
            applyLayerTurn(state, face, size, layer);
        });
    }
};

const applyLayerTurn = (state: NxNState, face: Face, size: number, layer: number) => {
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
        const idx = layer; 
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
            const idx = layer;
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

const isSolvedNxN = (state: NxNState): boolean => {
    const faces: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
    for (const face of faces) {
        const grid = state[face];
        const targetColor = grid[0][0];
        for (const row of grid) {
            for (const cell of row) {
                if (cell !== targetColor) return false;
            }
        }
    }
    return true;
};

const parseSize = (params: any): number => {
    if (typeof params === 'number') return params;
    if (Array.isArray(params) && params.length > 0 && typeof params[0] === 'number') return params[0];
    if (typeof params === 'object' && params !== null && 'size' in params) return params.size;
    return 3;
};

export const NxNPuzzle: PuzzleInterface<NxNState> & { isSolved: (state: NxNState) => boolean } = {
    getInitialState: (params = 3) => getInitialStateNxN(parseSize(params)),
    applyMove: (state, move, params = 3) => applyMoveNxN(state, move, parseSize(params)),
    isSolved: isSolvedNxN
};
