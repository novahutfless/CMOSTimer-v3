
import { ScrambleType } from '../types';

// Colors: U, R, F, D, L, B
const COLORS = {
    U: '#FFFFFF', // White
    R: '#DC2626', // Red
    F: '#16A34A', // Green
    D: '#EAB308', // Yellow
    L: '#EA580C', // Orange (Standard is Orange, using tailored hex)
    B: '#2563EB', // Blue
    X: '#3F3F46'  // Grey/Internal
};

type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
type CubeState = Record<Face, string[][]>;

const createFace = (color: string, size: number) => 
    Array(size).fill(null).map(() => Array(size).fill(color));

const getInitialState = (type: ScrambleType): CubeState => {
    const size = type === ScrambleType.TWO ? 2 : type === ScrambleType.FOUR ? 4 : type === ScrambleType.FIVE ? 5 : 3;
    return {
        U: createFace(COLORS.U, size),
        R: createFace(COLORS.R, size),
        F: createFace(COLORS.F, size),
        D: createFace(COLORS.D, size),
        L: createFace(COLORS.L, size),
        B: createFace(COLORS.B, size),
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

// Helper to extract column
const getCol = (matrix: string[][], col: number) => matrix.map(row => row[col]);
// Helper to set column
const setCol = (matrix: string[][], col: number, data: string[]) => {
    data.forEach((val, i) => {
        if (matrix[i]) matrix[i][col] = val;
    });
};

export const applyMove = (state: CubeState, move: string, size: number) => {
    const base = move.charAt(0);
    const isPrime = move.includes("'");
    const isDouble = move.includes("2");
    const isWide = move.includes("w"); 

    const face = base as Face;
    
    // GUARD against invalid faces or empty moves
    if (!state[face]) return;

    let times = isDouble ? 2 : isPrime ? 3 : 1;

    for(let t=0; t<times; t++) {
        state[face] = rotateFaceClockwise(state[face]);
        
        const U = state.U, D = state.D, L = state.L, R = state.R, F = state.F, B = state.B;
        const layers = isWide ? [0, 1] : [0];
        
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
                 const invIdx = size - 1 - layer;
                 const uRow = [...U[layer]];
                 const lCol = getCol(L, layer);
                 const dRow = [...D[invIdx]];
                 const rCol = getCol(R, invIdx);

                 U[layer] = rCol;
                 setCol(L, layer, uRow.reverse());
                 D[invIdx] = lCol;
                 setCol(R, invIdx, dRow.reverse());
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

export const getScrambleState = (scramble: string, type: ScrambleType) => {
    const state = getInitialState(type);
    const size = type === ScrambleType.TWO ? 2 : type === ScrambleType.FOUR ? 4 : type === ScrambleType.FIVE ? 5 : 3;
    
    if (!scramble) return state;
    
    const moves = scramble.trim().split(/\s+/);
    moves.forEach(move => {
        if(!move) return;
        applyMove(state, move, size);
    });
    return state;
};
