import { PuzzleInterface } from './types';

type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type SkewbState = Record<Face, string[]>;

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

	const cycleFacesInv = (fA: Face, fB: Face, fC: Face): void => cycleFaces(fA, fC, fB);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const cycleStickersInv = (fA: Face, iA: number, fB: Face, iB: number, fC: Face, iC: number): void => cycleStickers(fA, iC, fB, iB, fC, iA);

	const apply = (
		faces: [Face, Face, Face], 
		stickers: [Face, number, Face, number, Face, number]
	): void => {
		if (isPrime) {
			cycleFacesInv(...faces);
			cycleStickers(stickers[0], stickers[1], stickers[4], stickers[5], stickers[2], stickers[3]);
		} else {
			cycleFaces(...faces);
			cycleStickers(...stickers);
		}
	};

	if (base === 'R') apply(['R', 'B', 'D'], ['U', 3, 'L', 4, 'F', 2]);
	if (base === 'L') apply(['L', 'F', 'D'], ['U', 4, 'R', 4, 'B', 2]);
	if (base === 'U') apply(['U', 'L', 'B'], ['F', 1, 'D', 4, 'R', 1]);
	if (base === 'B') apply(['B', 'R', 'U'], ['L', 1, 'D', 3, 'F', 2]);
};

export const SkewbPuzzle: PuzzleInterface<SkewbState> = {
	getInitialState: () => getInitialStateSkewb(),
	applyMove: (state, move) => applyMoveSkewb(state, move)
};