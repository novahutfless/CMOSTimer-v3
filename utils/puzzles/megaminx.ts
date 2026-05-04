import { PuzzleInterface } from './types';

export type MegaminxFace =
	| 'U' | 'F' | 'R' | 'BR' | 'BL' | 'L'
	| 'D' | 'DF' | 'DR' | 'DBR' | 'DBL' | 'DL';

export type MegaminxState = Record<MegaminxFace, string[]>;

const FACES: MegaminxFace[] = ['U', 'F', 'R', 'BR', 'BL', 'L', 'D', 'DF', 'DR', 'DBR', 'DBL', 'DL'];

const getInitialStateMegaminx = (): MegaminxState => ({
	U: Array(11).fill('U'),
	F: Array(11).fill('F'),
	R: Array(11).fill('R'),
	BR: Array(11).fill('B'),
	BL: Array(11).fill('face7'),
	L: Array(11).fill('L'),
	D: Array(11).fill('D'),
	DF: Array(11).fill('face8'),
	DR: Array(11).fill('face9'),
	DBR: Array(11).fill('face10'),
	DBL: Array(11).fill('face11'),
	DL: Array(11).fill('face12'),
});

const rotateFace = (stickers: string[], turns: number): string[] => {
	const normalized = ((turns % 5) + 5) % 5;
	if (normalized === 0) return [...stickers];

	const next = [...stickers];
	for (let i = 0; i < 5; i++) {
		next[1 + ((i + normalized) % 5)] = stickers[1 + i];
		next[6 + ((i + normalized) % 5)] = stickers[6 + i];
	}
	return next;
};

const cycleStickerGroups = (
	state: MegaminxState,
	groups: Array<{ face: MegaminxFace; indices: number[] }>,
	turns: number
): void => {
	const normalized = ((turns % groups.length) + groups.length) % groups.length;
	if (normalized === 0) return;

	const previous = groups.map(group => group.indices.map(index => state[group.face][index]));
	groups.forEach((group, idx) => {
		const source = previous[(idx - normalized + groups.length) % groups.length];
		group.indices.forEach((index, stickerIdx) => {
			state[group.face][index] = source[stickerIdx];
		});
	});
};

const rotateAllExcept = (state: MegaminxState, fixedFace: MegaminxFace, steps: number): void => {
	const faces = FACES.filter(face => face !== fixedFace);
	const stickers = faces.flatMap(face => state[face].map((color, index) => ({ color, face, index })));
	const normalized = ((steps % stickers.length) + stickers.length) % stickers.length;
	if (normalized === 0) return;

	const colors = stickers.map(sticker => sticker.color);
	stickers.forEach((target, idx) => {
		const sourceIdx = (idx - normalized + stickers.length) % stickers.length;
		state[target.face][target.index] = colors[sourceIdx];
	});
};

const applyUMove = (state: MegaminxState, turns: number): void => {
	state.U = rotateFace(state.U, turns);
	cycleStickerGroups(state, [
		{ face: 'F', indices: [1, 6, 2] },
		{ face: 'R', indices: [1, 6, 2] },
		{ face: 'BR', indices: [1, 6, 2] },
		{ face: 'BL', indices: [1, 6, 2] },
		{ face: 'L', indices: [1, 6, 2] },
	], turns);
};

const applyRMove = (state: MegaminxState, turns: number): void => {
	rotateAllExcept(state, 'L', turns * 17);
};

const applyDMove = (state: MegaminxState, turns: number): void => {
	rotateAllExcept(state, 'U', turns * 23);
};

const applyMoveMegaminx = (state: MegaminxState, move: string): void => {
	if (move === 'U') {
		applyUMove(state, 1);
		return;
	}
	if (move === "U'") {
		applyUMove(state, -1);
		return;
	}
	if (move === 'R++') {
		applyRMove(state, 2);
		return;
	}
	if (move === 'R--') {
		applyRMove(state, -2);
		return;
	}
	if (move === 'D++') {
		applyDMove(state, 2);
		return;
	}
	if (move === 'D--') {
		applyDMove(state, -2);
	}
};

export const MegaminxPuzzle: PuzzleInterface<MegaminxState> = {
	getInitialState: () => getInitialStateMegaminx(),
	applyMove: (state, move) => applyMoveMegaminx(state, move)
};
