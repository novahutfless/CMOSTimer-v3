import { PuzzleInterface } from './types';

type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type SkewbState = Record<Face, string[]>;

// Center at index 0, corners at 1-4
const getInitialStateSkewb = (): SkewbState => ({
	U: Array(5).fill('U'),
	R: Array(5).fill('R'),
	F: Array(5).fill('F'),
	D: Array(5).fill('D'),
	L: Array(5).fill('L'),
	B: Array(5).fill('B'),
});

const applyMoveSkewb = (state: SkewbState, move: string): void => {
	const base = move.charAt(0);
	const isPrime = move.includes("'");
    
	// Helper to swap entire faces
	const cycleFaces = (fA: Face, fB: Face, fC: Face): void => {
		const temp = [...state[fA]];
		state[fA] = [...state[fC]];
		state[fC] = [...state[fB]];
		state[fB] = temp;
	};
    
	// Helper to cycle 3 specific stickers
	const cycleStickers = (
		fA: Face, iA: number, 
		fB: Face, iB: number, 
		fC: Face, iC: number
	): void => {
		const temp = state[fA][iA];
		state[fA][iA] = state[fC][iC];
		state[fC][iC] = state[fB][iB];
		state[fB][iB] = temp;
	};

	const apply = (
		faces: [Face, Face, Face], 
		stickers: [Face, number, Face, number, Face, number], 
		stickers2: [Face, number, Face, number, Face, number]
	): void => {
		if (isPrime) {
			cycleFaces(...faces);
			cycleStickers(...stickers);
			cycleStickers(...stickers2);
			
			cycleFaces(...faces);
			cycleStickers(...stickers);
			cycleStickers(...stickers2);
		} else {
			cycleFaces(...faces);
			cycleStickers(...stickers);
			cycleStickers(...stickers2);
		}
	};

	if (base === 'R')
		apply(['R', 'B', 'D'], ['U', 2, 'L', 4, 'F', 3], ['R', 1, 'B', 1, 'D', 2]);
	if (base === 'L')
		apply(['L', 'F', 'D'], ['U', 4, 'R', 4, 'B', 3], ['L', 1, 'F', 1, 'D', 4]);
	if (base === 'U')
		apply(['U', 'L', 'B'], ['F', 1, 'D', 4, 'R', 2], ['U', 1, 'L', 1, 'B', 2]);
	if (base === 'B')
		apply(['B', 'L', 'D'], ['R', 3, 'U', 1, 'F', 4], ['B', 1, 'L', 3, 'D', 4]);
};

export const SkewbPuzzle: PuzzleInterface<SkewbState> = {
	getInitialState: () => getInitialStateSkewb(),
	applyMove: (state, move) => applyMoveSkewb(state, move)
};