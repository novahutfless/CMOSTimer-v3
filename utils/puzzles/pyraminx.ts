import { PuzzleInterface } from './types';

// Pyraminx Logic
// Faces: F (Green), L (Blue), R (Red), D (Yellow)
type PyraFace = 'F' | 'L' | 'R' | 'D';
export type PyraState = Record<PyraFace, string[]>;

const getInitialStatePyra = (): PyraState => ({
	F: Array(9).fill('F'), // Green
	L: Array(9).fill('L'), // Blue
	R: Array(9).fill('R'), // Red
	D: Array(9).fill('D') // Yellow
});

type StickerRef = {
	get val(): string;
	set val(v: string);
};

const applyMovePyra = (state: PyraState, move: string): void => {
	const base = move.charAt(0);
	const isPrime = move.includes("'");
    
	const cycle = (a: StickerRef, b: StickerRef, c: StickerRef): void => { 
		const temp = a.val; a.val = c.val; c.val = b.val; b.val = temp;
	};
	const cycleInv = (a: StickerRef, b: StickerRef, c: StickerRef): void => { 
		const temp = a.val; a.val = b.val; b.val = c.val; c.val = temp;
	};
	const rot = (p1: StickerRef, p2: StickerRef, p3: StickerRef): void => (isPrime ? cycleInv(p1,p2,p3) : cycle(p1,p2,p3));
    
	const ref = (face: PyraFace, idx: number): StickerRef => ({
		get val(): string {
			return state[face][idx]; 
		},
		set val(v: string) {
			state[face][idx] = v; 
		}
	});

	// Moves defined by Corner rotation (Clockwise)

	// U Move (Top Corner): F(Up), L(Down), R(Down)
	if (base === 'U' || base === 'u') {
		rot(ref('F',0), ref('L',4), ref('R',0)); // Tips
		if (base === 'U') {
			rot(ref('F',1), ref('L',2), ref('R',5)); // Edges 1
			rot(ref('F',3), ref('L',7), ref('R',2)); // Edges 2
		}
	}

	// L Move (Left Corner): F, D, L
	// Cycle F -> D -> L -> F
	if (base === 'L' || base === 'l') {
		rot(ref('F',4), ref('D',0), ref('L',8)); // Tips
		if (base === 'L') {
			rot(ref('F',1), ref('D',2), ref('L',5)); // Edges 1
			rot(ref('F',6), ref('D',5), ref('L',7)); // Edges 2
		}
	}

	// R Move (Right Corner): F, R, D
	// Cycle F -> R -> D -> F
	if (base === 'R' || base === 'r') {
		rot(ref('F',8), ref('R',8), ref('D',4)); // Tips
		if (base === 'R') {
			rot(ref('F',3), ref('R',7), ref('D',2)); // Edges 1
			rot(ref('F',6), ref('R',5), ref('D',7)); // Edges 2
		}
	}

	// B Move (Back Corner): L, R, D
	// Cycle L -> R -> D -> L
	if (base === 'B' || base === 'b') {
		rot(ref('L',0), ref('D',8), ref('R',4)); // Tips (L TopL, D Bot, R TopR)
		if (base === 'B') {
			rot(ref('L',2), ref('D',5), ref('R',7)); // Edges 1
			rot(ref('L',5), ref('D',7), ref('R',2)); // Edges 2
		}
	}
};

export const PyraminxPuzzle: PuzzleInterface<PyraState> = {
	getInitialState: () => getInitialStatePyra(),
	applyMove: (state, move) => applyMovePyra(state, move)
};
