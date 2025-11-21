

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

const getCol = (matrix: string[][], col: number) => matrix.map(row => row[col]);
const setCol = (matrix: string[][], col: number, data: string[]) => {
    data.forEach((val, i) => {
        if (matrix[i]) matrix[i][col] = val;
    });
};

const applyMoveNxN = (state: NxNState, move: string, size: number) => {
    if (typeof move !== 'string' || !move) return;

    let base = move.charAt(0);
    
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
            depth = 2; // Rw is 2 layers
            base = move.charAt(0);
        }
    } else if (move.match(/^[xyz]$/)) {
        return; // Rotations ignored for now
    }
    
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    
    // Validate face
    if (!state[base as Face]) return;
    const face = base as Face;
    
    let times = isDouble ? 2 : isPrime ? 3 : 1;

    for(let t=0; t<times; t++) {
        state[face] = rotateFaceClockwise(state[face]);
        
        const U = state.U, D = state.D, L = state.L, R = state.R, F = state.F, B = state.B;
        
        const layers: number[] = [];
        if (isWide) {
            for(let i=0; i<depth; i++) layers.push(i);
        } else {
            layers.push(0);
        }
        
        layers.forEach(layer => {
            if (layer >= size) return; 

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
        });
    }
};

const parseSize = (params: any): number => {
    if (typeof params === 'number') return params;
    if (Array.isArray(params) && params.length > 0 && typeof params[0] === 'number') return params[0];
    if (typeof params === 'object' && params !== null && 'size' in params) return params.size;
    return 3;
};

export const NxNPuzzle: PuzzleInterface<NxNState> = {
    getInitialState: (params = 3) => getInitialStateNxN(parseSize(params)),
    applyMove: (state, move, params = 3) => applyMoveNxN(state, move, parseSize(params))
};
